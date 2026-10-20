"""ChiefOS → 🚚 Livraisons: where each merged MR is, from the merge to production (read-only, GitLab API).

    MR merged → tagged (the first release tag holding its commit; that tag's pipeline builds the image) → deployed per env

The deployment repo (config "deploy_repo": a GitLab project path, e.g. a GitOps repo of Helm values) is read in one
archive of its "deploy_path" folder. Each values file <deploy_path>/<app>/<env>/*.yaml whose image block has a
repository (or name) and a tag gives the version of that app in that env. The GitLab project that builds the image is
"deploy_projects"[app] when set, else the image path cut from its end until a project exists; the image tag is a git tag
of that project. A merged MR is deployed in an env when the tag of the env holds its merge commit
(/repository/commits/:sha/refs?type=tag). Nothing is ever written: no deploy, no ticket change.

Before a release to prod, three checks: the risks of each MR not in prod yet (a migration, dependencies, config or
build files, environment variables read by new code: from its diff), the commits between the tag in prod and the tag
of each other env (/repository/compare), and the settings of an env's values file that prod's file lacks (a new
variable or secret to add to prod). Merged MRs and tags do not change: their diffs and comparisons are kept for good.
"""

from __future__ import annotations

import io
import re
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Any

from . import gitlab
from .config import CFG, TICKET_RE

PROJECT_S = 3600       # image path → GitLab project (found or not)
ARCHIVE_MAX = 40_000_000
KINDS = ("dev", "stg", "prd")
KIND_RE = [("prd", re.compile(r"pro?d|production|live", re.I)), ("stg", re.compile(r"stg|stag|preprod|uat|qa|recette", re.I)),
           ("dev", re.compile(r"dev|test|sandbox|int", re.I))]
LINE_RE = re.compile(r"^(\s*)(repository|name|tag|image)\s*:\s*[\"']?([^\"'\s#]*)")
DONE_RE = re.compile(r"verif|done|fixed|closed|termin|résolu|resolu", re.I)
_projects: dict[str, tuple[float, dict[str, Any] | None]] = {}
_risks: dict[tuple[int, int], list[dict[str, Any]]] = {}      # (project, MR iid) → risks (a merged MR does not change)
_compares: dict[tuple[int, str, str], dict[str, Any]] = {}     # (project, from tag, to tag) → commits
RISKS = [  # (kind, label, pattern on a changed file's path)
    ("migration", "Migration de base", re.compile(r"(^|/)(migrations?|alembic|flyway|liquibase|changelogs?)/|(^|/)versions/[^/]+\.py$|\.sql$", re.I)),
    ("deps", "Dépendances", re.compile(r"(^|/)(pyproject\.toml|poetry\.lock|uv\.lock|requirements[^/]*\.txt|Pipfile(\.lock)?|package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|go\.(mod|sum)|Cargo\.(toml|lock)|Gemfile(\.lock)?)$")),
    ("config", "Config / build", re.compile(r"(^|/)(\.env[^/]*|settings[^/]*\.py|config[^/]*\.(py|ya?ml|json|toml)|Dockerfile[^/]*|docker-compose[^/]*\.ya?ml|\.gitlab-ci\.yml)$|^(helm|charts?)/", re.I)),
]
ENV_RE = re.compile(r"""os\.environ(?:\.get)?\(\s*["'](\w+)|os\.environ\[\s*["'](\w+)|getenv\(\s*["'](\w+)|import\.meta\.env\.(\w+)|process\.env\.(\w+)""")
SKIP_KEYS = re.compile(r"(^|\.)(image|tag|chartVersion|replicaCount|resources|autoscaling)(\.|$)")


def env_kind(env: str) -> str:
    """dev, stg or prd from the env folder's name (core-stg, core-prd-eu-west1…); '' when it says nothing."""
    for kind, pat in KIND_RE:
        if pat.search(env):
            return kind
    return ""


