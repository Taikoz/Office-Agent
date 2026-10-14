"""Detail of one agent: progress by phase, timeline, code edits and terminal."""

from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Any

from .config import CFG, EXCLUDED, PROJECTS, SAFE_ID
from .questions import pending_questions
from .transcripts import (
    agent_setting,
    decode,
    describe_tool,
    first_prompt,
    scan,
    subagent,
    text_of,
)

GIT_PUSH = r"\bcommit\b|\bpush\b"
MR = r"merge request|mr-create|\bMR\b"
TESTS = r"pytest|\blint|type-?check|mypy|ruff|\bbuild\b|test suite|\brun\b.*\btests?\b|npm (run )?test|vitest|jest|playwright test"
PHASES: dict[str, list[tuple[str, str]]] = {
    "feature-builder": [
        ("Lecture du ticket", r"ticket|issue|youtrack|jira|\b[A-Z][A-Z0-9]+-\d"),
        ("Branche", r"branch|checkout|switch|worktree"),
        ("Implémentation", r"^(Edit|Write|NotebookEdit)\b|implement|refactor|\badd\b"),
        ("Tests & vérifs", TESTS),
        ("Commit & push", GIT_PUSH),
        ("Merge request", MR),
    ],
    "e2e-test-writer": [
        ("Lecture du ticket", r"ticket|issue|youtrack|jira|\b[A-Z][A-Z0-9]+-\d"),
        ("Écriture des specs", r"^(Edit|Write)\b|spec|seed"),
        ("Stack locale", r"docker|compose|stack|rebuild"),
        ("Tests e2e", r"playwright|test"),
        ("Commit & push", GIT_PUSH),
        ("Merge request", MR),
    ],
    "security-auditor": [
        ("Cadrage du diff", r"diff|fetch|branch|\bMR\b|pending"),
        ("Analyse sécurité", r"secure-review|semgrep|bandit|inspect|check|sink"),
        ("Journal d'audit", r"audit_log|record (the )?audit|journal"),
        ("Proposition MMX", r"mmx|propos"),
    ],
    "audit-security-code": [
        ("Inventaire", r"pending|units|list|inventor"),
        ("Analyse sécurité", r"secure-review|semgrep|bandit|inspect|check|sink"),
        ("Journal d'audit", r"audit_log|record (the )?audit|journal"),
        ("Proposition MMX", r"mmx|propos"),
    ],
    "mr-reviewer": [
        ("Lecture de la MR", r"mr-get|metadata|ticket|fetch"),
        ("Diff", r"diff"),
        ("Analyse", r"^(Read|Grep)\b|check|inspect|test"),
        ("Commentaires", r"mr-comment|comment"),
    ],
    "board-cleaner": [
        ("Board", r"board"),
        ("Tickets", r"search|yt\.py get|issues"),
        ("Vérif GitLab / main", r"mr-search|grep|git |origin/main"),
        ("Mise à jour", r"command|to verify|comment"),
    ],
}
DEFAULT_PHASES = [
    ("Exploration", r"^(Read|Grep|Glob)\b|read|search|find|list|show"),
    ("Modification", r"^(Edit|Write|NotebookEdit)\b"),
    ("Vérification", TESTS),
    ("Rapport", r"SubagentHandback"),
]


def tool_text(name: str, data: dict[str, Any]) -> str:
    """Return the text matched against phase patterns for a tool call."""
    return f"{name} {describe_tool(name, data)}"[:300]


def progress(kind: str, calls: list[str], todos: list[dict[str, Any]], finished: bool) -> dict[str, Any]:
    """Estimate progress from the todo list when present, else from the phases reached."""
    if todos:
        done = sum(t.get("status") == "completed" for t in todos)
        steps = [{"label": str(t.get("content") or t.get("subject") or "?"),
                  "state": {"completed": "done", "in_progress": "current"}.get(t.get("status"), "todo")} for t in todos]
        pct = 100 if finished else round(100 * done / len(todos))
        return {"pct": pct, "source": "todo", "label": f"{done}/{len(todos)} tâches", "steps": steps}
    custom = CFG["phases"].get(kind) if isinstance(CFG["phases"], dict) else None
    phases = [tuple(p) for p in custom if isinstance(p, list) and len(p) == 2] if isinstance(custom, list) else None
    phases = phases or PHASES.get(kind, DEFAULT_PHASES)
    reached = -1
    for call in calls:
        for i, (_, pattern) in enumerate(phases):
            if reached < i <= reached + 2 and re.search(pattern, call, re.I):
                reached = i
    if finished:
        reached = len(phases)
    steps = [{"label": label, "state": "done" if i < reached else "current" if i == reached else "todo"}
             for i, (label, _) in enumerate(phases)]
    pct = 100 if finished else max(3, round(100 * (reached + 0.5) / len(phases)))
    current = phases[reached][0] if 0 <= reached < len(phases) else "Démarrage"
    return {"pct": pct, "source": "phases", "label": "Terminé" if finished else current, "steps": steps}


EDIT_CHARS = 6000
EDITS_KEPT = 40
TERM_KEPT = 60
TERM_OUT = 3000


