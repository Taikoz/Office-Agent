"""One pass over each transcript (main sessions and subagents) for ChiefOS → 🧭 Process (read-only, local).

What a transcript did, reduced to what the process checks need: the models and tokens it used (cost, cache), the
context it wasted (files read again, huge tool outputs, compactions), the shell commands it ran (their rule prefix for
the permissions, a Claude attribution in a commit or an MR), the permissions refused (by the user or the auto mode),
the MMX entries its searches returned, the errors it hit and the tests that went red then green with no edit between.
Each summary is kept in STATE_DIR/usage-cache.json and read again only when the transcript's size or date changed.
"""

from __future__ import annotations

import json
import re
import threading
import time
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

from . import config
from .history import project_name
from .pricing import usd
from .transcripts import decode, text_of

BIG = 20_000             # characters: a tool output this long fills the context (about 5k tokens)
EDIT_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
RUNNERS = {"python", "python3", "node", "bash", "sh", "uv", "npx", "poetry", "pipenv", "bun", "deno", "timeout", "time", "nice"}
TEST_RE = re.compile(r"\b(pytest|vitest|jest|playwright test|unittest|go test|cargo test|npm (run )?test|pnpm (run )?test|yarn test)\b")
ATTRIBUTION_RE = re.compile(r"co-authored-by:\s*claude|generated with \[?claude code|noreply@anthropic\.com|🤖 generated with", re.I)
PUBLISH_RE = re.compile(r"\bgit\s+commit\b|gl\.py\s+(mr-create|mr-note|mr-comment)|glab\s+mr\s+(create|note)|yt\.py\s+(comment|create)|gh\s+pr\s+create")
MMX_CMD_RE = re.compile(r"mmx\.py\s+(search|show)\b")
AGENT_MD_RE = re.compile(r"/\.claude/agents/([^/]+)\.md$")
MMX_ID_RE = re.compile(r"\b(?:PROF|PREF|PROJ|GOAL|DEC|FACT|PROC|REL)-\d{4}\b")
AUTO_DENY_RE = re.compile(r"denied by the Claude Code auto mode classifier\. Reason: \[([^\]]+)\]")
MR_URL_RE = re.compile(r"https?://[^\s\"')]+/-/merge_requests/\d+")
MR_CREATE_RE = re.compile(r"mr-create|glab mr create")
USER_DENY = "doesn't want to proceed with this tool use"
FAIL_OUT_RE = re.compile(r"\b(\d+) failed\b|\bFAILED\b|\bfailures?=\d+|Tests:\s+\d+ failed", re.I)

VERSION = 5  # of the summaries' shape: a new one reads every transcript again
_lock = threading.Lock()


def _cache_path() -> Path:
    return config.STATE_DIR / "usage-cache.json"  # read at call time (the tests move STATE_DIR)


def family(model: str) -> str:
    """haiku / sonnet / opus / fable (or the model id itself)."""
    return next((f for f in ("haiku", "sonnet", "opus", "fable", "mythos") if f in model), model or "?")


def rule_prefix(segment: str) -> str:
    """The literal start of one shell command that an allow rule would use: the program and its subcommand
    (`git status`, `python3 -I ~/tools/gl.py mr-get`); "" for what has no stable prefix."""
    words = segment.split()
    while words and re.match(r"^[A-Z_][A-Z0-9_]*=", words[0]):
        words = words[1:]
    if not words or not re.fullmatch(r"[a-z./~_][\w./~+-]*", words[0]):  # a program, not a word of a message
        return ""
    keep = 1
    if Path(words[0]).name in RUNNERS:  # the runner, its options, then the script
        while keep < len(words) and words[keep].startswith("-") and words[keep] not in ("-m", "-c"):
            keep += 1
        if keep < len(words) and words[keep] == "-c":
            return ""
        if keep < len(words) and words[keep] == "-m":
            keep += 1
        keep += 1
    if keep < len(words) and re.fullmatch(r"[a-z][a-z0-9_:-]{1,24}", words[keep]):
        keep += 1
    out = " ".join(words[:keep])
    return out if re.fullmatch(r"[\w./~@:=+-]+( [\w./~@:=+-]+)*", out) and len(out) <= 120 else ""


def segments(cmd: str) -> list[str]:
    """The simple commands of a compound one (heredoc bodies and quoted text left out)."""
    cmd = re.sub(r"<<-?\s*['\"]?(\w+)['\"]?[^\n]*\n.*?(\n\1\s*(\n|$)|$)", "\n", cmd, flags=re.S)
    cmd = re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", "Q", cmd)
    return [s.strip() for s in re.split(r"&&|\|\||;|\n|\|", cmd) if s.strip()]


def _epoch(ts: Any) -> float | None:
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00")).timestamp() if ts else None
    except ValueError:
        return None


