"""ChiefOS → 🧭 Process → Permissions: the permission rules worth adding to Claude Code's settings (local).

From the transcripts of the last DAYS: the shell commands run again and again (by their rule prefix, usage.rule_prefix)
that no `allow` rule of the settings covers, and the actions refused, by the user or by the auto mode's classifier (with
its reason). Each prefix is rated: reading (a click adds it), writing (a confirmation), risky (never offered: pushing,
deleting, deploying, network writes). Adding writes `Bash(<prefix>:*)` to permissions.allow of ~/.claude/settings.json
(a copy of the file is kept once in settings.json.office-bak); the rules added here are listed and can be removed.
"""

from __future__ import annotations

import json
import re
import shutil
import threading
from collections import Counter
from pathlib import Path
from typing import Any

from . import config, usage

DAYS = 14
MIN_COUNT, MIN_SESSIONS = 5, 2
BUILTINS = {"for", "do", "done", "then", "fi", "if", "else", "elif", "while", "until", "case", "esac", "cd", "export", "source", "set", "unset", "local",
            "return", "exit", "break", "continue", "true", "false", "[", "[[", "test", "echo", "printf", "read", "shift", "eval", "exec", "wait", "trap", "{", "}", "(", ")"}
READ_PROGS = {"ls", "cat", "head", "tail", "grep", "rg", "find", "wc", "sort", "uniq", "cut", "tr", "diff", "file", "stat", "du", "df", "which", "tree", "jq",
              "pwd", "date", "basename", "dirname", "realpath", "readlink", "column", "less", "nl", "md5sum", "sha1sum", "printenv", "whoami", "id", "ps", "uname"}  # find (-delete, -exec), awk (system), env (runs a command): not here
READ_SUBS = re.compile(r"^git (status|log|diff|show|branch|rev-parse|remote|ls-files|blame|describe|tag|config --get|stash list)\b|"
                       r"gl\.py (whoami|mr-find|mr-search|mr-get|mr-diff|mr-risk|mr-pipeline|pipeline|job)|yt\.py (get|search|board|users)\b|"
                       r"mmx\.py (search|show|validate|proposals|resume|next-id)\b|kubectl (get|describe|logs|top)\b|docker (ps|images|logs)\b|npm (ls|view|outdated)\b|"
                       r"pytest\b|vitest\b|jest\b|tsc\b|eslint\b|ruff\b|mypy\b|-m unittest\b|-m pytest\b|npm (run )?(test|lint|typecheck|build)\b|pnpm (test|lint|build)\b")
RISKY = re.compile(r"^docker compose$|^git stash$|^(rm|rmdir|dd|mkfs|shred|sudo|su|chmod|chown|kill|pkill|killall|reboot|shutdown|curl|wget|ssh|scp|rsync|nc|psql|mysql|mongo|redis-cli)\b|"
                   r"^git (push|reset|clean|checkout|restore|rebase|merge|cherry-pick|revert|branch -D|tag -d|filter)|"
                   r"(kubectl|helm|terraform|gcloud|aws|az) |docker (rm|rmi|push|run|exec|compose (down|rm))|npm publish|"
                   r"gl\.py (mr-create|mr-note|mr-comment|mr-merge|merge|approve)|yt\.py (create|comment|command)|gh (pr|issue|release) (create|merge|close)")
BROAD = {"git", "docker", "npm", "yarn", "pnpm", "npx", "kubectl", "helm", "python", "python3", "node", "bash", "sh", "zsh", "make", "uv", "poetry",
         "pip", "pip3", "go", "cargo", "gh", "glab", "sed", "xargs", "env", "awk", "find", "perl", "ruby", "deno", "bun", "timeout", "nohup", "watch"}  # alone: runs anything
SENSITIVE = re.compile(r"credential|secret|security|destructive|exfiltrat|privilege|irreversible", re.I)
_lock = threading.Lock()


def _settings_path() -> Path:
    return config.HOME_CLAUDE / "settings.json"


def _state_path() -> Path:
    return config.STATE_DIR / "permissions.json"


def _read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def settings_files() -> list[Path]:
    home = config.HOME_CLAUDE
    out = [home / "settings.json", home / "settings.local.json"]
    for base in {config.LAUNCH_DIR, *(p.parent.parent for p in config.agent_files().values())}:
        out += [base / ".claude" / "settings.json", base / ".claude" / "settings.local.json"]
    return list(dict.fromkeys(out))


def existing_rules() -> dict[str, list[str]]:
    """allow / deny rules of every settings file found."""
    out: dict[str, list[str]] = {"allow": [], "deny": [], "ask": []}
    mode = ""
    for f in settings_files():
        perms = _read_json(f).get("permissions") or {}
        for k in out:
            out[k] += [str(x) for x in perms.get(k) or [] if isinstance(x, str)]
        mode = mode or str(perms.get("defaultMode") or "")
    return {**out, "mode": [mode] if mode else []}


def _covered(prefix: str, allow: list[str]) -> bool:
    for rule in allow:
        m = re.fullmatch(r"Bash\((.*)\)", rule.strip())
        if not m:
            continue
        body = m.group(1)
        if body in ("*", ""):
            return True
        base = re.sub(r"(:\*| \*|\*)$", "", body)
        glued = body.endswith("*") and not body.endswith((":*", " *"))  # Bash(ls*): any start; Bash(ls:*): the word ls
        if prefix == base or prefix.startswith(base + " ") or (glued and prefix.startswith(base)):
            return True
    return False


