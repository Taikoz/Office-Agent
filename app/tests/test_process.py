"""ChiefOS → 🧭 Process (stdlib only): python3 -I -m unittest discover -s tests"""

from __future__ import annotations

import json
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from office import agentversions, config, efficiency, failures, mmxhygiene, permissions, process, readiness, usage  # noqa: E402


def rec(kind: str, content: list, ts: str = "2026-10-19T10:00:00Z", **extra) -> dict:
    return {"type": kind, "timestamp": ts, "message": {"role": kind, "content": content, **extra}}


def use(tid: str, name: str, **inp) -> dict:
    return {"type": "tool_use", "id": tid, "name": name, "input": inp}


def result(tid: str, text: str = "ok", error: bool = False) -> dict:
    return {"type": "tool_result", "tool_use_id": tid, "is_error": error, "content": text}


class UsageTests(unittest.TestCase):
    def test_rule_prefix(self) -> None:
        self.assertEqual(usage.rule_prefix("git status --short"), "git status")
        self.assertEqual(usage.rule_prefix("python3 -I /x/tools/gl.py mr-get 12"), "python3 -I /x/tools/gl.py mr-get")
        self.assertEqual(usage.rule_prefix("python3 -c Q"), "")
        self.assertEqual(usage.rule_prefix("FOO=1 ls -la"), "ls")
        self.assertEqual(usage.rule_prefix("A units"), "")  # a word of a message, not a program
        self.assertEqual(usage.segments("cd /x && git log | head -3"), ["cd /x", "git log", "head -3"])

    def test_summarize(self) -> None:
        d = Path(tempfile.mkdtemp())
        sub = d / "proj" / "sess" / "subagents"
        sub.mkdir(parents=True)
        path = sub / "agent-a1.jsonl"
        (sub / "agent-a1.meta.json").write_text(json.dumps({"agentType": "feature-builder", "description": "Deliver APP-1234"}))
        lines = [
            rec("user", "Deliver APP-1234 please"),
            rec("assistant", [use("t1", "Read", file_path="/r/a.py")], model="claude-opus-5-5", id="m1", usage={"input_tokens": 10, "cache_read_input_tokens": 90, "output_tokens": 5}),
            rec("user", [result("t1", "x" * 25_000)]),
            rec("assistant", [use("t2", "Read", file_path="/r/a.py")], model="claude-opus-5-5", id="m2", usage={"output_tokens": 5}),
            rec("user", [result("t2")]),
            rec("assistant", [use("t3", "Bash", command="git commit -m 'x\n\nCo-Authored-By: Claude <noreply@anthropic.com>'")]),
            rec("user", [result("t3")]),
            rec("assistant", [use("t4", "Bash", command="git push")]),
            rec("user", [result("t4", "Permission for this action was denied by the Claude Code auto mode classifier. Reason: [Git Destructive]. If you", True)]),
            rec("assistant", [use("t5", "Bash", command="python3 -m pytest")]),
            rec("user", [result("t5", "1 failed, 2 passed", True)]),
            rec("assistant", [use("t6", "Bash", command="python3 -m pytest")]),
            rec("user", [result("t6", "3 passed")]),
            rec("assistant", [use("t7", "Bash", command="python3 -I tools/mmx.py search youtrack")]),
            rec("user", [result("t7", "FACT-0001 p3 … PREF-0004")]),
            rec("assistant", [use("t8", "Edit", file_path="/home/x/.claude/agents/mr-reviewer.md")]),
            rec("user", [result("t8")]),
            rec("assistant", [use("t9", "Bash", command="$GL mr-create --title x")]),
            rec("user", [result("t9", "https://gitlab.x/g/p/-/merge_requests/7")]),
        ]
        path.write_text("\n".join(json.dumps(x) for x in lines) + "\n")
        s = usage.summarize(path)
        self.assertEqual((s["agent"], s["ticket"], s["rereads"], s["bigCount"], s["edits"]), ("feature-builder", "APP-1234", 1, 1, 1))
        self.assertEqual(s["denials"][0]["reason"], "Git Destructive")
        self.assertEqual(len(s["attributions"]), 1)
        self.assertEqual(s["flaky"], ["python3 -m pytest"])
        self.assertEqual(sorted(s["mmx"]), ["FACT-0001", "PREF-0004"])
        self.assertEqual(s["agentEdits"][0][0], "mr-reviewer")
        self.assertEqual(s["mrCreated"], ["https://gitlab.x/g/p/-/merge_requests/7"])
        self.assertEqual(usage.main_family(s), "opus")


class PermissionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "settings.json").write_text(json.dumps({"theme": "dark", "permissions": {"allow": ["Bash(ls:*)"]}}))
        self.patches = [mock.patch.object(config, "HOME_CLAUDE", self.tmp), mock.patch.object(config, "STATE_DIR", self.tmp / "state")]
        for p in self.patches:
            p.start()

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def test_levels(self) -> None:
        for prefix, lv in [("git status", "read"), ("cat", "read"), ("git commit", "write"), ("git push", "risky"), ("git", "risky"), ("python3 -", "risky"),
                           ("python3 -I tools/gl.py mr-get", "read"), ("python3 -I tools/gl.py mr-create", "risky"), ("find", "risky"), ("docker compose", "risky")]:
            self.assertEqual(permissions.level(prefix), lv, prefix)
        self.assertTrue(permissions._covered("ls -la", ["Bash(ls:*)"]))
        self.assertFalse(permissions._covered("lsof", ["Bash(ls:*)"]))

    def test_add_and_remove(self) -> None:
        self.assertFalse(permissions.add("Bash(git push:*)")["ok"])
        self.assertTrue(permissions.add("Bash(git commit:*)")["confirm"])
        self.assertTrue(permissions.add("Bash(git status:*)")["ok"])
        self.assertTrue(permissions.add("Bash(git commit:*)", confirm=True)["ok"])
        data = json.loads((self.tmp / "settings.json").read_text())
        self.assertEqual(data["theme"], "dark")
        self.assertEqual(data["permissions"]["allow"], ["Bash(ls:*)", "Bash(git status:*)", "Bash(git commit:*)"])
        self.assertTrue((self.tmp / "settings.json.office-bak").exists())
        self.assertFalse(permissions.remove("Bash(ls:*)")["ok"])  # not added by the office
        self.assertTrue(permissions.remove("Bash(git status:*)")["ok"])
        self.assertNotIn("Bash(git status:*)", json.loads((self.tmp / "settings.json").read_text())["permissions"]["allow"])
        self.assertFalse(permissions.add("Bash(rm -rf /;:*)")["ok"])


class ReadinessTests(unittest.TestCase):
    def test_score(self) -> None:
        empty = readiness.score("Fix it", "", "Bug", ["cogito"])
        good = readiness.score("[cogito] Kanban sort", "Le tableau doit trier les cartes par date.\n\nCritères d'acceptation :\n- [ ] tri par date dans `KanbanBoard.tsx`\n"
                               "- [ ] endpoint /api/cards?sort=date\n" + "Contexte détaillé. " * 12, "Feature", ["cogito"], links=1)
        self.assertLess(empty["score"], 30)
        self.assertGreaterEqual(good["score"], 80)
        self.assertIn("critères d'acceptation", good["plus"])
        self.assertTrue(any("TBD" in m for m in readiness.score("x", "Le format est TBD, à définir ?", "Feature", [])["minus"]))


class ProcessTests(unittest.TestCase):
    def test_compliance(self) -> None:
        now = time.time()
        item = lambda typ, ticket, mr=None, last=now - 10_000, **kw: {"type": typ, "ticket": ticket, "projects": [kw.get("project", "cogito")], "first": last - 100, "last": last,  # noqa: E731
                                                                     "done": True, "mr": mr, "mrRead": kw.get("read", []), "description": kw.get("desc", ""), "session": "s", "id": ticket or "x"}
        mr = "https://gitlab.x/g/cogito/-/merge_requests/5"
        items = [item("feature-builder", "APP-1", mr), item("guardian-test-writer", "APP-1"), item("mr-reviewer", None, read=[mr], desc="Review"),
                 item("feature-builder", "APP-2", "https://gitlab.x/g/api/-/merge_requests/5", project="api"),  # same number, other repository: not reviewed
                 item("feature-builder", "APP-3", last=now - 60)]  # just delivered: waiting
        tmp = Path(tempfile.mkdtemp())
        with mock.patch.object(process, "work_items", return_value=items), mock.patch.object(usage, "summaries", return_value=[]), mock.patch.object(config, "STATE_DIR", tmp):
            out = {r["id"]: r for r in process.compliance(None)["rules"]}
            self.assertEqual((out["guardian"]["ok"], len(out["guardian"]["missing"]), out["guardian"]["waiting"]), (1, 0, 1))
            self.assertEqual((out["review"]["ok"], [m["ticket"] for m in out["review"]["missing"]]), (1, ["APP-2"]))
            self.assertEqual(sorted(m["ticket"] for m in out["security"]["missing"]), ["APP-1", "APP-2"])
            process.ignore("security|APP-1")
            out = {r["id"]: r for r in process.compliance(None)["rules"]}
            self.assertEqual([m["ticket"] for m in out["security"]["missing"]], ["APP-2"])


