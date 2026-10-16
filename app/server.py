#!/usr/bin/env python3
"""Agent Office: local read-only server that turns Claude Code transcripts into a live office scene."""

from __future__ import annotations

import argparse
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I keeps the script dir off sys.path
from office.config import CFG  # noqa: E402
from office import net, schedules  # noqa: E402
from office.routes import make_handler  # noqa: E402
from office.tickets import TicketStates  # noqa: E402


def main() -> int:
    """Parse arguments and serve."""
    parser = argparse.ArgumentParser(description="Agent Office — bureau animé des agents Claude Code")
    parser.add_argument("--port", type=int, default=CFG["port"])
    parser.add_argument("--window", type=int, default=CFG["window_minutes"], help="Minutes d'activité affichées")
    parser.add_argument("--no-youtrack", action="store_true", help="Ne pas lire l'état des tickets dans YouTrack")
    args = parser.parse_args()
    handler = make_handler(args.window * 60, TicketStates(not args.no_youtrack))
    schedules.start()  # scheduled agents (ChiefOS → Planification)
    net.autostart()    # the office opened to the internal network, when asked (ChiefOS → Réseau)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Agent Office : http://127.0.0.1:{args.port}  (démo : /?demo=1)  — Ctrl+C pour arrêter")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