def level(prefix: str) -> str:
    """read / write / risky."""
    words = prefix.split()
    prog = Path(words[0]).name if words else ""
    if not words or (len(words) == 1 and prog in BROAD) or words[-1] in ("-", "-c", "-e") or (prog in usage.RUNNERS and not any("." in w or w == "-m" for w in words[1:])):
        return "risky"  # too broad, or code read from stdin / the command line
    if RISKY.search(prefix) or RISKY.search(" ".join([prog, *words[1:]])):
        return "risky"
    if prog in READ_PROGS or READ_SUBS.search(prefix):
        return "read"
    return "write"


def overview(days: float = DAYS) -> dict[str, Any]:
    rules = existing_rules()
    count: Counter[str] = Counter()
    sessions: dict[str, set[str]] = {}
    denials: dict[tuple[str, str, str], dict[str, Any]] = {}
    for s in usage.summaries(days):
        for p, n in s["prefixes"].items():
            if p.split()[0] in BUILTINS:
                continue
            count[p] += n
            sessions.setdefault(p, set()).add(s["session"])
        for d in s.get("denials") or []:
            key = (d["kind"], d["reason"], d["prefix"] or d["tool"])
            x = denials.setdefault(key, {"kind": d["kind"], "reason": d["reason"], "what": d["prefix"] or d["tool"], "n": 0, "sample": d["arg"][:160], "agents": set()})
            x["n"] += 1
            x["agents"].add(s["agent"] or "session principale")
    suggestions = []
    for p, n in count.most_common():
        if n < MIN_COUNT or len(sessions[p]) < MIN_SESSIONS or _covered(p, rules["allow"]):
            continue
        lv = level(p)
        suggestions.append({"prefix": p, "rule": f"Bash({p}:*)", "n": n, "sessions": len(sessions[p]), "level": lv})
        if len(suggestions) >= 40:
            break
    order = {"read": 0, "write": 1, "risky": 2}
    suggestions.sort(key=lambda x: (order[x["level"]], -x["n"]))
    added = _read_json(_state_path()).get("added", [])
    return {"days": days, "mode": (rules["mode"] or [""])[0], "allowCount": len(rules["allow"]), "suggestions": suggestions,
            "denials": sorted((_denial(d) for d in denials.values()), key=lambda d: -d["n"])[:30],
            "added": [r for r in added if r in rules["allow"]], "settings": str(_settings_path())}


def _denial(d: dict[str, Any]) -> dict[str, Any]:
    """A refused action. Only the auto mode's refusals get a rule (the user's own "no" is a decision, not a setting):
    a shell command its Bash(prefix:*) rule, an MCP tool its own name; Read, Edit… none."""
    what = d["what"] or ""
    rule, lv = "", "write"
    if what.startswith("mcp__"):
        rule = what
    elif re.fullmatch(r"[a-z./~_][\w./~+ -]*", what) and what.split()[0] not in BUILTINS:
        lv = level(what)
        rule = f"Bash({what}:*)" if lv != "risky" else ""
    offer = d["kind"] == "auto" and not SENSITIVE.search(d["reason"] or "")
    return {**d, "agents": sorted(d["agents"]), "level": lv, "rule": rule if offer else ""}


def add(rule: str, confirm: bool = False) -> dict[str, Any]:
    """Add one allow rule to ~/.claude/settings.json (risky ones refused, writing ones need `confirm`)."""
    m = re.fullmatch(r"Bash\(([\w./~@:=+ -]{1,120}):\*\)", rule)
    if not m and not re.fullmatch(r"mcp__[\w-]+__[\w-]+", rule):
        return {"ok": False, "error": "règle invalide"}
    lv = level(m.group(1)) if m else "write"
    if lv == "risky":
        return {"ok": False, "error": "commande risquée : à ajouter à la main si tu y tiens"}
    if lv == "write" and not confirm:
        return {"ok": False, "error": "confirmation requise", "confirm": True}
    with _lock:
        path = _settings_path()
        data = _read_json(path) if path.exists() else {}
        if path.exists() and not data and path.read_text(encoding="utf-8").strip():
            return {"ok": False, "error": f"{path} illisible : rien n'est écrit"}
        backup = path.with_name("settings.json.office-bak")
        if path.exists() and not backup.exists():
            shutil.copy2(path, backup)
        allow = data.setdefault("permissions", {}).setdefault("allow", [])
        if rule not in allow:
            allow.append(rule)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".office-tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(path)
        state = _read_json(_state_path())
        state["added"] = list(dict.fromkeys([*state.get("added", []), rule]))
        config.STATE_DIR.mkdir(parents=True, exist_ok=True)
        _state_path().write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    return {"ok": True, "rule": rule}


def remove(rule: str) -> dict[str, Any]:
    """Take back a rule this page added (only those)."""
    with _lock:
        state = _read_json(_state_path())
        if rule not in state.get("added", []):
            return {"ok": False, "error": "règle non ajoutée par Agent Office"}
        path = _settings_path()
        data = _read_json(path)
        allow = (data.get("permissions") or {}).get("allow") or []
        if rule in allow:
            allow.remove(rule)
            tmp = path.with_suffix(".office-tmp")
            tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            tmp.replace(path)
        state["added"] = [r for r in state["added"] if r != rule]
        _state_path().write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    return {"ok": True}
