"""ChiefOS → 🗺️ Compétences: who knows what, from the real work of the last DAYS (read-only, local).

Each agent run gets its topics: the project and the code zone it edited (from the files' paths), the technologies (from
the files' extensions and folders) and the tools it used (from its shell commands). Its outcome scores them: delivered,
tests green, an MR (+); blocked, many errors, a red CI on its MR, going round in circles (−). The validated lessons of a
project count too (lessons.py). The page gets the matrix specialty × topic with the evidence of each cell, and every run
(id, topics, outcome) so that it can credit the office's named devs with the missions they did (kept in the browser).
"""

from __future__ import annotations

import re
import threading
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from .config import EXCLUDED, PROJECTS

DAYS = 30
TTL = 600
TOP_TOPICS = 24
CATS = {"proj": "Projets", "zone": "Zones de code", "tech": "Technos", "tool": "Outils"}
GENERIC_DIRS = {"src", "app", "apps", "lib", "libs", "web", "js", "ts", "components", "features", "feature", "modules", "pkg", "internal",
                "core", "common", "shared", "utils", "main", "java", "python", "packages", "static", "public", "frontend", "backend", "server", "client"}
TECH_EXT = {".tsx": "React", ".jsx": "React", ".ts": "TypeScript", ".js": "JavaScript", ".py": "Python", ".go": "Go", ".rs": "Rust",
            ".css": "CSS", ".scss": "CSS", ".html": "HTML", ".sql": "SQL", ".md": "Docs", ".sh": "Shell", ".tf": "Terraform"}
TECH_PATH = [(re.compile(r"(^|/)(tests?|__tests__|e2e|spec)(/|$)|\.(test|spec)\.\w+$|(^|/)test_\w+\.py$"), "Tests"),
             (re.compile(r"(^|/)(migrations?|alembic)(/|$)"), "Migrations"), (re.compile(r"\.gitlab-ci|(^|/)\.github/workflows/"), "CI"),
             (re.compile(r"(^|/)Dockerfile|docker-compose"), "Docker"), (re.compile(r"(^|/)(k8s|helm|charts|deployments?)(/|$)"), "Kubernetes"),
             (re.compile(r"(^|/)(auth|security|rbac|permissions?)(/|$)"), "Auth / sécurité"), (re.compile(r"(^|/)\.claude/(agents|skills)/"), "Agents Claude")]
TOOLS = {"gl.py": "GitLab", "glab": "GitLab", "yt.py": "YouTrack", "playwright": "Playwright", "pytest": "Pytest", "vitest": "Vitest / Jest",
         "jest": "Vitest / Jest", "kubectl": "Kubernetes", "helm": "Kubernetes", "docker": "Docker", "docker-compose": "Docker", "alembic": "Migrations",
         "mmx.py": "MMX", "eslint": "Lint / types", "prettier": "Lint / types", "tsc": "Lint / types", "ruff": "Lint Python", "mypy": "Lint Python",
         "black": "Lint Python"}  # the program a command really runs (insights.command_tokens) → tool
REPO_IN_CMD = re.compile(r"(?:~|/home/[^/\s]+)/(?:repos|projects|src|code)/([\w.-]+)")

_lock = threading.Lock()
_cache: dict[str, Any] = {"at": 0.0, "data": None}


def repo_of(path: str) -> tuple[str, list[str]] | None:
    """(repository, path parts inside it) of an edited file: the folder under ~/repos (or ~/projects, ~/src, ~/code)."""
    parts = Path(path).parts
    home = Path.home().parts
    if tuple(parts[:len(home)]) != home or len(parts) < len(home) + 3:
        return None
    rest = parts[len(home):]
    if rest[0] in ("repos", "projects", "src", "code", "dev", "workspace", "git"):
        rest = rest[1:]
    return (rest[0], list(rest[1:])) if len(rest) >= 2 else None


def topics_of(files: list[str], commands: list[str], fallback_project: str = "") -> dict[str, float]:
    """Topic → weight (0..1) for one run: its project and zone by share of the files edited (else the repositories its
    commands work in), technologies by share, the tools its commands run (1 each)."""
    from .insights import command_tokens
    out: dict[str, float] = defaultdict(float)
    n = len(files)
    projects: Counter[str] = Counter()
    for f in files:
        r = repo_of(f)
        rel = "/".join(r[1]) if r else f
        if r:
            projects[r[0]] += 1
            dirs = [d for d in r[1][:-1] if d.lower() not in GENERIC_DIRS and not d.startswith(".") or d in (".claude", ".gitlab")]
            if dirs:
                out[f"zone:{r[0]}/{dirs[0]}"] += 1 / n
        ext = Path(f).suffix.lower()
        if ext in TECH_EXT:
            out[f"tech:{TECH_EXT[ext]}"] += 1 / n
        for pat, label in TECH_PATH:
            if pat.search(rel):
                out[f"tech:{label}"] += 1 / n
    for p, k in projects.items():
        out[f"proj:{p}"] += k / n
    if not projects:  # a reviewer, an explorer: the repositories named in its commands
        named = Counter(m for c in commands for m in set(REPO_IN_CMD.findall(c)) if not m.startswith("."))
        total = sum(named.values())
        for p, k in named.most_common(2):
            out[f"proj:{p}"] += k / total
        if not named and fallback_project:
            out[f"proj:{fallback_project}"] = 1.0
    for c in commands:
        for shape, _ in command_tokens(c):
            label = TOOLS.get(shape.split()[0])
            if label:
                out[f"tool:{label}"] = 1.0
    return {k: round(min(v, 1.0), 3) for k, v in out.items() if v >= 0.1}


