"""Read Claude Code transcripts (read-only): tails, tool calls, state of a subagent or a main session."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from .config import ASK_RE, HEAD_BYTES, TAIL_BYTES, TICKET_RE
from .questions import match_question

LESSONS_MARK = "## Leçons des missions précédentes (Agent Office)"  # lessons.MARK (not imported: lessons.py imports this package)
LESSON_IDS = re.compile(r"\[(L-\d{4})\]")


def read_head(path: Path) -> list[dict[str, Any]]:
    """Return the first decodable records of a JSONL file."""
    with path.open("rb") as fh:
        raw = fh.read(HEAD_BYTES)
    return [r for r in map(decode, raw.split(b"\n")[:-1] or raw.split(b"\n")) if r]


def read_tail(path: Path) -> list[dict[str, Any]]:
    """Return the last decodable records of a JSONL file."""
    size = path.stat().st_size
    with path.open("rb") as fh:
        fh.seek(max(0, size - TAIL_BYTES))
        raw = fh.read()
    lines = raw.split(b"\n")
    if size > TAIL_BYTES:
        lines = lines[1:]
    return [r for r in map(decode, lines) if r]


def decode(line: bytes) -> dict[str, Any] | None:
    """Decode one JSONL line, ignoring partial or invalid ones."""
    try:
        record = json.loads(line)
    except ValueError:
        return None
    return record if isinstance(record, dict) else None


def text_of(content: Any) -> str:
    """Flatten a message content to plain text."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text")
    return ""


def describe_tool(name: str, data: dict[str, Any]) -> str:
    """Return a short human label for a tool call."""
    if name == "Bash":
        return data.get("description") or str(data.get("command", ""))[:60]
    if name in ("Read", "Edit", "Write", "NotebookEdit"):
        return f"{name} {Path(str(data.get('file_path', ''))).name}"
    if name in ("Grep", "Glob"):
        return f"{name} {data.get('pattern', '')}"[:60]
    if name == "Agent":
        return f"délègue : {data.get('description', '')}"
    if name == "Skill":
        return f"skill {data.get('skill', '')}"
    if name.startswith("mcp__"):
        return name.split("__")[-1].replace("_", " ")
    return name


def scan(path: Path, now: float) -> dict[str, Any]:
    """Extract status, last action, counters and tickets from one transcript."""
    tail = read_tail(path)
    tools = errors = tokens = 0
    last_tool, last_error, stop, handback = "", "", None, False
    open_calls: dict[str, str] = {}
    seen: set[str] = set()
    for rec in tail:
        msg = rec.get("message") or {}
        content = msg.get("content")
        if rec.get("type") == "assistant":
            if not msg.get("id") or msg["id"] not in seen:  # one response spans several records sharing message.id
                seen.add(msg.get("id", ""))
                tokens += (msg.get("usage") or {}).get("output_tokens", 0) or 0
            stop = msg.get("stop_reason") or stop
            for c in content if isinstance(content, list) else []:
                if c.get("type") == "tool_use":
                    tools += 1
                    handback = handback or c.get("name") == "SubagentHandback"
                    last_tool = describe_tool(c.get("name", ""), c.get("input") or {})
                    open_calls[c.get("id", "")] = str((c.get("input") or {}).get("command", ""))
        elif rec.get("type") == "user" and isinstance(content, list):
            for c in content:
                if c.get("type") == "tool_result":
                    open_calls.pop(c.get("tool_use_id", ""), None)
                    if c.get("is_error"):
                        errors += 1
                        last_error = text_of(c.get("content"))[:120] or "erreur"
    last = next((r for r in reversed(tail) if r.get("type") in ("assistant", "user")), {})
    finished = handback or (
        last.get("type") == "assistant"
        and (last.get("message") or {}).get("stop_reason") == "end_turn"
        and not open_calls
    )
    mtime = path.stat().st_mtime
    return {
        "tools": tools,
        "errors": errors,
        "tokens": tokens,
        "action": last_tool,
        "lastError": last_error,
        "finished": finished,
        "idle": round(now - mtime),
        "updated": mtime,
        "lastText": text_of((last.get("message") or {}).get("content"))[-160:] if finished else "",
        "asks": [cmd for cmd in open_calls.values() if ASK_RE.search(cmd)],
    }


def first_prompt(path: Path) -> tuple[str, dict[str, Any]]:
    """Return the first user prompt text and the first record of a transcript."""
    head = read_head(path)
    first = next((r for r in head if r.get("cwd")), head[0] if head else {})
    for rec in head:
        if rec.get("type") == "user":
            text = text_of((rec.get("message") or {}).get("content"))
            if text and not text.startswith("<"):
                return text, first
    return "", first


def subagent(path: Path, now: float, questions: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Describe one subagent transcript."""
    meta_path = path.with_suffix(".meta.json")
    meta: dict[str, Any] = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except ValueError:
            pass
    prompt, first = first_prompt(path)
    state = scan(path, now)
    question = match_question(state.pop("asks"), questions or [])
    if state["finished"]:
        status = "done"
    elif question:
        status = "asking"
    elif state["idle"] > 900:
        status = "gone"
    elif state["errors"] and state["idle"] > 120:
        status = "blocked"
    else:
        status = "working"
    tickets = TICKET_RE.findall(f"{meta.get('description', '')} {prompt}")
    return {
        "id": path.stem.removeprefix("agent-"),
        "type": meta.get("agentType") or first.get("attributionAgent") or "agent",
        "description": meta.get("description") or prompt[:80],
        "ticket": tickets[0] if tickets else None,
        "started": first.get("timestamp"),
        "status": status,
        "question": question,
        "lessons": LESSON_IDS.findall(prompt.split(LESSONS_MARK, 1)[1]) if LESSONS_MARK in prompt else [],
        **state,
    }


def agent_setting(path: Path) -> str:
    """Return the agent a main session runs as (`claude --agent <name>`), if any."""
    return next((r.get("agentSetting", "") for r in read_head(path) if r.get("type") == "agent-setting"), "")


def chief_state(path: Path, now: float, questions: list[dict[str, Any]]) -> dict[str, Any]:
    """Describe the main session: state, agent it runs as, question it is waiting on."""
    state = scan(path, now)
    question = match_question(state.pop("asks"), questions)
    return {**state, "agent": agent_setting(path), "question": question}
