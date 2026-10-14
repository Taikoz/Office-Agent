#!/usr/bin/env python3
"""Ask the user a question through Agent Office and wait for the answer chosen in the UI.

    ask.py "Question ?" --option "Choix A" --option "Choix B" [--context "…"] [--from "ABC-123 build"]
    ask.py --wait <id>

Prints `ANSWER: <text>` (exit 0) once answered, or `NO_ANSWER_YET` with the `--wait` command (exit 2).
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import subprocess
import sys
import time
from pathlib import Path

QUESTIONS = Path.home() / ".claude" / "agent-office" / "questions"
HERE = Path(__file__).resolve().parent


def write(path: Path, data: dict) -> None:
    """Write a question file atomically, readable by the user only."""
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False))
    os.chmod(tmp, 0o600)
    tmp.replace(path)


def create(args: argparse.Namespace) -> str:
    """Store a new pending question and return its id."""
    QUESTIONS.mkdir(parents=True, exist_ok=True)
    qid = f"{time.strftime('%Y%m%d-%H%M%S')}-{secrets.token_hex(3)}"
    write(QUESTIONS / f"{qid}.json", {
        "id": qid,
        "question": args.question.strip()[:1000],
        "options": [o.strip()[:200] for o in args.option if o.strip()][:6],
        "context": (args.context or "").strip()[:1000],
        "from": (args.sender or "").strip()[:80],
        "cwd": os.getcwd(),
        "created": time.time(),
    })
    # The user can only answer if the office is up: start it (and open it) when needed.
    subprocess.run([sys.executable, "-I", str(HERE.parent / "bin" / "office.py"), "ensure"], check=False, timeout=20)
    return qid


def wait(qid: str, timeout: float) -> int:
    """Poll the question file until the UI writes an answer or the timeout expires."""
    path = QUESTIONS / f"{qid}.json"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            data = json.loads(path.read_text())
        except (OSError, ValueError):
            print(f"ERROR: question {qid} introuvable")
            return 1
        if data.get("answer") is not None:
            print(f"ANSWER: {data['answer']}")
            return 0
        time.sleep(2)
    print(f"NO_ANSWER_YET id={qid} — pour attendre encore : python3 -I {Path(__file__).resolve()} --wait {qid}")
    return 2


def main() -> int:
    """Parse arguments, then create and/or wait for a question."""
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("question", nargs="?")
    parser.add_argument("--option", action="append", default=[], help="Choix proposé (répéter, 2 à 4 conseillé)")
    parser.add_argument("--context", help="1-2 lignes : ticket, pourquoi ça bloque")
    parser.add_argument("--from", dest="sender", help="Qui demande, ex. 'ABC-123 build'")
    parser.add_argument("--wait", dest="wait_id", help="Attendre la réponse d'une question existante")
    parser.add_argument("--timeout", type=float, default=540, help="Secondes d'attente (défaut 540)")
    args = parser.parse_args()
    if args.wait_id:
        if not args.wait_id.replace("-", "").isalnum():
            parser.error("id invalide")
        return wait(args.wait_id, args.timeout)
    if not args.question or not args.question.strip():
        parser.error("question manquante")
    return wait(create(args), args.timeout)


if __name__ == "__main__":
    sys.exit(main())
