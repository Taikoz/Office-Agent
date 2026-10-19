"""ChiefOS → 🧭 Process → MMX: the memory's housekeeping (read-only, proposals on the user's click).

- duplicates: two active entries saying nearly the same thing (shared words, shared tags);
- to read together: two entries on the same subject, one forbidding what the other seems to allow (a possible
  contradiction, never decided here);
- never found: entries no `mmx.py search` / `show` of the last DAYS returned (from the transcripts), older than
  MIN_AGE days and not priority 5 (those are read on purpose);
- stale: projects and facts not updated for STALE_DAYS.
"Proposer l'archivage" adds an `archive` proposal (pending, `before` = the exact entry) to staging/PROPOSALS.json, checks
it with `mmx.py validate` and takes it back if it fails; it is applied only once validated in the office's MMX cabinet
(mmx.py approve + apply), as for any proposal. Nothing in memory/ is ever written here.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import threading
from collections import Counter
from datetime import date, datetime
from itertools import combinations
from typing import Any

from . import config, usage

DAYS = 60
MIN_AGE = 30
STALE_DAYS = 120
STOP = set("""avec dans pour plus sans sous vers chez cette ces les des une est sont fait faire peut doit être avoir tout tous toute
toutes même aussi mais donc comme quand alors entre selon depuis leur leurs elle elles ils nous vous qui que quoi dont où the and for with
from this that are was have has not jamais toujours""".split())
NEGATION = re.compile(r"\bjamais\b|\bne\s+\w+\s+(pas|plus|jamais)\b|\binterdit\b|\bpas de\b|\bnever\b|\bdon't\b|\bdo not\b|\bnot\b|\bsans\b", re.I)
WORD = re.compile(r"[a-zà-ÿ0-9][a-zà-ÿ0-9_.-]{3,}")
_lock = threading.Lock()


def _words(text: str) -> set[str]:
    return {w.strip(".-") for w in WORD.findall(text.lower()) if w not in STOP}


def _jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b) if a and b else 0.0


def _entries() -> list[dict[str, Any]]:
    """The active entries, complete (as in their module file)."""
    from .mmx import mmx_files
    out = []
    for mod, path in mmx_files().items():
        if mod == "MOD-ARCHIVE":
            continue
        try:
            entries = json.loads(path.read_text(encoding="utf-8")).get("entries", [])
        except (OSError, ValueError):
            continue
        out += [{**e, "_module": mod} for e in entries if isinstance(e, dict) and e.get("st", "active") == "active"]
    return out


def _age(day: Any) -> int | None:
    try:
        return (date.today() - date.fromisoformat(str(day))).days
    except ValueError:
        return None


def hygiene(days: float = DAYS) -> dict[str, Any]:
    if config.MMX is None:
        return {"enabled": False}
    entries = _entries()
    hits: Counter[str] = Counter()
    searches = 0
    for s in usage.summaries(days):
        hits.update(s.get("mmx") or [])
        searches += bool(s.get("mmx"))
    short = lambda e: {"id": e["id"], "d": e.get("d", ""), "t": e.get("t"), "p": e.get("p"), "tags": e.get("tags") or [], "updated": e.get("updated")}  # noqa: E731
    words = {e["id"]: _words(f"{e.get('d', '')} {' '.join(e.get('tags') or [])}") for e in entries}
    dupes, together = [], []
    for a, b in combinations(entries, 2):
        sim = _jaccard(words[a["id"]], words[b["id"]])
        shared = set(a.get("tags") or []) & set(b.get("tags") or [])
        if sim >= 0.5 or (sim >= 0.35 and len(shared) >= 2):
            dupes.append({"a": short(a), "b": short(b), "sim": round(sim * 100)})
        elif len(shared) >= 2 and sim >= 0.22 and bool(NEGATION.search(a.get("d", ""))) != bool(NEGATION.search(b.get("d", ""))):
            together.append({"a": short(a), "b": short(b), "sim": round(sim * 100), "tags": sorted(shared)})
    never, stale = [], []
    for e in entries:
        age = _age(e.get("created"))
        if not hits[e["id"]] and (e.get("p") or 3) < 5 and age is not None and age >= MIN_AGE:
            never.append({**short(e), "age": age})
        upd = _age(e.get("updated") or e.get("created"))
        if e.get("t") in ("project", "fact", "goal") and upd is not None and upd >= STALE_DAYS:
            stale.append({**short(e), "age": upd})
    pending = {p.get("target_id") for p in _proposals() if p.get("status") in ("pending", "approved")}
    return {"enabled": True, "days": days, "entries": len(entries), "searches": searches, "hits": dict(hits.most_common(10)),
            "duplicates": sorted(dupes, key=lambda d: -d["sim"])[:20], "together": together[:12], "never": never[:30], "stale": stale[:20],
            "pending": sorted(x for x in pending if x)}


def _proposals_path():
    return config.MMX / "staging" / "PROPOSALS.json"


def _proposals() -> list[dict[str, Any]]:
    try:
        data = json.loads(_proposals_path().read_text(encoding="utf-8"))
        return [p for p in data.get("proposals", []) if isinstance(p, dict)]
    except (OSError, ValueError, AttributeError):
        return []


def propose_archive(entry_id: str, reason: str) -> dict[str, Any]:
    """Add a pending `archive` proposal for one active entry, then `mmx.py validate`; a failure takes it back."""
    if config.MMX is None:
        return {"ok": False, "error": "MMX non configuré"}
    if not re.fullmatch(r"[A-Z]{3,4}-\d{4}", entry_id):
        return {"ok": False, "error": "id invalide"}
    with _lock:
        entry = next((e for e in _entries() if e["id"] == entry_id), None)
        if entry is None:
            return {"ok": False, "error": "entrée introuvable ou déjà archivée"}
        path = _proposals_path()
        raw = path.read_text(encoding="utf-8") if path.exists() else '{"proposals": []}'
        data = json.loads(raw)
        props = data.setdefault("proposals", [])
        if any(p.get("target_id") == entry_id and p.get("status") in ("pending", "approved") for p in props):
            return {"ok": False, "error": "une proposition attend déjà sur cette entrée"}
        n = max((int(m.group(1)) for p in props if (m := re.fullmatch(r"PR-(\d{4})", str(p.get("proposal_id", ""))))), default=0) + 1
        before = {k: v for k, v in entry.items() if k != "_module"}
        props.append({"proposal_id": f"PR-{n:04d}", "op": "archive", "target_id": entry_id, "reason": reason[:300], "before": before, "after": None,
                      "impact": [str(json.loads((config.MMX / "INDEX.json").read_text(encoding="utf-8"))["modules"].get(entry["_module"], "")), "archive/ARCHIVE.json", "INDEX.json", "logs/CHANGELOG.md"],
                      "risk": "faible", "status": "pending", "created": date.today().isoformat(), "decided": None, "applied": None})
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        try:
            run = subprocess.run([sys.executable, "-I", str(config.MMX / "tools" / "mmx.py"), "validate"], cwd=config.MMX, capture_output=True, text=True, timeout=60)
            ok, out = run.returncode == 0, (run.stdout + run.stderr).strip()
        except (OSError, subprocess.SubprocessError) as err:
            ok, out = False, str(err)
        if not ok:
            path.write_text(raw, encoding="utf-8")  # back as it was
            return {"ok": False, "error": f"mmx.py validate a refusé : {out[-400:]}"}
    return {"ok": True, "proposal": f"PR-{n:04d}", "at": datetime.now().isoformat(timespec="seconds")}
