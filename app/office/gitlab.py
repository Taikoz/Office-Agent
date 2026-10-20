"""GitLab, read-only, with the user's own personal token (scope read_api) entered in ChiefOS → Réglages.

The token stays on this machine (STATE_DIR/gitlab.json, 0600): it is never sent back to the page nor put in the save;
the server calls the GitLab API itself and returns only what the page shows (merge requests, failing pipelines with
the end of the failed job's log). Answers are cached 60 s.
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from .config import STATE_DIR

CONF_FILE = STATE_DIR / "gitlab.json"
TIMEOUT = 8
CACHE_S = 60
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07|section_(start|end):\d+:[\w.-]+\r?")
_cache: dict[str, tuple[float, Any]] = {}
_lock = threading.Lock()


class GitLabError(Exception):
    """A readable reason (French, shown in the page)."""


def normalize_url(url: str) -> str:
    """https://gitlab.example.com (no trailing slash, no /api/v4); http only for a local instance."""
    url = (url or "").strip().rstrip("/")
    url = re.sub(r"/api/v4$", "", url)
    parsed = urllib.parse.urlparse(url if "://" in url else f"https://{url}")
    if parsed.scheme not in ("https", "http") or not parsed.netloc or (parsed.scheme == "http" and parsed.hostname not in ("localhost", "127.0.0.1")):
        raise GitLabError("adresse invalide (https://… attendu)")
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"


def load() -> dict[str, Any]:
    try:
        data = json.loads(CONF_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) and data.get("url") and data.get("token") else {}
    except (OSError, ValueError):
        return {}


def save(url: str, token: str | None) -> dict[str, Any]:
    """Stores the address and the token (an empty token keeps the one saved), then checks them against /user."""
    old = load()
    url = normalize_url(url)
    token = (token or "").strip() or (old.get("token") if old.get("url") == url else "")
    if not token:
        raise GitLabError("jeton manquant")
    user = api({"url": url, "token": token}, "/user")
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = CONF_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps({"url": url, "token": token, "user": user.get("username", "")}), encoding="utf-8")
    os.chmod(tmp, 0o600)
    os.replace(tmp, CONF_FILE)
    with _lock:
        _cache.clear()
    return status()


def forget() -> dict[str, Any]:
    CONF_FILE.unlink(missing_ok=True)
    with _lock:
        _cache.clear()
    return status()


def status() -> dict[str, Any]:
    """What the page may know: the address and the user, never the token."""
    conf = load()
    return {"configured": bool(conf), "url": conf.get("url", ""), "user": conf.get("user", "")}


