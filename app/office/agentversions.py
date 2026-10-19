"""ChiefOS → 🧭 Process → Agents: did the last change of an agent's definition make it better or worse? (read-only)

Versions of `.claude/agents/<name>.md`: its git commits when the file is in a repository, the edits Claude made to it
(seen in the transcripts) and the file's own date; changes less than MERGE apart are one version. A copy of each file
seen is kept (STATE_DIR/agent-versions.json, the last KEEP per agent) to show what changed. Each run of that agent type
belongs to the version in force when it started; per version: delivered, blocked, loops, errors, cost, time. The latest
version is compared with the one before when both have MIN_RUNS runs: a drop of the delivered share, more errors, more
cost or time is a regression.
"""

from __future__ import annotations

import difflib
import hashlib
import json
import statistics
import subprocess
import time
from pathlib import Path
from typing import Any

from . import config, usage

DAYS = 60
MERGE = 1800
KEEP = 8
MIN_RUNS = 3


def _path() -> Path:
    return config.STATE_DIR / "agent-versions.json"


def _load() -> dict[str, Any]:
    try:
        data = json.loads(_path().read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _git_times(md: Path) -> list[tuple[float, str]]:
    real = md.resolve()
    try:
        out = subprocess.run(["git", "-C", str(real.parent), "log", "--follow", "--format=%ct%x09%s", "-n", "20", "--", real.name],
                             capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return []
    if out.returncode:
        return []
    return [(float(line.split("\t", 1)[0]), line.split("\t", 1)[1] if "\t" in line else "") for line in out.stdout.splitlines() if line[:1].isdigit()]


def snapshot() -> dict[str, Any]:
    """Keep a copy of every agent definition that changed since last time (to diff the versions later)."""
    data = _load()
    snaps = data.setdefault("snaps", {})
    for name, md in config.agent_files().items():
        try:
            text = md.read_text(encoding="utf-8", errors="replace")[:60_000]
            mtime = md.stat().st_mtime
        except OSError:
            continue
        digest = hashlib.sha1(text.encode()).hexdigest()[:12]
        lst = snaps.setdefault(name, [])
        if not lst or lst[-1]["hash"] != digest:
            lst.append({"hash": digest, "t": mtime, "seen": time.time(), "text": text})
            snaps[name] = lst[-KEEP:]
    config.STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = _path().with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    tmp.replace(_path())
    return data


def _metrics(runs: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(runs)
    if not n:
        return {"n": 0}
    secs = [max(0.0, (r["last"] or 0) - (r["first"] or r["last"] or 0)) for r in runs]
    return {"n": n, "done": round(100 * sum(r["status"] == "done" for r in runs) / n), "blocked": round(100 * sum(r["status"] in ("blocked", "gone") for r in runs) / n),
            "loops": round(100 * sum(bool(r["loop"]) for r in runs) / n), "errors": round(sum(r["errors"] or 0 for r in runs) / n, 1),
            "cost": round(sum(r["cost"] for r in runs) / n, 2), "minutes": round(statistics.median(secs) / 60, 1),
            "mr": round(100 * sum(bool(r["mr"]) for r in runs) / n)}


def _verdict(new: dict[str, Any], old: dict[str, Any]) -> list[dict[str, str]]:
    if new.get("n", 0) < MIN_RUNS or old.get("n", 0) < MIN_RUNS:
        return []
    out = []
    pct = lambda a, b: (a - b) / b * 100 if b else (100 if a else 0)  # noqa: E731
    if new["done"] <= old["done"] - 15:
        out.append({"level": "bad", "text": f"livré {old['done']} % → {new['done']} %"})
    elif new["done"] >= old["done"] + 15:
        out.append({"level": "good", "text": f"livré {old['done']} % → {new['done']} %"})
    if new["loops"] >= old["loops"] + 20:
        out.append({"level": "bad", "text": f"tourne en rond {old['loops']} % → {new['loops']} %"})
    if pct(new["errors"], old["errors"]) >= 50 and new["errors"] - old["errors"] >= 2:
        out.append({"level": "bad", "text": f"erreurs/run {old['errors']} → {new['errors']}"})
    if pct(new["cost"], old["cost"]) >= 40 and new["cost"] - old["cost"] >= 0.5:
        out.append({"level": "bad", "text": f"coût/run {old['cost']} $ → {new['cost']} $"})
    elif pct(new["cost"], old["cost"]) <= -30:
        out.append({"level": "good", "text": f"coût/run {old['cost']} $ → {new['cost']} $"})
    if pct(new["minutes"], old["minutes"]) >= 50 and new["minutes"] - old["minutes"] >= 3:
        out.append({"level": "bad", "text": f"durée médiane {old['minutes']} → {new['minutes']} min"})
    return out


def versions(game: Any, days: float = DAYS) -> dict[str, Any]:
    snaps = snapshot().get("snaps", {})
    runs = usage.agent_runs(game, days)
    edits: dict[str, list[float]] = {}
    for s in usage.summaries(days):
        for name, t in s.get("agentEdits") or []:
            edits.setdefault(name, []).append(t)
    out = []
    for name, md in sorted(config.agent_files().items()):
        mine = sorted((r for r in runs if r["type"] == name), key=lambda r: r["first"] or r["last"] or 0)
        changes: list[tuple[float, str]] = [(t, f"commit : {msg}") for t, msg in _git_times(md)]
        changes += [(t, "modifié par Claude") for t in edits.get(md.stem, []) + (edits.get(name, []) if name != md.stem else [])]
        try:
            changes.append((md.stat().st_mtime, "fichier enregistré"))
        except OSError:
            pass
        changes.sort()
        merged: list[dict[str, Any]] = []
        for t, why in changes:  # several edits in a row are one version (it starts at the last of them)
            if merged and t - merged[-1]["t"] < MERGE:
                merged[-1]["t"] = t
                merged[-1]["why"] = why if why.startswith("commit") else merged[-1]["why"]
            else:
                merged.append({"t": t, "why": why})
        merged = [m for m in merged if time.time() - m["t"] <= days * 86_400]
        bounds = [0.0, *(m["t"] for m in merged), float("inf")]
        vers = []
        for i in range(len(bounds) - 1):
            part = [r for r in mine if bounds[i] <= (r["first"] or r["last"] or 0) < bounds[i + 1]]
            label = "avant" if i == 0 else time.strftime("%d/%m %H:%M", time.localtime(bounds[i]))
            vers.append({"since": bounds[i] or None, "label": label, "why": merged[i - 1]["why"] if i else "", **_metrics(part)})
        vers = [v for v in vers if v["n"] or v["since"]][-6:]
        latest, before = (vers[-1], vers[-2]) if len(vers) >= 2 else (vers[-1] if vers else {"n": 0}, {"n": 0})
        out.append({"agent": name, "file": str(md), "runs": len(mine), "versions": vers, "verdict": _verdict(latest, before),
                    "snaps": [{"hash": x["hash"], "t": x["t"]} for x in snaps.get(name, [])]})
    out.sort(key=lambda a: (not any(v["level"] == "bad" for v in a["verdict"]), -a["runs"]))
    return {"days": days, "agents": out, "minRuns": MIN_RUNS}


def diff(name: str, old_hash: str) -> dict[str, Any]:
    """What changed in an agent's definition since a kept copy (unified diff, at most 400 lines)."""
    snaps = _load().get("snaps", {}).get(name, [])
    old = next((x for x in snaps if x["hash"] == old_hash), None)
    md = config.agent_files().get(name)
    if old is None or md is None:
        raise ValueError("version inconnue")
    new = md.read_text(encoding="utf-8", errors="replace")
    lines = list(difflib.unified_diff(old["text"].splitlines(), new.splitlines(), "avant", "maintenant", lineterm="", n=2))
    return {"agent": name, "diff": "\n".join(lines[:400]) or "(identique)"}
