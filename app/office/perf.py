"""Stats per agent type over the last days (full transcripts, cached on mtime)."""

from __future__ import annotations

import time
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import EXCLUDED, PROJECTS
from .pricing import usd
from .transcripts import decode, subagent

PERF_CACHE: dict[Path, tuple[float, dict[str, Any]]] = {}


def run_stats(path: Path, now: float) -> dict[str, Any]:
    """Full-transcript counters of one subagent run (cached on mtime)."""
    mtime = path.stat().st_mtime
    hit = PERF_CACHE.get(path)
    if hit and hit[0] == mtime:
        return hit[1]
    first = last = None
    tokens = tools = errors = 0
    cost = 0.0
    seen: set[str] = set()
    with path.open("rb") as fh:
        for line in fh:
            rec = decode(line)
            if not rec:
                continue
            ts = rec.get("timestamp")
            if ts:
                first = first or ts
                last = ts
            msg = rec.get("message") or {}
            content = msg.get("content")
            if rec.get("type") == "assistant":
                new = not msg.get("id") or msg["id"] not in seen  # one response spans several records
                seen.add(msg.get("id", ""))
                if new:
                    tokens += (msg.get("usage") or {}).get("output_tokens", 0) or 0
                    if msg.get("usage") and str(msg.get("model", "")).startswith("claude"):
                        cost += usd(msg["model"], msg["usage"])
                tools += sum(1 for c in content if isinstance(c, dict) and c.get("type") == "tool_use") if isinstance(content, list) else 0
            elif rec.get("type") == "user" and isinstance(content, list):
                errors += sum(1 for c in content if isinstance(c, dict) and c.get("type") == "tool_result" and c.get("is_error"))
    info = subagent(path, now)
    span = 0.0
    if first and last:
        try:
            span = (datetime.fromisoformat(last.replace("Z", "+00:00")) - datetime.fromisoformat(first.replace("Z", "+00:00"))).total_seconds()
        except ValueError:
            pass
    stats = {"type": info["type"], "status": info["status"], "tokens": tokens, "tools": tools, "errors": errors, "seconds": round(span), "cost": cost}
    PERF_CACHE[path] = (mtime, stats)
    return stats


def perf(days: float) -> dict[str, Any]:
    """Aggregate subagent runs of the last `days` per agent type (excluded projects skipped)."""
    now = time.time()
    step = 3600 if days <= 1 else 86_400  # activity histogram: hours over 24 h, days beyond
    buckets = max(1, round(days * 86_400 / step))
    by_type: dict[str, dict[str, Any]] = {}
    for project in PROJECTS.iterdir() if PROJECTS.exists() else []:
        if not project.is_dir() or any(x in project.name for x in EXCLUDED):
            continue
        for path in project.glob("*/subagents/agent-*.jsonl"):
            if now - path.stat().st_mtime > days * 86_400:
                continue
            s = run_stats(path, now)
            agg = by_type.setdefault(s["type"], {"type": s["type"], "runs": 0, "done": 0, "gone": 0, "active": 0,
                                                 "tokens": 0, "tools": 0, "errors": 0, "seconds": 0, "cost": 0.0, "daily": [0] * buckets})
            agg["runs"] += 1
            agg["daily"][buckets - 1 - min(buckets - 1, int((now - path.stat().st_mtime) // step))] += 1  # oldest → today
            agg["done" if s["status"] == "done" else "gone" if s["status"] == "gone" else "active"] += 1
            for k in ("tokens", "tools", "errors", "seconds", "cost"):
                agg[k] += s[k]
    return {"days": days, "bucket": step, "types": sorted(by_type.values(), key=lambda a: -a["runs"])}