def api(conf: dict[str, Any], path: str, params: dict[str, Any] | None = None, raw: bool = False) -> Any:
    query = f"?{urllib.parse.urlencode(params, doseq=True)}" if params else ""
    req = urllib.request.Request(f"{conf['url']}/api/v4{path}{query}", headers={"PRIVATE-TOKEN": conf["token"], "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            body = r.read(400_000 if raw else 4_000_000)
    except urllib.error.HTTPError as err:
        raise GitLabError({401: "jeton refusé (expiré ou révoqué ?)", 403: "accès refusé (le jeton a-t-il le droit read_api ?)", 404: "introuvable"}.get(err.code, f"GitLab a répondu {err.code}")) from err
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        raise GitLabError(f"GitLab injoignable ({getattr(err, 'reason', err)})") from err
    if raw:
        return body.decode("utf-8", errors="replace")
    try:
        return json.loads(body)
    except ValueError as err:
        raise GitLabError("réponse illisible (est-ce bien une adresse GitLab ?)") from err


def cached(key: str, fn: Any) -> Any:
    with _lock:
        hit = _cache.get(key)
        if hit and time.time() - hit[0] < CACHE_S:
            return hit[1]
    value = fn()
    with _lock:
        _cache[key] = (time.time(), value)
    return value


def drop(key: str) -> None:
    """Forgets one cached answer (a refresh asked by the user)."""
    with _lock:
        _cache.pop(key, None)


def tail(log: str, lines: int = 40) -> str:
    """The end of a job log, without colours nor GitLab section markers."""
    text = ANSI.sub("", log).replace("\r\n", "\n")
    text = "\n".join(line.rsplit("\r", 1)[-1] for line in text.split("\n"))
    return "\n".join(text.strip("\n").split("\n")[-lines:])


def mr_summary(conf: dict[str, Any], mr: dict[str, Any]) -> dict[str, Any]:
    """One MR, with its last pipeline and its approvals (two more calls, made in parallel by the caller)."""
    pid, iid = mr["project_id"], mr["iid"]
    pipe, appr = None, None
    try:
        pipes = api(conf, f"/projects/{pid}/merge_requests/{iid}/pipelines", {"per_page": 1})
        pipe = pipes[0] if pipes else None
    except GitLabError:
        pass
    try:
        appr = api(conf, f"/projects/{pid}/merge_requests/{iid}/approvals")
    except GitLabError:
        pass
    return {"id": mr["id"], "iid": iid, "project": pid, "title": mr.get("title", ""), "url": mr.get("web_url", ""), "ref": (mr.get("references") or {}).get("full", f"!{iid}"),
            "branch": mr.get("source_branch", ""), "target": mr.get("target_branch", ""), "author": (mr.get("author") or {}).get("username", ""),
            "authorName": (mr.get("author") or {}).get("name", ""), "labels": mr.get("labels") or [], "state": mr.get("state", ""),
            "reviewers": [r.get("username", "") for r in mr.get("reviewers") or []], "draft": bool(mr.get("draft") or mr.get("work_in_progress")),
            "conflicts": bool(mr.get("has_conflicts")), "status": mr.get("detailed_merge_status") or mr.get("merge_status", ""),
            "threadsOk": mr.get("blocking_discussions_resolved", True), "notes": mr.get("user_notes_count", 0), "created": mr.get("created_at", ""), "updated": mr.get("updated_at", ""),
            "ci": pipe.get("status") if pipe else None, "ciUrl": pipe.get("web_url") if pipe else None,
            "approved": len((appr or {}).get("approved_by") or []), "approvalsLeft": (appr or {}).get("approvals_left")}


def my_mrs() -> dict[str, Any]:
    """Open MRs to review, mine, assigned to me: CI, approvals, unresolved threads, conflicts."""
    conf = load()
    if not conf:
        return {"configured": False}

    def fetch() -> dict[str, Any]:
        user = conf.get("user") or api(conf, "/user").get("username", "")
        base = {"state": "opened", "per_page": 20, "order_by": "updated_at"}
        lists = {"review": api(conf, "/merge_requests", {**base, "scope": "all", "reviewer_username": user}),
                 "mine": api(conf, "/merge_requests", {**base, "scope": "created_by_me"}),
                 "assigned": api(conf, "/merge_requests", {**base, "scope": "assigned_to_me"})}
        uniq = {mr["id"]: mr for items in lists.values() for mr in items}
        with ThreadPoolExecutor(max_workers=6) as pool:
            details = dict(zip(uniq, pool.map(lambda mr: mr_summary(conf, mr), uniq.values())))
        seen: set[int] = set()
        out: dict[str, Any] = {"configured": True, "user": user, "url": conf["url"]}
        for key in ("review", "mine", "assigned"):  # each MR once, in the first list it belongs to
            out[key] = [details[mr["id"]] for mr in lists[key] if mr["id"] not in seen and not seen.add(mr["id"])]
        return out
    return cached("mrs", fetch)


def failing_pipelines() -> dict[str, Any]:
    """Red pipelines: the default branch of my recently active projects and my open MRs, with the failed job's log tail."""
    conf = load()
    if not conf:
        return {"configured": False}

    def fetch() -> dict[str, Any]:
        projects = api(conf, "/projects", {"membership": "true", "order_by": "last_activity_at", "per_page": 12, "archived": "false", "simple": "true"})
        targets = [(p["id"], p.get("path_with_namespace", ""), p.get("default_branch") or "main", None) for p in projects]
        mrs = my_mrs()
        for mr in mrs.get("mine", []) + mrs.get("assigned", []):
            if mr["ci"] == "failed":
                targets.append((mr["project"], mr["ref"].split("!")[0], mr["branch"], mr))

        def check(t: tuple[Any, ...]) -> dict[str, Any] | None:
            pid, name, ref, mr = t
            try:
                pipes = api(conf, f"/projects/{pid}/pipelines", {"ref": ref, "per_page": 1})
                if not pipes or pipes[0].get("status") != "failed":
                    return None
                pipe = pipes[0]
                jobs = api(conf, f"/projects/{pid}/pipelines/{pipe['id']}/jobs", {"scope[]": "failed", "per_page": 5})
                job = jobs[0] if jobs else None
                log = tail(api(conf, f"/projects/{pid}/jobs/{job['id']}/trace", raw=True)) if job else ""
            except GitLabError:
                return None
            return {"project": name, "projectId": pid, "ref": ref, "pipeline": pipe["id"], "url": pipe.get("web_url", ""), "updated": pipe.get("updated_at", ""),
                    "job": job.get("name") if job else "", "stage": job.get("stage") if job else "", "jobUrl": job.get("web_url") if job else "",
                    "log": log, "mr": {"ref": mr["ref"], "url": mr["url"], "title": mr["title"]} if mr else None}
        with ThreadPoolExecutor(max_workers=6) as pool:
            found = [x for x in pool.map(check, targets) if x]
        return {"configured": True, "url": conf["url"], "pipelines": sorted(found, key=lambda x: x["updated"], reverse=True)[:15]}
    return cached("pipes", fetch)


def safe(fn: Any) -> tuple[int, dict[str, Any]]:
    """(HTTP code, body) for the routes: a GitLab problem is a readable message, not a crash."""
    try:
        return 200, fn()
    except GitLabError as err:
        return 502, {"error": str(err)}


def _person(p: dict[str, Any] | None) -> dict[str, str]:
    p = p or {}
    return {"name": p.get("name", ""), "username": p.get("username", "")}


def mr_detail(project: int, iid: int) -> dict[str, Any]:
    """Everything the MR page shows: description, merge checks, approvals, discussions, pipeline with its jobs, changed files."""
    conf = load()
    if not conf:
        return {"configured": False}

    def fetch() -> dict[str, Any]:
        mr = api(conf, f"/projects/{project}/merge_requests/{iid}")
        calls = {
            "approvals": lambda: api(conf, f"/projects/{project}/merge_requests/{iid}/approvals"),
            "discussions": lambda: api(conf, f"/projects/{project}/merge_requests/{iid}/discussions", {"per_page": 100}),
            "pipelines": lambda: api(conf, f"/projects/{project}/merge_requests/{iid}/pipelines", {"per_page": 5}),
            "diffs": lambda: api(conf, f"/projects/{project}/merge_requests/{iid}/diffs", {"per_page": 60}),
        }

        def run(item: tuple[str, Any]) -> tuple[str, Any]:
            try:
                return item[0], item[1]()
            except GitLabError:
                return item[0], None
        with ThreadPoolExecutor(max_workers=4) as pool:
            got = dict(pool.map(run, calls.items()))
        if got["diffs"] is None:  # GitLab < 15.7: the older /changes endpoint
            try:
                got["diffs"] = api(conf, f"/projects/{project}/merge_requests/{iid}/changes").get("changes", [])
            except GitLabError:
                got["diffs"] = []
        pipe, jobs = (got["pipelines"] or [None])[0], []
        if pipe:
            try:
                jobs = api(conf, f"/projects/{project}/pipelines/{pipe['id']}/jobs", {"per_page": 100, "include_retried": "false"})
            except GitLabError:
                jobs = []
        appr = got["approvals"] or {}
        threads = []
        for d in got["discussions"] or []:
            notes = [n for n in d.get("notes") or []]
            if not notes:
                continue
            first = notes[0]
            pos = first.get("position") or {}
            threads.append({"id": d.get("id"), "system": all(n.get("system") for n in notes), "resolvable": bool(first.get("resolvable")),
                            "resolved": bool(first.get("resolvable")) and all(n.get("resolved") for n in notes if n.get("resolvable")),
                            "file": pos.get("new_path") or pos.get("old_path") or "", "line": pos.get("new_line") or pos.get("old_line"),
                            "notes": [{"author": _person(n.get("author")), "body": (n.get("body") or "")[:4000], "created": n.get("created_at", ""), "system": bool(n.get("system"))} for n in notes]})
        files, budget = [], 300_000
        for f in got["diffs"] or []:
            diff = f.get("diff") or ""
            adds = sum(1 for line in diff.split("\n") if line.startswith("+") and not line.startswith("+++"))
            dels = sum(1 for line in diff.split("\n") if line.startswith("-") and not line.startswith("---"))
            keep = diff[:min(len(diff), 20_000, max(0, budget))]
            budget -= len(keep)
            files.append({"path": f.get("new_path") or f.get("old_path") or "", "old": f.get("old_path", ""), "new": bool(f.get("new_file")), "deleted": bool(f.get("deleted_file")),
                          "renamed": bool(f.get("renamed_file")), "adds": adds, "dels": dels, "diff": keep, "truncated": len(keep) < len(diff)})
        return {"configured": True, "url": conf["url"], "project": project, "iid": iid,
                "title": mr.get("title", ""), "description": (mr.get("description") or "")[:12000], "state": mr.get("state", ""), "draft": bool(mr.get("draft") or mr.get("work_in_progress")),
                "webUrl": mr.get("web_url", ""), "ref": (mr.get("references") or {}).get("full", f"!{iid}"), "source": mr.get("source_branch", ""), "target": mr.get("target_branch", ""),
                "author": _person(mr.get("author")), "assignees": [_person(a) for a in mr.get("assignees") or []], "reviewers": [_person(r) for r in mr.get("reviewers") or []],
                "labels": mr.get("labels") or [], "created": mr.get("created_at", ""), "updated": mr.get("updated_at", ""), "merged": mr.get("merged_at"),
                "conflicts": bool(mr.get("has_conflicts")), "mergeStatus": mr.get("detailed_merge_status") or mr.get("merge_status", ""),
                "threadsOk": mr.get("blocking_discussions_resolved", True), "upvotes": mr.get("upvotes", 0), "changes": mr.get("changes_count"),
                "approvals": {"required": appr.get("approvals_required"), "left": appr.get("approvals_left"), "by": [_person(a.get("user")) for a in appr.get("approved_by") or []]},
                "pipeline": {"id": pipe["id"], "status": pipe.get("status"), "url": pipe.get("web_url", ""), "ref": pipe.get("ref", ""), "sha": (pipe.get("sha") or "")[:8], "updated": pipe.get("updated_at", "")} if pipe else None,
                "jobs": [{"id": j["id"], "name": j.get("name", ""), "stage": j.get("stage", ""), "status": j.get("status", ""), "duration": j.get("duration"), "url": j.get("web_url", ""),
                          "allowFailure": bool(j.get("allow_failure"))} for j in jobs],
                "threads": threads, "files": files}
    return cached(f"mr:{project}:{iid}", fetch)


def job_log(project: int, job: int) -> dict[str, Any]:
    """The end of one job's log (120 lines), for the pipeline tab."""
    conf = load()
    if not conf:
        return {"configured": False}
    return cached(f"job:{project}:{job}", lambda: {"configured": True, "log": tail(api(conf, f"/projects/{project}/jobs/{job}/trace", raw=True), 120)})
