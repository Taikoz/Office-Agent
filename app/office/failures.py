"""ChiefOS → 🧭 Process → Échecs: why the missions that went wrong went wrong (read-only, local).

A mission went wrong when it was blocked or abandoned, went round in circles, ended with red tests, or its MR's CI
broke. Its cause is guessed from what it left behind, first match wins: a permission refused, a vague ticket (questions
to the chief, a low readiness score), an unstable test (red then green with no edit), the environment (a missing
module or command, the network, a timeout), missing context (files or symbols not found, much reading for little
editing), a loop. Each cause comes with what to do, a count per week, and the missions with their evidence.
"""

from __future__ import annotations

import re
import time
from collections import Counter
from typing import Any

from . import usage

DAYS = 28
READONLY = {"Explore", "Plan", "mr-reviewer", "security-auditor", "audit-security-code", "claude-code-guide", "statusline-setup"}  # reading a lot is their job
SHELL = re.compile(r"\(eval\):\d+: (no such file or directory|command not found): \S+ -|exit code 127", re.I)
ENV = re.compile(r"no module named|modulenotfound|command not found|cannot find module|not installed|econnrefused|connection refused|"
                 r"network|could not resolve|ssl|timed? ?out|timeout|docker|npm err|pip.*error|permission denied \(publickey\)", re.I)
CONTEXT = re.compile(r"no such file|does not exist|file not found|not found in|unknown (column|field|attribute)|has no attribute|"
                     r"is not defined|cannot find name|undefined|old_string.*not found|string to replace not found", re.I)
CAUSES = {
    "permission": ("🔒 Permission refusée", "Ajouter la règle qui manque (onglet Permissions) ou donner la consigne d'éviter cette action dans la fiche de l'agent."),
    "ticket": ("❓ Ticket flou", "Compléter le ticket avant de lancer (onglet Tickets : critères d'acceptation, repro, projet)."),
    "flaky": ("🎲 Test instable", "Isoler le test instable (retry, données fixes) ou l'écrire dans les leçons pour que l'agent relance avant de conclure."),
    "shell": ("🐚 Commande mal lancée", "Sous zsh, une variable qui contient une commande ($GL …) ne se lance pas : appeler le chemin complet ou une fonction. À écrire dans une leçon ou le CLAUDE.md."),
    "env": ("🧰 Environnement", "Documenter l'installation dans le CLAUDE.md du dépôt (dépendances, commandes, réseau) ou dans une leçon."),
    "context": ("🧭 Contexte manquant", "Donner à l'agent les chemins / symboles dans la mission, ou un CLAUDE.md de dépôt qui décrit l'architecture."),
    "ci": ("🚦 CI rouge", "Faire lancer à l'agent les mêmes jobs que la CI en local (lint, types, tests) avant de pousser."),
    "loop": ("🌀 Tourne en rond", "Découper la mission ou lui fixer une condition d'arrêt (au bout de N essais : demander au chef)."),
    "other": ("❔ Autre", "Ouvrir la mission (clic) pour voir la dernière erreur."),
}


def _bad(r: dict[str, Any], red_mrs: set[str]) -> str:
    """Why this run counts as gone wrong ("" when it went fine)."""
    if r["status"] in ("blocked", "gone"):
        return "bloquée" if r["status"] == "blocked" else "abandonnée"
    if r["loop"] and r["type"] not in READONLY:
        return "a tourné en rond"
    if r.get("mr") in red_mrs:
        return "CI rouge"
    if r["status"] == "done" and (r.get("testsEnd") or {}).get("ok") is False:
        return "finie tests rouges"
    return ""


def classify(r: dict[str, Any], readiness_of: dict[str, int], red_mrs: set[str]) -> tuple[str, str]:
    """(cause, evidence) of a run gone wrong."""
    u = r["usage"]
    errs = " ".join(e[1] for e in u.get("errors") or []) + " " + (r.get("lastError") or "")
    if u.get("denials"):
        d = u["denials"][-1]
        return "permission", f"{'mode auto' if d['kind'] == 'auto' else 'refusée par toi'}{' [' + d['reason'] + ']' if d['reason'] else ''} : {d['prefix'] or d['tool']}"
    score = readiness_of.get(r["ticket"] or "")
    if (r.get("asks") or 0) >= 2 or (r["status"] == "blocked" and r.get("asks")) or (score is not None and score < 40):
        return "ticket", f"{r.get('asks') or 0} question(s) au chef" + (f", ticket noté {score}/100" if score is not None else "")
    if u.get("flaky"):
        return "flaky", f"rouge puis vert sans modification : {u['flaky'][0]}"
    m = SHELL.search(errs)
    if m:
        return "shell", _around(errs, m)
    m = ENV.search(errs)
    if m:
        return "env", _around(errs, m)
    if r.get("mr") in red_mrs:
        return "ci", "la CI de la MR a cassé"
    m = CONTEXT.search(errs)
    if m:
        return "context", _around(errs, m)
    if (u.get("reads") or 0) >= 15 and (u.get("edits") or 0) <= 1 and r["type"] not in ("Explore", "mr-reviewer", "security-auditor", "audit-security-code", "Plan"):
        return "context", f"{u['reads']} lectures pour {u['edits']} modification(s)"
    if r["loop"] and r["type"] not in READONLY:
        return "loop", "≥ 30 outils sans modif ni test"
    return "other", (r.get("lastError") or errs.strip())[:160]


def _around(text: str, m: re.Match[str]) -> str:
    return re.sub(r"\s+", " ", text[max(0, m.start() - 60):m.end() + 80]).strip()[:180]


def failures(game: Any, readiness_of: dict[str, int] | None = None, days: float = DAYS) -> dict[str, Any]:
    from . import lessons
    red = {b["mr"] for b in lessons._harvest.get("ci", [])}
    runs = usage.agent_runs(game, days)
    now = time.time()
    weeks = [now - (k + 1) * 7 * 86_400 for k in range(int(days // 7))][::-1]
    per_week = [{"start": w, "runs": 0, "bad": 0, "causes": Counter()} for w in weeks]
    items, counts = [], Counter()
    for r in runs:
        week = next((w for w in reversed(per_week) if (r["last"] or 0) >= w["start"]), None)
        if week:
            week["runs"] += 1
        why = _bad(r, red)
        if not why or r["status"] in ("working", "asking"):
            continue
        cause, evidence = classify(r, readiness_of or {}, red)
        counts[cause] += 1
        if week:
            week["bad"] += 1
            week["causes"][cause] += 1
        items.append({"id": r["id"], "session": r["session"], "type": r["type"], "ticket": r["ticket"], "description": (r["description"] or "")[:140],
                      "project": (r["repos"] or [r["project"]])[0], "at": r["last"], "why": why, "cause": cause, "evidence": evidence, "mr": r["mr"]})
    return {"days": days, "runs": len(runs), "bad": len(items),
            "causes": [{"cause": k, "label": CAUSES[k][0], "advice": CAUSES[k][1], "n": n} for k, n in counts.most_common()],
            "weeks": [{"start": w["start"], "runs": w["runs"], "bad": w["bad"], "causes": dict(w["causes"])} for w in per_week],
            "items": sorted(items, key=lambda i: -(i["at"] or 0))[:60], "labels": {k: v[0] for k, v in CAUSES.items()}}