def env_rank(env: str) -> int:
    kind = env_kind(env)
    return KINDS.index(kind) if kind in KINDS else -1


def images(text: str) -> list[tuple[str, str]]:
    """(image path, tag) of each image block of a values file: `repository:`/`name:` and `tag:` side by side, or
    `image: path:tag`. Line-based on purpose (no YAML library), enough for Helm values."""
    out: list[tuple[str, str]] = []
    blocks: dict[int, dict[str, str]] = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        m = LINE_RE.match(line)
        indent = len(line) - len(line.lstrip())
        for deeper in [i for i in blocks if i > indent]:
            del blocks[deeper]
        if not m:
            continue
        key, value = m.group(2), m.group(3)
        if key == "image":
            if value and ":" in value.rsplit("/", 1)[-1]:
                path, tag = value.rsplit(":", 1)
                out.append((path, tag))
            continue
        if not value:
            continue
        block = blocks.setdefault(indent, {})
        block["path" if key in ("repository", "name") else "tag"] = value
        if "path" in block and "tag" in block and "/" in block["path"]:
            out.append((block.pop("path"), block.pop("tag")))
    return out


def project_candidates(image: str) -> list[str]:
    """GitLab paths to try for an image path: without a registry host, then cut from the end (the image name, a
    Python-version suffix…), keeping at least two segments."""
    parts = [p for p in image.split("/") if p]
    if parts and "." in parts[0]:
        parts = parts[1:]
    return ["/".join(parts[:n]) for n in range(len(parts), 1, -1)]


def find_project(conf: dict[str, Any], paths: list[str]) -> dict[str, Any] | None:
    for path in paths:
        hit = _projects.get(path)
        if hit and time.time() - hit[0] < PROJECT_S:
            if hit[1]:
                return hit[1]
            continue
        try:
            p = gitlab.api(conf, f"/projects/{urllib.parse.quote(path, safe='')}")
            found = {"id": p["id"], "path": p.get("path_with_namespace", path), "url": p.get("web_url", ""), "branch": p.get("default_branch") or "main"}
        except gitlab.GitLabError:
            found = None
        _projects[path] = (time.time(), found)
        if found:
            return found
    return None


def read_archive(conf: dict[str, Any], project: int, ref: str, folder: str) -> dict[str, str]:
    """{path inside the repo: text} of the .yaml files under `folder`, from one tar.gz of the repo."""
    query = urllib.parse.urlencode({"sha": ref, "path": folder})
    req = urllib.request.Request(f"{conf['url']}/api/v4/projects/{project}/repository/archive.tar.gz?{query}", headers={"PRIVATE-TOKEN": conf["token"]})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read(ARCHIVE_MAX)
    except urllib.error.HTTPError as err:
        raise gitlab.GitLabError(f"dépôt de déploiement : GitLab a répondu {err.code}") from err
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        raise gitlab.GitLabError(f"GitLab injoignable ({getattr(err, 'reason', err)})") from err
    files: dict[str, str] = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        for member in tar.getmembers():
            if member.isfile() and member.name.endswith((".yaml", ".yml")) and member.size < 1_000_000:
                inner = member.name.split("/", 1)[1] if "/" in member.name else member.name  # drop the archive's top folder
                fh = tar.extractfile(member)
                if fh:
                    files[inner] = fh.read().decode("utf-8", errors="replace")
    return files


