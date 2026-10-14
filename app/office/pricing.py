"""API list prices ($ per million tokens) to estimate what a transcript would cost on the Claude API.

Claude Code on a subscription is not billed per token: this is an API-equivalent estimate, not an invoice.
Cache writes are counted at 1.25x input (5-minute cache); cache reads at the published read price.
"""

from __future__ import annotations

from typing import Any

# model id prefix -> (input, output, cache read); source: claude-api skill, prices cached 2026-10-06
PRICES: list[tuple[str, tuple[float, float, float]]] = [
    ("claude-fable-5", (10.0, 50.0, 0.25)),
    ("claude-mythos-5", (10.0, 50.0, 0.25)),
    ("claude-opus-5-5", (4.0, 20.0, 0.20)),
    ("claude-opus-5", (5.0, 25.0, 0.50)),
    ("claude-opus-4", (5.0, 25.0, 0.50)),
    ("claude-sonnet-5", (2.0, 10.0, 0.20)),
    ("claude-sonnet-4", (3.0, 15.0, 0.30)),
    ("claude-haiku-5", (0.10, 0.50, 0.01)),
    ("claude-haiku-4", (1.0, 5.0, 0.10)),
]
FALLBACK = (4.0, 20.0, 0.20)  # unknown model: priced as the default Opus


def usd(model: str, usage: dict[str, Any]) -> float:
    """Estimated $ of one API response from its usage block."""
    price_in, price_out, price_read = next((p for prefix, p in PRICES if model.startswith(prefix)), FALLBACK)
    tokens = lambda k: usage.get(k, 0) or 0  # noqa: E731
    return (tokens("input_tokens") * price_in + tokens("cache_creation_input_tokens") * price_in * 1.25
            + tokens("cache_read_input_tokens") * price_read + tokens("output_tokens") * price_out) / 1_000_000
