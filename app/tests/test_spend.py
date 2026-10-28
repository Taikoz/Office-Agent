"""ChiefOS → 💸 Coûts, the spending of every transcript (stdlib only): python3 -I -m unittest discover -s tests"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from office import spend  # noqa: E402

NOW = 1_800_000_000.0
DAY = 86_400


def summ(cost_models: dict, last: float, sub: bool = False, agent: str = "", project: str = "front", desc: str = "") -> dict:
    return {"models": cost_models, "last": last, "sub": sub, "agent": agent, "project": project, "description": desc, "id": f"x{last}", "session": "s", "ticket": None}


def model(cost: float, inp: int = 0, cw: int = 0, cr: int = 0, out: int = 0) -> dict:
    return {"cost": cost, "calls": 1, "in": inp, "cw": cw, "cr": cr, "out": out}


class SpendTest(unittest.TestCase):
    def test_totals_split_trend_and_projection(self) -> None:
        items = [summ({"claude-opus-5-5": model(3.0)}, NOW - 1 * DAY),
                 summ({"claude-sonnet-5-5": model(1.0)}, NOW - 2 * DAY, sub=True, agent="feature-builder"),
                 summ({"claude-opus-5-5": model(2.0)}, NOW - 10 * DAY)]  # the period before
        s = spend.spend(7, items, now=NOW)
        self.assertEqual((s["total"], s["main"], s["sub"], s["previous"]), (4.0, 3.0, 1.0, 2.0))
        self.assertEqual(s["transcripts"], 2)
        self.assertEqual([d["main"] + d["sub"] for d in s["daily"]], [1.0, 3.0])
        self.assertEqual([f["family"] for f in s["families"]], ["opus", "sonnet"])
        self.assertEqual({a["key"] for a in s["agents"]}, {"session principale", "feature-builder"})
        self.assertAlmostEqual(s["projection30"], round(4.0 / 3 * 30, 2))  # 3 days of history, not 7
        self.assertFalse(s["previousComplete"])  # the oldest transcript is 10 days old: the 7 days before (8 to 14 days ago) are partial
        older = spend.spend(7, [*items, summ({"claude-opus-5-5": model(0.5)}, NOW - 20 * DAY)], now=NOW)
        self.assertTrue(older["previousComplete"])


    def test_tokens_and_cache_saving(self) -> None:
        # opus 5.5: input $4, cache read $0.20 per million: 1M tokens read from the cache saved $3.80
        s = spend.spend(30, [summ({"claude-opus-5-5": model(1.0, inp=1_000_000, cr=1_000_000, out=0)}, NOW - DAY)], now=NOW)
        self.assertEqual(s["tokens"]["cr"], {"tokens": 1_000_000, "cost": 0.2})
        self.assertEqual(s["tokens"]["in"]["cost"], 4.0)
        self.assertEqual(s["saved"], 3.8)

    def test_empty_period(self) -> None:
        s = spend.spend(30, [], now=NOW)
        self.assertEqual((s["total"], s["daily"], s["top"], s["projection30"]), (0, [], [], 0))


if __name__ == "__main__":
    unittest.main()
