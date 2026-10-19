"""Blocking questions asked by agents through ask.py, answered from the page."""

from __future__ import annotations

import json
import re
import time
from typing import Any

from .config import QUESTIONS, SAFE_ID, WAIT_RE, excluded


def norm(s: str) -> str:
    """Lowercase alphanumerics only, to compare a question with the shell command that asked it."""
    return re.sub(r"[^0-9a-zà-ÿ]+", "", s.lower())


def pending_questions() -> list[dict[str, Any]]:
    """Return unanswered Agent Office questions of the last 24 h, oldest first."""
    out = []
    for path in QUESTIONS.glob("*.json") if QUESTIONS.exists() else []:
        try:
            q = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if q.get("answer") is None and time.time() - q.get("created", 0) < 86_400 and not excluded(q.get("cwd", "")):
            out.append({k: q.get(k) for k in ("id", "question", "options", "context", "from", "created")})
    return sorted(out, key=lambda q: q["created"])


def answered(days: float = 30) -> list[dict[str, Any]]:
    """Questions already answered over the last `days`, newest first: the decision log."""
    out = []
    for path in QUESTIONS.glob("*.json") if QUESTIONS.exists() else []:
        try:
            q = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if q.get("answer") is not None and time.time() - q.get("created", 0) < days * 86_400 and not excluded(q.get("cwd", "")):
            out.append({k: q.get(k) for k in ("id", "question", "options", "context", "from", "created", "answer", "answered", "cwd")})
    return sorted(out, key=lambda q: -(q.get("answered") or q["created"]))


def match_question(asks: list[str], questions: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Find the pending question an agent is waiting on, from its running ask.py command."""
    for cmd in asks:
        wait = WAIT_RE.search(cmd)
        for q in reversed(questions):
            if (wait and wait.group(1) == q["id"]) or (not wait and norm(q["question"])[:60] in norm(cmd)):
                return q
    return None


def answer_question(qid: str, answer: str) -> bool:
    """Write the user's answer into a pending question file (atomic)."""
    path = QUESTIONS / f"{qid}.json"
    if not SAFE_ID.match(qid) or not path.exists():
        return False
    q = json.loads(path.read_text(encoding="utf-8"))
    if q.get("answer") is not None:
        return False
    q.update(answer=answer, answered=time.time())
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(q, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)
    return True
