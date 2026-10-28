"""ChiefOS → 💸 Coûts: where the money goes, every transcript included (main sessions and subagents), read-only.

From usage.summaries() (one cached summary per transcript, its tokens and estimated cost per model):
  - the total of the period and of the period before it (the trend, only when the transcripts reach back that far:
    Claude Code deletes old ones), the daily average and a 30-day projection;
  - per day, split between main sessions and subagents; a transcript counts on the day of its last activity
    (a summary is per transcript, not per message: a session across midnight lands on its last day);
  - per model family (haiku, sonnet, opus, fable): cost, calls and tokens;
  - per kind of token (input, cache written, cache read, output) with its cost, and what the cache saved: the tokens
    read from the cache priced as plain input, minus what they cost;
  - per project and per agent (a main session is « session principale », or its --agent);
  - the most expensive transcripts, with what they were about.

Every price is an API-equivalent estimate (pricing.py), not an invoice: on a subscription nothing is billed per token.
"""

from __future__ import annotations

import time
from collections import defaultdict
from datetime import datetime
from typing import Any

from . import usage
from .pricing import FALLBACK, PRICES

FAMILIES = ["haiku", "sonnet", "opus", "fable"]


def _prices(model: str) -> tuple[float, float, float]:
    return next((p for prefix, p in PRICES if model.startswith(prefix)), FALLBACK)


def _day(t: float) -> str:
    return datetime.fromtimestamp(t).strftime("%Y-%m-%d")


def spend(days: float = 30, items: list[dict[str, Any]] | None = None, now: float | None = None) -> dict[str, Any]:
    """The spending of the last `days` (see the module's docstring); items: summaries, for the tests."""
    now = now or time.time()
    days = max(1.0, min(90.0, float(days)))
    items = usage.summaries(days * 2) if items is None else items
    start, before = now - days * 86_400, now - 2 * days * 86_400
    cur = [s for s in items if s["models"] and (s.get("last") or 0) >= start]
    prev_cost = sum(usage.cost(s) for s in items if s["models"] and before <= (s.get("last") or 0) < start)
    # Claude Code deletes old transcripts (cleanupPeriodDays, 30 by default): the period before is complete only when
    # some transcript is at least as old as its start, else its total is a floor and the trend would mislead
    oldest = min((s.get("first") or s.get("last") or now for s in items), default=now)
    previous_complete = oldest <= before + 86_400

    per_day: dict[str, dict[str, float]] = {}
    fams: dict[str, dict[str, float]] = {}
    tokens = {"in": [0, 0.0], "cw": [0, 0.0], "cr": [0, 0.0], "out": [0, 0.0]}  # kind → [tokens, $]
    saved = 0.0
    projects: dict[str, dict[str, Any]] = defaultdict(lambda: {"cost": 0.0, "runs": 0})
    agents: dict[str, dict[str, Any]] = defaultdict(lambda: {"cost": 0.0, "runs": 0})
    top = []
    total = main = 0.0
    for s in cur:
        c = usage.cost(s)
        total += c
        main += 0 if s["sub"] else c
        d = per_day.setdefault(_day(s["last"]), {"main": 0.0, "sub": 0.0})
        d["sub" if s["sub"] else "main"] += c
        for model, m in s["models"].items():
            f = fams.setdefault(usage.family(model), {"cost": 0.0, "calls": 0, "in": 0, "cw": 0, "cr": 0, "out": 0})
            f["cost"] += m["cost"]
            f["calls"] += m["calls"]
            p_in, p_out, p_read = _prices(model)
            for k, price in (("in", p_in), ("cw", p_in * 1.25), ("cr", p_read), ("out", p_out)):
                f[k] += m[k]
                tokens[k][0] += m[k]
                tokens[k][1] += m[k] * price / 1e6
            saved += m["cr"] * (p_in - p_read) / 1e6
        who = s["agent"] or ("agent" if s["sub"] else "session principale")
        for key, bucket in ((s["project"] or "?", projects), (who, agents)):
            bucket[key]["cost"] += c
            bucket[key]["runs"] += 1
        top.append({"cost": round(c, 2), "sub": s["sub"], "agent": who, "project": s["project"], "ticket": s.get("ticket"),
                    "description": s.get("description") or "", "last": s["last"], "id": s["id"], "session": s["session"]})

    active = len(per_day)
    first_day = min((s["last"] for s in cur), default=now)
    span = max(1.0, min(days, (now - first_day) / 86_400 + 1))
    rnd = lambda v: round(v, 2)  # noqa: E731
    ranked = lambda b: sorted(({"key": k, "cost": rnd(v["cost"]), "runs": v["runs"]} for k, v in b.items()), key=lambda x: -x["cost"])  # noqa: E731
    return {
        "days": days,
        "total": rnd(total), "previous": rnd(prev_cost), "previousComplete": previous_complete, "main": rnd(main), "sub": rnd(total - main),
        "transcripts": len(cur), "activeDays": active, "perDay": rnd(total / span), "projection30": rnd(total / span * 30),
        "saved": rnd(saved),
        "daily": [{"day": k, "main": rnd(v["main"]), "sub": rnd(v["sub"])} for k, v in sorted(per_day.items())],
        "families": sorted(({"family": k, **{x: (rnd(v) if x == "cost" else int(v)) for x, v in f.items()}} for k, f in fams.items()), key=lambda x: -x["cost"]),
        "tokens": {k: {"tokens": int(v[0]), "cost": rnd(v[1])} for k, v in tokens.items()},
        "projects": ranked(projects)[:20], "agents": ranked(agents)[:20],
        "top": sorted(top, key=lambda x: -x["cost"])[:15],
    }