def code_edits(name: str, data: dict[str, Any], ts: Any) -> list[dict[str, Any]]:
    """Turn an Edit / MultiEdit / Write / NotebookEdit call into before/after snippets for the dev's screen."""
    cut = lambda v: str(v or "")[:EDIT_CHARS]
    path = str(data.get("file_path") or data.get("notebook_path") or "")
    if name == "Edit":
        pairs = [(data.get("old_string"), data.get("new_string"))]
    elif name == "MultiEdit" and isinstance(data.get("edits"), list):
        pairs = [(e.get("old_string"), e.get("new_string")) for e in data["edits"] if isinstance(e, dict)]
    elif name == "Write":
        return [{"t": ts, "tool": name, "file": path, "old": None, "new": cut(data.get("content")),
                 "truncated": len(str(data.get("content") or "")) > EDIT_CHARS}]
    elif name == "NotebookEdit":
        pairs = [(None, data.get("new_source"))]
    else:
        return []
    return [{"t": ts, "tool": name, "file": path, "old": cut(old), "new": cut(new),
             "truncated": max(len(str(old or "")), len(str(new or ""))) > EDIT_CHARS} for old, new in pairs]


def find_transcript(session_id: str, agent_id: str) -> Path | None:
    """Locate a session (agent_id 'chief') or subagent transcript, excluding the excluded projects."""
    if not (SAFE_ID.match(session_id) and SAFE_ID.match(agent_id)) or not PROJECTS.exists():
        return None
    for project in PROJECTS.iterdir():
        if not project.is_dir() or any(x in project.name for x in EXCLUDED):
            continue
        path = project / f"{session_id}.jsonl" if agent_id == "chief" else project / session_id / "subagents" / f"agent-{agent_id}.jsonl"
        if path.exists():
            return path
    return None


def agent_detail(session_id: str, agent_id: str) -> dict[str, Any] | None:
    """Return the full timeline, todos and estimated progress of one agent."""
    path = find_transcript(session_id, agent_id)
    if path is None:
        return None
    now = time.time()
    if agent_id == "chief":
        prompt, _ = first_prompt(path)
        state = scan(path, now)
        state.pop("asks")
        info = {"id": "chief", "type": agent_setting(path) or "chef", "description": prompt[:200], "ticket": None, "status": "working", **state}
        if info["finished"]:
            info["status"] = "done"
    else:
        info = subagent(path, now, pending_questions())
        prompt, _ = first_prompt(path)
    events: list[dict[str, Any]] = []
    calls: list[str] = []
    todos: list[dict[str, Any]] = []
    edits: list[dict[str, Any]] = []
    edit_calls: dict[str, list[dict[str, Any]]] = {}
    term: list[dict[str, Any]] = []
    term_calls: dict[str, dict[str, Any]] = {}
    with path.open("rb") as fh:
        for line in fh:
            rec = decode(line)
            if not rec:
                continue
            msg = rec.get("message") or {}
            content = msg.get("content")
            ts = rec.get("timestamp")
            if rec.get("type") == "assistant" and isinstance(content, list):
                for c in content:
                    if c.get("type") == "text" and c.get("text", "").strip():
                        events.append({"t": ts, "kind": "text", "label": c["text"].strip()[:300]})
                    elif c.get("type") == "tool_use":
                        name, data = c.get("name", ""), c.get("input") or {}
                        calls.append(tool_text(name, data))
                        if name == "TodoWrite" and isinstance(data.get("todos"), list):
                            todos = data["todos"]
                        elif name == "TaskCreate":
                            todos.append({"subject": data.get("subject"), "status": "pending"})
                        elif name == "TaskUpdate" and str(data.get("taskId", "")).isdigit():
                            k = int(data["taskId"]) - 1
                            if 0 <= k < len(todos) and data.get("status"):
                                todos[k]["status"] = data["status"]
                        events.append({"t": ts, "kind": "tool", "tool": name, "label": describe_tool(name, data)[:200]})
                        if name == "Bash":
                            cmd = {"t": ts, "cmd": str(data.get("command", ""))[:2000], "desc": str(data.get("description", ""))[:200],
                                   "cwd": Path(str(rec.get("cwd") or "~")).name, "out": None, "failed": False}
                            term.append(cmd)
                            term_calls[c.get("id", "")] = cmd
                        new = code_edits(name, data, ts)
                        if new:
                            edits.extend(new)
                            edit_calls[c.get("id", "")] = new
            elif rec.get("type") == "user" and isinstance(content, list):
                for c in content:
                    cmd = term_calls.get(c.get("tool_use_id", "")) if c.get("type") == "tool_result" else None
                    if cmd is not None:
                        cmd["out"] = text_of(c.get("content"))[-TERM_OUT:]
                        cmd["failed"] = bool(c.get("is_error"))
                    if c.get("type") == "tool_result" and c.get("is_error"):
                        for e in edit_calls.get(c.get("tool_use_id", ""), []):
                            e["failed"] = True
                        events.append({"t": ts, "kind": "error", "label": text_of(c.get("content"))[:300] or "erreur"})
    return {**info, "prompt": prompt[:1500], "progress": progress(info["type"], calls, todos, info["finished"]),
            "events": events[-60:], "eventCount": len(events), "edits": edits[-EDITS_KEPT:], "editCount": len(edits),
            "terminal": term[-TERM_KEPT:], "termCount": len(term)}
