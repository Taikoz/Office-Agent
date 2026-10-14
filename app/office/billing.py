"""How Claude Code is billed here: per token (API key) or by subscription (claude.ai login).

Budgets per mission only make sense when tokens are billed. Read-only: ~/.claude.json (billing fields only),
~/.claude/settings.json (apiKeyHelper) and the environment; no secret is read or returned.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

CLAUDE_JSON = Path.home() / ".claude.json"
SETTINGS = Path.home() / ".claude" / "settings.json"


def _json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def billing() -> dict[str, Any]:
    """{"mode": "api" | "subscription", "label": human reason}; extra usage on a subscription is billed per token."""
    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN") or "apiKeyHelper" in _json(SETTINGS):
        return {"mode": "api", "label": "clé API : facturation au token"}
    account = _json(CLAUDE_JSON).get("oauthAccount") or {}
    kind = str(account.get("billingType") or "")
    if "subscription" in kind:
        if account.get("hasExtraUsageEnabled"):
            return {"mode": "api", "label": "abonnement avec usage supplémentaire facturé au token"}
        return {"mode": "subscription", "label": f"abonnement Claude ({account.get('organizationType') or kind}) : pas de facturation au token"}
    return {"mode": "api", "label": "mode de facturation inconnu : budgets actifs par prudence"}
