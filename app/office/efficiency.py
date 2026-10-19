"""ChiefOS → 🧭 Process → Contexte and Modèles: where the context goes, and which model each agent needs (read-only).

Context, per agent type (a main session counts as its `--agent`, else "session principale"): the cache's share of the
input (a low one re-sends the same context at full price), files read again whole, tool outputs over usage.BIG, the
compactions (the context overflowed), with the worst commands and files and what to do about each.

Models, per agent type: which model family did the work, how its missions ended and what they cost; the same tokens
priced on a cheaper family give the saving. A cheaper family already seen doing as well (MIN_RUNS runs, at most
10 points below) is a recommendation; for an agent that succeeds almost always on short missions, a trial.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from . import usage
from .failures import READONLY
from .pricing import usd

DAYS = 30
MIN_RUNS = 5
TIER = ["haiku", "sonnet", "opus", "fable"]  # cheaper first
REPRESENTATIVE = {"haiku": "claude-haiku-5-5", "sonnet": "claude-sonnet-5-5", "opus": "claude-opus-5-5", "fable": "claude-fable-5-1"}


def _who(s: dict[str, Any]) -> str:
    return s["agent"] or ("agent" if s["sub"] else "session principale")


def context(days: float = DAYS) -> dict[str, Any]:
    summs = usage.summaries(days)
    per: dict[str, dict[str, Any]] = {}
    big_by: dict[str, list[int]] = defaultdict(list)
    for s in summs:
        if not s["models"]:
            continue
        a = per.setdefault(_who(s), {"agent": _who(s), "runs": 0, "in": 0, "cw": 0, "cr": 0, "cost": 0.0, "rereads": 0, "reads": 0, "big": 0,
                                     "bigChars": 0, "outChars": 0, "compactions": 0, "compacted": 0})
        a["runs"] += 1
        for m in s["models"].values():
            a["in"] += m["in"]; a["cw"] += m["cw"]; a["cr"] += m["cr"]; a["cost"] += m["cost"]
        a["rereads"] += s["rereads"]; a["reads"] += s["reads"]; a["big"] += s["bigCount"]; a["outChars"] += s["outChars"]
        a["bigChars"] += sum(b[1] for b in s["big"]); a["compactions"] += s["compactions"]; a["compacted"] += s["compactions"] > 0
        for b in s["big"]:
            big_by[b[0]].append(b[1])
    out = []
    for a in per.values():
        inp = a["in"] + a["cw"] + a["cr"]
        hit = round(100 * a["cr"] / inp) if inp else None
        tips = []
        if hit is not None and hit < 60 and a["runs"] >= 3:
            tips.append(f"Cache à {hit} % : des missions courtes ou un début de prompt qui change à chaque fois (date, ids) coûtent plein tarif. Mettre la partie fixe en tête du prompt.")
        if a["rereads"] >= 2 * a["runs"] and a["rereads"] >= 5:
            tips.append(f"{a['rereads']} relectures entières de fichiers déjà lus : demander de lire par morceaux (offset / limit) ou de garder des notes.")
        if a["big"] >= a["runs"] and a["big"] >= 3:
            tips.append(f"{a['big']} sorties d'outil de plus de {usage.BIG // 1000}k caractères : filtrer (head, grep, --stat, -q) avant d'afficher.")
        if a["compacted"]:
            tips.append(f"Contexte saturé {a['compactions']} fois sur {a['compacted']} mission(s) : missions trop longues, à découper.")
        out.append({**{k: v for k, v in a.items() if k not in ("in", "cw", "cr")}, "cost": round(a["cost"], 2), "cacheHit": hit,
                    "tokensIn": inp, "rereadsPerRun": round(a["rereads"] / a["runs"], 1), "bigPerRun": round(a["big"] / a["runs"], 1), "tips": tips})
    out.sort(key=lambda a: -a["cost"])
    worst = sorted(((k, len(v), sum(v) // len(v)) for k, v in big_by.items()), key=lambda x: -x[1] * x[2])[:12]
    return {"days": days, "agents": out, "bigOutputs": [{"what": k, "n": n, "avgChars": avg} for k, n, avg in worst], "bigLimit": usage.BIG,
            "transcripts": len(summs)}


def _price(tokens: dict[str, float], fam: str) -> float:
    return usd(REPRESENTATIVE[fam], {"input_tokens": tokens["in"], "cache_creation_input_tokens": tokens["cw"], "cache_read_input_tokens": tokens["cr"], "output_tokens": tokens["out"]})


def models(game: Any, days: float = DAYS) -> dict[str, Any]:
    runs = usage.agent_runs(game, days)
    per: dict[str, dict[str, Any]] = {}
    for r in runs:
        u = r["usage"]
        if not u["models"]:
            continue
        fam = usage.main_family(u)
        a = per.setdefault(r["type"], {"agent": r["type"], "fams": {}})
        f = a["fams"].setdefault(fam, {"family": fam, "runs": 0, "done": 0, "cost": 0.0, "tokens": {"in": 0, "cw": 0, "cr": 0, "out": 0}, "tools": 0, "errors": 0})
        f["runs"] += 1
        f["done"] += r["status"] == "done" and not (r["loop"] and r["type"] not in READONLY)
        f["cost"] += usage.cost(u)
        f["tools"] += u["tools"]
        f["errors"] += r["errors"] or 0
        for m in u["models"].values():
            for k in ("in", "cw", "cr", "out"):
                f["tokens"][k] += m[k]
    out, total_saving = [], 0.0
    for a in per.values():
        fams = sorted(a["fams"].values(), key=lambda f: -f["runs"])
        for f in fams:
            f["rate"] = round(100 * f["done"] / f["runs"]); f["cost"] = round(f["cost"], 2); f["avgCost"] = round(f["cost"] / f["runs"], 2)
            f["avgTools"] = round(f["tools"] / f["runs"])
        main = fams[0]
        advice = None
        if main["family"] in TIER:
            cheaper = TIER[:TIER.index(main["family"])]
            for fam in reversed(cheaper):  # the closest cheaper family first
                seen = next((f for f in fams if f["family"] == fam), None)
                saving = main["cost"] - _price(main["tokens"], fam)
                if seen and seen["runs"] >= MIN_RUNS and main["runs"] >= MIN_RUNS and seen["rate"] >= main["rate"] - 10:
                    advice = {"kind": "switch", "family": fam, "saving": round(saving, 2),
                              "text": f"{fam} fait aussi bien ({seen['rate']} % sur {seen['runs']} missions contre {main['rate']} %) : passer `model: {fam}` dans la fiche de l'agent."}
                    break
                if not seen and main["runs"] >= MIN_RUNS and main["rate"] >= 85 and main["avgTools"] <= 40 and saving >= 0.5:
                    advice = {"kind": "try", "family": fam, "saving": round(saving, 2),
                              "text": f"Réussit {main['rate']} % du temps sur des missions courtes ({main['avgTools']} outils en moyenne) : essayer `model: {fam}` sur quelques missions."}
                    break
            if main["rate"] < 60 and main["runs"] >= MIN_RUNS and main["family"] != TIER[-1] and not advice:
                up = TIER[TIER.index(main["family"]) + 1]
                advice = {"kind": "up", "family": up, "saving": 0, "text": f"Ne réussit que {main['rate']} % du temps : un modèle plus fort ({up}) coûterait plus mais pourrait éviter les relances."}
        if advice and advice["saving"] > 0:
            total_saving += advice["saving"]
        out.append({"agent": a["agent"], "families": fams, "advice": advice, "runs": sum(f["runs"] for f in fams)})
    out.sort(key=lambda a: -(a["advice"] or {}).get("saving", 0) * 1000 - a["runs"])
    for a in out:
        for f in a["families"]:
            f.pop("tokens", None)
    return {"days": days, "agents": out, "saving": round(total_saving, 2), "minRuns": MIN_RUNS}