def outcome(run: dict[str, Any], red_mrs: set[str], stuck: bool) -> tuple[float, list[str]]:
    """How well a run went, and why: delivered +2, tests green +1, MR +1; blocked −2, many errors −1, red CI −1, loop −1."""
    score, why = 0.0, []
    if run["status"] == "done":
        score += 2; why.append("livré")
    if (run.get("tests") or {}).get("ok"):
        score += 1; why.append("tests verts")
    if run.get("mr"):
        score += 1; why.append("MR")
    if run["status"] in ("blocked", "gone"):
        score -= 2; why.append("bloqué")
    if (run.get("errors") or 0) > 8:
        score -= 1; why.append(f"{run['errors']} erreurs")
    if run.get("mr") in red_mrs:
        score -= 1; why.append("CI rouge")
    if stuck:
        score -= 1; why.append("a tourné en rond")
    return score, why


def compute(game: Any, days: float = DAYS) -> dict[str, Any]:
    from . import lessons
    from .history import run_info
    red = {b["mr"] for b in lessons._harvest.get("ci", [])}
    runs, now = [], time.time()
    for project in PROJECTS.iterdir() if PROJECTS.exists() else []:
        if not project.is_dir() or any(x in project.name for x in EXCLUDED):
            continue
        for path in project.glob("*/subagents/agent-*.jsonl"):
            try:
                if now - path.stat().st_mtime > days * 86_400:
                    continue
                info, r = run_info(game, path), game.run(path)
            except (OSError, ValueError):
                continue
            stuck = r.since_progress >= 30
            score, why = outcome(info, red, stuck)
            topics = topics_of(list(r.files), [c for c, _ in r.commands])
            if not topics:
                continue
            runs.append({"id": f"{info['session']}|{info['id']}", "type": info["type"], "description": (info["description"] or "")[:140],
                         "ticket": info["ticket"], "status": info["status"], "mr": info["mr"], "last": info["last"], "score": score, "why": why, "topics": topics})
    # matrix specialty × topic
    cells: dict[tuple[str, str], dict[str, Any]] = {}
    totals: Counter[str] = Counter()
    for run in runs:
        for t, w in run["topics"].items():
            c = cells.setdefault((run["type"], t), {"score": 0.0, "runs": 0, "done": 0, "bad": 0, "lessons": 0})
            c["score"] += run["score"] * w + w  # having worked on it counts a little even when it went badly
            c["runs"] += 1; c["done"] += run["status"] == "done"; c["bad"] += run["score"] < 0
            totals[t] += w
    data = lessons.load()
    for x in data["lessons"]:
        if x.get("status") != "active":
            continue
        sc = x.get("scope") or {}
        topic = f"proj:{sc['project']}" if sc.get("project") else None
        if not topic:
            continue
        types = [sc["agent"]] if sc.get("agent") else sorted({t for (t, tp) in cells if tp == topic})
        for t in types:
            c = cells.setdefault((t, topic), {"score": 0.0, "runs": 0, "done": 0, "bad": 0, "lessons": 0})
            c["lessons"] += 1
            c["score"] += 2 if x.get("effect") == "ok" else 0.5
    topics = [t for t, _ in totals.most_common(TOP_TOPICS)]
    types = sorted({t for t, _ in cells}, key=lambda t: -sum(c["score"] for (tt, _), c in cells.items() if tt == t))
    best = {}
    for t in topics:
        cand = [(c["score"], ty) for (ty, tp), c in cells.items() if tp == t and c["score"] > 0]
        if cand:
            best[t] = max(cand)[1]
    return {"at": now, "days": days, "runs": runs, "topics": [{"key": t, "cat": t.split(":", 1)[0], "label": t.split(":", 1)[1], "weight": round(totals[t], 1)} for t in topics],
            "types": types, "best": best,
            "cells": [{"type": ty, "topic": tp, **{k: round(v, 1) if isinstance(v, float) else v for k, v in c.items()}} for (ty, tp), c in cells.items() if tp in topics]}


def knowhow(game: Any, force: bool = False) -> dict[str, Any]:
    with _lock:
        if force or _cache["data"] is None or time.time() - _cache["at"] > TTL:
            _cache.update(data=compute(game), at=time.time())
        return _cache["data"]