class FailureTests(unittest.TestCase):
    def run_(self, **kw) -> dict:
        base = {"type": "feature-builder", "status": "blocked", "loop": False, "ticket": None, "asks": 0, "lastError": "", "mr": None,
                "usage": {"errors": [], "denials": [], "flaky": [], "reads": 2, "edits": 2}}
        base["usage"].update(kw.pop("usage", {}))
        return {**base, **kw}

    def test_classify(self) -> None:
        c = lambda **kw: failures.classify(self.run_(**kw), {"APP-9": 20}, set())[0]  # noqa: E731
        self.assertEqual(c(usage={"denials": [{"kind": "auto", "reason": "X", "prefix": "git push", "tool": "Bash", "arg": ""}]}), "permission")
        self.assertEqual(c(ticket="APP-9"), "ticket")
        self.assertEqual(c(usage={"errors": [["Bash", "(eval):1: no such file or directory: python3 -I /x/gl.py"]]}), "shell")
        self.assertEqual(c(usage={"errors": [["Bash", "ModuleNotFoundError: No module named 'x'"]]}), "env")
        self.assertEqual(c(usage={"errors": [["Read", "File does not exist."]]}), "context")
        self.assertEqual(c(loop=True), "loop")
        self.assertEqual(failures._bad(self.run_(type="Explore", status="done", loop=True), set()), "")  # reading a lot is its job


class VersionTests(unittest.TestCase):
    def test_verdict(self) -> None:
        old = {"n": 5, "done": 90, "loops": 0, "errors": 1.0, "cost": 1.0, "minutes": 5}
        self.assertEqual(agentversions._verdict({**old, "n": 2}, old), [])  # too few runs
        bad = agentversions._verdict({**old, "done": 60, "cost": 2.0}, old)
        self.assertEqual([v["level"] for v in bad], ["bad", "bad"])
        self.assertEqual(agentversions._verdict({**old, "done": 100, "cost": 0.5}, {**old, "done": 70})[0]["level"], "good")


class ModelTests(unittest.TestCase):
    def test_switch_advice(self) -> None:
        tok = {"in": 1000, "cw": 0, "cr": 10_000, "out": 2000, "cost": 0.0, "calls": 1}
        run = lambda fam, ok: {"type": "mr-reviewer", "status": "done" if ok else "blocked", "loop": False, "errors": 0,  # noqa: E731
                               "usage": {"models": {f"claude-{fam}-5-5": {**tok, "cost": 0.5 if fam == "opus" else 0.1}}, "tools": 10}}
        runs = [run("opus", True)] * 6 + [run("sonnet", True)] * 5
        with mock.patch.object(usage, "agent_runs", return_value=runs):
            a = efficiency.models(None)["agents"][0]
        self.assertEqual((a["advice"]["kind"], a["advice"]["family"]), ("switch", "sonnet"))
        self.assertGreater(a["advice"]["saving"], 0)


class MmxHygieneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.mmx = Path(tempfile.mkdtemp())
        for sub in ("memory", "staging", "tools"):
            (self.mmx / sub).mkdir()
        (self.mmx / "INDEX.json").write_text(json.dumps({"modules": {"MOD-KNOWLEDGE": "memory/knowledge.json"}}))
        entry = {"id": "FACT-0001", "t": "fact", "d": "YouTrack client yt.py", "r": [], "s": "observed", "c": 1.0, "p": 3, "st": "active", "created": "2026-01-01", "updated": "2026-01-01", "tags": ["youtrack"]}
        (self.mmx / "memory" / "knowledge.json").write_text(json.dumps({"module": "MOD-KNOWLEDGE", "entries": [entry]}))
        (self.mmx / "staging" / "PROPOSALS.json").write_text(json.dumps({"proposals": [{"proposal_id": "PR-0007", "status": "applied"}]}))
        self.entry = entry

    def tool(self, code: int) -> None:
        (self.mmx / "tools" / "mmx.py").write_text(f"import sys\nprint('checked')\nsys.exit({code})\n")

    def test_propose_archive(self) -> None:
        self.tool(0)
        with mock.patch.object(config, "MMX", self.mmx), mock.patch("office.mmx.MMX", self.mmx):
            out = mmxhygiene.propose_archive("FACT-0001", "Jamais retrouvée")
            self.assertEqual(out["proposal"], "PR-0008")
            props = json.loads((self.mmx / "staging" / "PROPOSALS.json").read_text())["proposals"]
            self.assertEqual((props[-1]["op"], props[-1]["status"], props[-1]["before"]), ("archive", "pending", self.entry))
            self.assertFalse(mmxhygiene.propose_archive("FACT-0001", "x")["ok"])  # one waiting already
        self.assertEqual(json.loads((self.mmx / "memory" / "knowledge.json").read_text())["entries"], [self.entry])  # memory never written

    def test_validate_failure_rolls_back(self) -> None:
        self.tool(1)
        before = (self.mmx / "staging" / "PROPOSALS.json").read_text()
        with mock.patch.object(config, "MMX", self.mmx), mock.patch("office.mmx.MMX", self.mmx):
            self.assertFalse(mmxhygiene.propose_archive("FACT-0001", "x")["ok"])
        self.assertEqual((self.mmx / "staging" / "PROPOSALS.json").read_text(), before)


if __name__ == "__main__":
    unittest.main()