def summarize(path: Path) -> dict[str, Any]:
    """What one transcript did, for the process checks (see the module's docstring)."""
    sub = path.parent.name == "subagents"
    meta: dict[str, Any] = {}
    if sub:
        try:
            meta = json.loads(path.with_suffix(".meta.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            meta = {}
    models: dict[str, dict[str, float]] = {}
    seen: set[str] = set()
    calls: dict[str, tuple[str, str, str]] = {}  # tool_use id → (tool, command / path, prefix)
    reads: Counter[str] = Counter()
    rereads, edits, tools, out_chars, compactions = 0, 0, 0, 0, 0
    big: list[list[Any]] = []
    prefixes: Counter[str] = Counter()
    mcp: Counter[str] = Counter()
    denials: list[dict[str, str]] = []
    mmx_hits: list[str] = []
    attributions: list[str] = []
    errors: list[list[str]] = []
    test_state: dict[str, bool] = {}  # test command prefix → last result was red, no edit since
    flaky: list[str] = []
    agent_edits: list[list[Any]] = []
    mr_created: list[str] = []
    mr_read: list[str] = []
    prompt = ""  # [agent file name, time]: a change of an agent's definition
    first = last = None
    agent = str(meta.get("agentType") or "")
    with path.open("rb") as fh:
        for line in fh:
            if not line.strip():
                continue
            if b'"isCompactSummary":true' in line or b'"compact_boundary"' in line:
                compactions += 1
            if b'"agent-setting"' in line and not sub and not agent:
                agent = str((decode(line) or {}).get("agentSetting") or "")
            if not prompt and b'"user"' in line and b'"tool_result"' not in line:
                rec = decode(line)
                msg = (rec or {}).get("message") or {}
                if rec and not rec.get("isMeta") and msg.get("role") == "user":
                    text = text_of(msg.get("content")) if not isinstance(msg.get("content"), str) else msg["content"]
                    prompt = "" if text.startswith(("<", "Caveat:")) else text[:600]
                continue
            if not (b'"assistant"' in line or b'"tool_result"' in line):
                continue
            rec = decode(line)
            if not rec:
                continue
            t = _epoch(rec.get("timestamp"))
            if t:
                first, last = first or t, t
            msg = rec.get("message") or {}
            if rec.get("type") == "assistant" and msg.get("usage") and str(msg.get("model", "")).startswith("claude") and msg.get("id", "") not in seen:
                seen.add(msg.get("id", ""))
                u, m = msg["usage"], models.setdefault(msg["model"], {"in": 0, "cw": 0, "cr": 0, "out": 0, "cost": 0.0, "calls": 0})
                for k, f in (("in", "input_tokens"), ("cw", "cache_creation_input_tokens"), ("cr", "cache_read_input_tokens"), ("out", "output_tokens")):
                    m[k] += u.get(f, 0) or 0
                m["cost"] += usd(msg["model"], u)
                m["calls"] += 1
            content = msg.get("content")
            for c in content if isinstance(content, list) else []:
                if not isinstance(c, dict):
                    continue
                if c.get("type") == "tool_use":
                    tools += 1
                    name, data = c.get("name", ""), c.get("input") or {}
                    if name == "Read" and data.get("file_path"):
                        fp = str(data["file_path"])
                        rereads += reads[fp] > 0 and not data.get("offset")
                        reads[fp] += 1
                    if name in EDIT_TOOLS:
                        edits += 1
                        test_state.clear()
                        md = AGENT_MD_RE.search(str(data.get("file_path", "")))
                        if md and t:
                            agent_edits.append([md.group(1), t])
                    prefix = ""
                    if name == "Bash":
                        cmd = str(data.get("command", ""))
                        for seg in segments(cmd):
                            p = rule_prefix(seg)
                            if p:
                                prefixes[p] += 1
                                prefix = prefix or (p if p.split()[0] not in ("cd", "export", "source", "set") else "")
                        if PUBLISH_RE.search(cmd) and ATTRIBUTION_RE.search(cmd):
                            attributions.append(cmd[:200])
                        calls[c.get("id", "")] = (name, cmd[:300], prefix)
                    else:
                        if name.startswith("mcp__"):
                            mcp[name] += 1
                        calls[c.get("id", "")] = (name, str(data.get("file_path") or data.get("url") or data.get("pattern") or "")[:200], "")
                elif c.get("type") == "tool_result":
                    content = c.get("content")
                    text = content if isinstance(content, str) else text_of(content) if isinstance(content, list) else ""
                    tool, arg, prefix = calls.get(c.get("tool_use_id", ""), ("?", "", ""))
                    out_chars += len(text)
                    if len(text) >= BIG:
                        big.append([tool if tool != "Bash" else f"Bash: {prefix or arg[:60]}", len(text), arg[:120]])
                    if tool == "Bash" and not c.get("is_error") and (urls := MR_URL_RE.findall(text)):
                        (mr_created if MR_CREATE_RE.search(arg) else mr_read).extend(u for u in urls[-2:])
                    if MMX_CMD_RE.search(arg):
                        mmx_hits.extend(sorted(set(MMX_ID_RE.findall(text))))
                    if c.get("is_error"):
                        deny = AUTO_DENY_RE.search(text)
                        if deny or USER_DENY in text:
                            denials.append({"kind": "auto" if deny else "user", "reason": deny.group(1) if deny else "", "tool": tool, "arg": arg[:200], "prefix": prefix})
                        elif len(errors) < 40:
                            errors.append([tool if tool != "Bash" else (prefix or "Bash"), text.strip()[:240]])
                    if tool == "Bash" and TEST_RE.search(arg):
                        red = bool(c.get("is_error")) or bool(FAIL_OUT_RE.search(text[-4000:]))
                        key = prefix or arg[:80]
                        if not red and test_state.get(key):
                            flaky.append(key)
                        test_state[key] = red
    big.sort(key=lambda b: -b[1])
    session = path.parent.parent.name if sub else path.stem
    proj_dir = (path.parent.parent.parent if sub else path.parent).name
    return {"path": str(path), "sub": sub, "id": path.stem.removeprefix("agent-") if sub else path.stem, "session": session,
            "project": project_name(proj_dir), "agent": agent, "description": str(meta.get("description") or "")[:140],
            "first": first, "last": last or path.stat().st_mtime, "models": models, "tools": tools, "edits": edits,
            "reads": sum(reads.values()), "rereads": int(rereads), "outChars": out_chars, "big": big[:6], "bigCount": len(big),
            "compactions": compactions, "prefixes": dict(prefixes), "mcp": dict(mcp), "denials": denials[:20],
            "mmx": mmx_hits[:200], "attributions": attributions[:5], "errors": errors, "flaky": flaky[:10], "agentEdits": agent_edits[:50],
            "ticket": next(iter(config.TICKET_RE.findall(f"{meta.get('description', '')} {prompt}")), None),
            "mrCreated": list(dict.fromkeys(mr_created))[:5], "mrRead": list(dict.fromkeys(mr_read))[:10]}


def transcripts(days: float) -> list[Path]:
    now, out = time.time(), []
    root = config.PROJECTS
    for project in root.iterdir() if root.exists() else []:
        if not project.is_dir() or any(x in project.name for x in config.EXCLUDED):
            continue
        for path in [*project.glob("*.jsonl"), *project.glob("*/subagents/agent-*.jsonl")]:
            try:
                if now - path.stat().st_mtime <= days * 86_400:
                    out.append(path)
            except OSError:
                continue
    return out


def summaries(days: float = 30) -> list[dict[str, Any]]:
    """One summary per transcript of the last `days`, read again only when it changed (cache on disk)."""
    with _lock:
        try:
            cache = json.loads(_cache_path().read_text(encoding="utf-8"))
            cache = cache if isinstance(cache, dict) and cache.get("v") == VERSION else {}
        except (OSError, ValueError):
            cache = {}
        items, fresh, out = cache.get("items", {}), {}, []
        for path in transcripts(days):
            try:
                st = path.stat()
            except OSError:
                continue
            key, sig = str(path), [st.st_size, round(st.st_mtime, 3)]
            hit = items.get(key)
            if isinstance(hit, dict) and hit.get("sig") == sig:
                summ = hit["summary"]
            else:
                try:
                    summ = summarize(path)
                except OSError:
                    continue
            fresh[key] = {"sig": sig, "summary": summ}
            out.append(summ)
        old = {k: v for k, v in items.items() if k not in fresh and isinstance(v, dict) and time.time() - (v.get("summary") or {}).get("last", 0) < 90 * 86_400}
        config.STATE_DIR.mkdir(parents=True, exist_ok=True)
        tmp = _cache_path().with_suffix(".tmp")
        tmp.write_text(json.dumps({"v": VERSION, "items": {**old, **fresh}}, ensure_ascii=False), encoding="utf-8")
        tmp.replace(_cache_path())
        return out


def cost(s: dict[str, Any]) -> float:
    return sum(m["cost"] for m in s["models"].values())


def main_family(s: dict[str, Any]) -> str:
    """The model family that did most of the work of a transcript (by output tokens)."""
    if not s["models"]:
        return "?"
    return family(max(s["models"].items(), key=lambda kv: kv[1]["out"])[0])


def agent_runs(game: Any, days: float = 30) -> list[dict[str, Any]]:
    """Every subagent run of the last `days` with its outcome (history.run_info), what the office parsed of it
    (projects of its edited files, MR read, loop) and its usage summary."""
    from .history import run_info
    from .knowhow import repo_of
    by_path = {s["path"]: s for s in summaries(days) if s["sub"]}
    out = []
    for path_str, summ in by_path.items():
        path = Path(path_str)
        try:
            info, r = run_info(game, path), game.run(path)
        except (OSError, ValueError):
            continue
        repos = Counter(x[0] for x in (repo_of(f) for f in r.files) if x)
        out.append({**info, "path": path_str, "repos": [k for k, _ in repos.most_common(3)], "mrSeen": r.mr_seen,
                    "loop": r.since_progress >= 30, "testsEnd": r.tests, "usage": summ})
    return out