def deployed(conf: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """The deployment repo and the services it deploys: one per GitLab project, with the tag of each env."""
    repo_path, folder = str(CFG["deploy_repo"]), str(CFG["deploy_path"] or "applications").strip("/")
    repo = find_project(conf, [repo_path])
    if not repo:
        raise gitlab.GitLabError(f"dépôt de déploiement introuvable : {repo_path}")
    ref = CFG["deploy_ref"] or repo["branch"]
    files = read_archive(conf, repo["id"], ref, folder)
    overrides = {str(k): str(v) for k, v in (CFG["deploy_projects"] or {}).items()}
    found: dict[tuple[str, str], tuple[list[tuple[str, str]], str]] = {}  # (app, env) → images, file
    for path, text in files.items():
        parts = path.split("/")
        if len(parts) != len(folder.split("/")) + 3:  # <folder>/<app>/<env>/<file>.yaml
            continue
        app, env = parts[-3], parts[-2]
        imgs = images(text)
        if imgs and (app, env) not in found:
            found[(app, env)] = (imgs, path)
    apps: dict[str, list[tuple[str, str]]] = {}
    for (app, _env), (imgs, _path) in found.items():
        apps.setdefault(app, []).extend(imgs)

    def resolve(app: str) -> tuple[str, dict[str, Any] | None]:
        if app in overrides:
            return app, find_project(conf, [overrides[app]])
        for image, _tag in dict.fromkeys(apps[app]):
            p = find_project(conf, project_candidates(image))
            if p:
                return app, p
        return app, None
    with ThreadPoolExecutor(max_workers=6) as pool:
        projects = dict(pool.map(resolve, apps))
    services: dict[int, dict[str, Any]] = {}
    for (app, env), (imgs, path) in sorted(found.items()):
        proj = projects.get(app)
        if not proj:
            continue
        svc = services.setdefault(proj["id"], {"project": proj, "apps": [], "envs": {}})
        if app not in svc["apps"]:
            svc["apps"].append(app)
        main = app == proj["path"].rsplit("/", 1)[-1] or not svc["envs"].get(env)  # the app named like the project wins
        if main:
            svc["envs"][env] = {"tag": imgs[0][1], "file": path, "url": f"{repo['url']}/-/blob/{ref}/{path}", "text": files[path]}
    for svc in services.values():
        svc["apps"].sort(key=lambda a: a != svc["project"]["path"].rsplit("/", 1)[-1])
    return {**repo, "ref": ref}, list(services.values())


def yaml_keys(text: str) -> set[str]:
    """The paths of the leaf settings of a values file (a.b.c), from the indentation; list items count as their key."""
    out: set[str] = set()
    stack: list[tuple[int, str]] = []
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        body = line.lstrip()
        indent = len(line) - len(body)
        if body.startswith("- "):
            body, indent = body[2:], indent + 2
        m = re.match(r"([\w.\-/]+)\s*:(.*)$", body)
        if not m:
            continue
        while stack and stack[-1][0] >= indent:
            stack.pop()
        path = ".".join([k for _, k in stack] + [m.group(1)])
        if m.group(2).strip() and not m.group(2).strip().startswith(("|", ">")):
            out.add(path)
        else:
            stack.append((indent, m.group(1)))
    return out


def config_gaps(envs: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    """The settings of an env's values file that prod's file lacks (a variable, a secret, a feature to add in prod)."""
    prd = next((e for e in envs if env_kind(e) == "prd"), None)
    if not prd:
        return []
    have = yaml_keys(envs[prd].get("text", ""))
    gaps = []
    for env in sorted(envs, key=env_rank, reverse=True):
        if env == prd:
            continue
        missing = sorted(k for k in yaml_keys(envs[env].get("text", "")) - have if not SKIP_KEYS.search(k))
        if missing:
            gaps.append({"env": env, "keys": missing[:40], "more": max(0, len(missing) - 40)})
    return gaps


def mr_risks(conf: dict[str, Any], project: int, iid: int) -> list[dict[str, Any]]:
    """What deserves a look before prod in one MR's diff: migrations, dependencies, config or build files, and the
    environment variables its new lines read."""
    key = (project, iid)
    if key in _risks:
        return _risks[key]
    try:
        diffs = gitlab.api(conf, f"/projects/{project}/merge_requests/{iid}/diffs", {"per_page": 100})
    except gitlab.GitLabError:
        try:
            diffs = gitlab.api(conf, f"/projects/{project}/merge_requests/{iid}/changes").get("changes", [])
        except gitlab.GitLabError:
            return []  # not kept: tried again next time
    risks: dict[str, dict[str, Any]] = {}
    env_vars: set[str] = set()
    for d in diffs:
        path = d.get("new_path") or d.get("old_path") or ""
        for kind, label, pat in RISKS:
            if pat.search(path):
                risks.setdefault(kind, {"kind": kind, "label": label, "items": []})["items"].append(path)
                break
        for line in (d.get("diff") or "").splitlines():
            if line.startswith("+") and not line.startswith("+++"):
                for m in ENV_RE.finditer(line):
                    env_vars.add(next(g for g in m.groups() if g))
    if env_vars:
        risks["env"] = {"kind": "env", "label": "Variables d'environnement", "items": sorted(env_vars)}
    out = [risks[k] for k in ("migration", "env", "config", "deps") if k in risks]
    _risks[key] = out
    return out


def compare(conf: dict[str, Any], project: dict[str, Any], frm: str, to: str) -> dict[str, Any]:
    """The commits between two tags of a project (what deploying `to` over `frm` adds), merges left out."""
    key = (project["id"], frm, to)
    if key in _compares:
        return _compares[key]
    url = f"{project['url']}/-/compare/{urllib.parse.quote(frm)}...{urllib.parse.quote(to)}"
    try:
        got = gitlab.api(conf, f"/projects/{project['id']}/repository/compare", {"from": frm, "to": to})
    except gitlab.GitLabError as err:
        return {"from": frm, "to": to, "url": url, "error": str(err), "commits": [], "total": 0}
    commits = [c for c in got.get("commits") or [] if len(c.get("parent_ids") or []) < 2]
    commits.reverse()  # the newest first
    out = {"from": frm, "to": to, "url": url, "total": len(commits),
           "commits": [{"sha": (c.get("id") or "")[:8], "title": c.get("title", ""), "author": c.get("author_name", ""), "date": c.get("committed_date") or c.get("created_at") or "",
                        "url": c.get("web_url", "")} for c in commits[:60]]}
    _compares[key] = out
    return out


def _since(iso: str | None) -> float:
    try:
        return datetime.fromisoformat(str(iso).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def deliveries(tickets: Any = None, force: bool = False) -> dict[str, Any]:
    """Merged MRs of the last `deliveries_days` of every deployed project, with their tag, image and envs."""
    conf = gitlab.load()
    if not conf:
        return {"configured": False}
    if not CFG["deploy_repo"]:
        return {"configured": True, "repo": None}
    if force:
        gitlab.drop("deliveries")
    data = gitlab.cached("deliveries", lambda: _fetch(conf))
    ids = {i["ticket"] for i in data["items"] if i["ticket"]}
    states = tickets.get(ids) if tickets is not None and ids else {}
    items = []
    for it in data["items"]:
        state = (states.get(it["ticket"]) or {}).get("state") if it["ticket"] else None
        alerts = list(it["alerts"])
        if state and DONE_RE.search(state) and not any(it["envs"].values()):
            alerts.append(f"ticket « {state} » mais déployé nulle part")
        items.append({**it, "ticketState": state, "alerts": alerts})
    return {**data, "items": items}


def _fetch(conf: dict[str, Any]) -> dict[str, Any]:
    repo, services = deployed(conf)
    user = conf.get("user") or gitlab.api(conf, "/user").get("username", "")
    days = max(1, min(60, int(CFG["deliveries_days"] or 14)))
    after = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    now = time.time()

    def merged(svc: dict[str, Any]) -> list[tuple[dict[str, Any], dict[str, Any]]]:
        p = svc["project"]
        try:
            mrs = gitlab.api(conf, f"/projects/{p['id']}/merge_requests", {"state": "merged", "target_branch": p["branch"], "updated_after": after, "per_page": 100, "order_by": "updated_at"})
        except gitlab.GitLabError:
            return []
        return [(svc, mr) for mr in mrs if _since(mr.get("merged_at")) >= now - days * 86400]

    def file_date(item: tuple[dict[str, Any], str]) -> tuple[int, str, str]:
        svc, env = item
        try:
            commits = gitlab.api(conf, f"/projects/{repo['id']}/repository/commits", {"path": svc["envs"][env]["file"], "ref_name": repo["ref"], "per_page": 1})
            return svc["project"]["id"], env, (commits[0].get("committed_date") or "") if commits else ""
        except gitlab.GitLabError:
            return svc["project"]["id"], env, ""

    with ThreadPoolExecutor(max_workers=6) as pool:
        pairs = [x for found in pool.map(merged, services) for x in found]
        dates = list(pool.map(file_date, [(s, e) for s in services for e in s["envs"]]))
    for pid, env, date in dates:
        for svc in services:
            if svc["project"]["id"] == pid:
                svc["envs"][env]["since"] = date

    def tags_of(pair: tuple[dict[str, Any], dict[str, Any]]) -> list[str] | None:
        svc, mr = pair
        sha = mr.get("merge_commit_sha") or mr.get("squash_commit_sha") or mr.get("sha")
        if not sha:
            return None
        try:
            return [r.get("name", "") for r in gitlab.api(conf, f"/projects/{svc['project']['id']}/repository/commits/{sha}/refs", {"type": "tag", "per_page": 100})]
        except gitlab.GitLabError:
            return None

    with ThreadPoolExecutor(max_workers=6) as pool:
        all_tags = list(pool.map(tags_of, pairs))
    # the release of each MR: the oldest tag holding its commit (GitLab lists the tags by name; the deployment
    # repo's tags of that project, when one holds it, tell the order better: the lowest env first)
    firsts: dict[tuple[int, str], str | None] = {}

    def first_tag(tags: list[str]) -> str | None:
        return min(tags, key=version_key) if tags else None
    for (svc, _mr), tags in zip(pairs, all_tags):
        if tags:
            firsts.setdefault((svc["project"]["id"], first_tag(tags) or ""), None)

    def pipeline(key: tuple[int, str]) -> tuple[tuple[int, str], dict[str, Any] | None]:
        pid, tag = key
        try:
            pipes = gitlab.api(conf, f"/projects/{pid}/pipelines", {"ref": tag, "per_page": 1})
            return key, ({"status": pipes[0].get("status"), "url": pipes[0].get("web_url", "")} if pipes else None)
        except gitlab.GitLabError:
            return key, None
    with ThreadPoolExecutor(max_workers=6) as pool:
        pipes = dict(pool.map(pipeline, firsts))

    items = []
    for (svc, mr), tags in zip(pairs, all_tags):
        p, envs = svc["project"], svc["envs"]
        text = f"{mr.get('title', '')} {mr.get('source_branch', '')}"
        ticket = TICKET_RE.search(text.upper())
        tag = first_tag(tags or [])
        many = tags is not None and len(tags) >= 100  # an old commit in more tags than listed: compare versions
        state = {env: (None if tags is None else (e["tag"] in tags or (many and version_key(e["tag"]) >= version_key(tag or "")))) for env, e in envs.items()}
        merged_at = _since(mr.get("merged_at"))
        age = (now - merged_at) / 86400
        pipe = pipes.get((p["id"], tag or "")) if tag else None
        reached = [env for env, ok in state.items() if ok]
        stage = max(reached, key=env_rank) if reached else ("tagged" if tag else "merged")
        alerts = []
        if tags is not None and not tag and age > 2:
            alerts.append(f"mergée il y a {int(age)} j, toujours pas dans une release")
        if pipe and pipe["status"] == "failed":
            alerts.append(f"le pipeline de la release {tag} a échoué")
        kinds = {env_kind(env): env for env in envs}
        if tags is not None and "stg" in kinds and not state[kinds["stg"]] and not ("prd" in kinds and state[kinds["prd"]]) and age > 3:
            alerts.append(f"mergée il y a {int(age)} j, pas encore en staging")
        if "stg" in kinds and "prd" in kinds and state[kinds["stg"]] and not state[kinds["prd"]] and age > 7:
            alerts.append(f"en staging, pas en prod après {int(age)} j")
        author = mr.get("author") or {}
        items.append({"projectId": p["id"], "iid": mr.get("iid"), "ticket": ticket.group(1) if ticket else None, "title": mr.get("title", ""), "url": mr.get("web_url", ""),
                      "ref": (mr.get("references") or {}).get("full", f"!{mr.get('iid')}"), "author": author.get("username", ""), "authorName": author.get("name", ""),
                      "mine": author.get("username") == user or any(a.get("username") == user for a in mr.get("assignees") or []),
                      "merged": mr.get("merged_at"), "project": p["path"], "service": svc["apps"][0], "tag": tag,
                      "tagUrl": f"{p['url']}/-/tags/{urllib.parse.quote(tag)}" if tag else None, "image": pipe, "envs": state, "stage": stage, "alerts": alerts})
    items.sort(key=lambda i: i["merged"] or "", reverse=True)

    # before prod: the risks of each MR not in prod yet, the commits from prod's tag to the other envs' tags
    def not_in_prod(i: dict[str, Any]) -> bool:
        return any(ok is False for env, ok in i["envs"].items() if env_kind(env) == "prd") or not any(env_kind(e) == "prd" for e in i["envs"])
    pending = [i for i in items if not_in_prod(i) and i["iid"]]
    pairs_cmp = []
    for svc in services:
        prd = next((e for e in svc["envs"] if env_kind(e) == "prd"), None)
        for env, e in svc["envs"].items():
            if prd and env != prd and e["tag"] != svc["envs"][prd]["tag"]:
                pairs_cmp.append((svc, env, svc["envs"][prd]["tag"], e["tag"]))
    with ThreadPoolExecutor(max_workers=6) as pool:
        risks = list(pool.map(lambda i: mr_risks(conf, i["projectId"], i["iid"]), pending))
        cmps = list(pool.map(lambda x: compare(conf, x[0]["project"], x[2], x[3]), pairs_cmp))
    for i, r in zip(pending, risks):
        i["risks"] = r
    for i in items:
        i.setdefault("risks", [])
    for (svc, env, _f, _t), c in zip(pairs_cmp, cmps):
        svc.setdefault("diffs", {})[env] = c
    envs = sorted({env for s in services for env in s["envs"]}, key=lambda e: (env_rank(e), e))
    return {"configured": True, "url": conf["url"], "user": user, "days": days, "updated": now,
            "repo": {"path": repo["path"], "url": repo["url"], "ref": repo["ref"]},
            "envs": [{"name": e, "kind": env_kind(e)} for e in envs],
            "services": [{"service": s["apps"][0], "apps": s["apps"], "project": s["project"]["path"], "projectUrl": s["project"]["url"],
                          "envs": {env: {k: v for k, v in e.items() if k != "text"} for env, e in s["envs"].items()},
                          "diffs": s.get("diffs", {}), "configGaps": config_gaps(s["envs"])}
                         for s in sorted(services, key=lambda s: s["apps"][0])],
            "items": items}


def version_key(tag: str) -> tuple[Any, ...]:
    """Orders release tags: 2026.10.14.1 < 2026.10.16.0, 0.0.70.dev1 < 0.0.70 (a pre-release before its release)."""
    parts = re.findall(r"\d+|[a-z]+", tag.lower())
    key: list[Any] = []
    for p in parts:
        key.append((1, int(p), "") if p.isdigit() else (0, 0, p))
    key.append((0, 0, "~") if not re.search(r"[a-z]", tag.lower()) else (-1, 0, ""))  # a final release after its pre-releases
    return tuple(key)
