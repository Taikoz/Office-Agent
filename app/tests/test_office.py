"""Server tests (stdlib only): python3 -I -m unittest discover -s tests"""

from __future__ import annotations

import json
import sys
import tempfile
import time
import unittest
from unittest import mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from office import billing, config, game, launcher, pricing, questions, routes, team, transcripts  # noqa: E402


def write_transcript(path: Path, records: list[dict]) -> Path:
    path.write_text("\n".join(json.dumps(r) for r in records) + "\n")
    return path


def tool_use(tid: str, name: str, **inp) -> dict:
    return {"type": "assistant", "message": {"content": [{"type": "tool_use", "id": tid, "name": name, "input": inp}], "usage": {"output_tokens": 10}}}


def tool_result(tid: str, error: bool = False, text: str = "ok") -> dict:
    return {"type": "user", "message": {"content": [{"type": "tool_result", "tool_use_id": tid, "is_error": error, "content": text}]}}


class TranscriptTests(unittest.TestCase):
    def setUp(self) -> None:
        self.dir = Path(tempfile.mkdtemp())

    def test_scan_counts_tools_errors_and_finish(self) -> None:
        path = write_transcript(self.dir / "agent-a1.jsonl", [
            {"type": "user", "cwd": "/repo", "message": {"content": "Deliver ABC-1234"}},
            tool_use("t1", "Bash", command="pytest", description="Run tests"), tool_result("t1", error=True, text="1 failed"),
            tool_use("t2", "Edit", file_path="/repo/a.py"), tool_result("t2"),
            {"type": "assistant", "message": {"content": [{"type": "text", "text": "Done."}], "stop_reason": "end_turn"}},
        ])
        state = transcripts.scan(path, time.time())
        self.assertEqual((state["tools"], state["errors"], state["tokens"]), (2, 1, 20))
        self.assertEqual(state["action"], "Edit a.py")
        self.assertTrue(state["finished"])
        info = transcripts.subagent(path, time.time())
        self.assertEqual((info["status"], info["ticket"], info["id"]), ("done", "ABC-1234", "a1"))

    def test_open_ask_call_is_reported_and_not_finished(self) -> None:
        path = write_transcript(self.dir / "agent-a2.jsonl", [tool_use("t1", "Bash", command="python3 agent-office/ask.py --wait q-1")])
        state = transcripts.scan(path, time.time())
        self.assertFalse(state["finished"])
        self.assertEqual(len(state["asks"]), 1)
        q = {"id": "q-1", "question": "Draft ?"}
        self.assertIs(questions.match_question(state["asks"], [q]), q)


class RunTests(unittest.TestCase):
    def test_cost_files_mr_and_progress(self) -> None:
        usage = {"input_tokens": 1000, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 1000}
        reply = {"type": "assistant", "timestamp": "2026-10-13T10:00:00Z",
                 "message": {"id": "m1", "model": "claude-opus-5-5", "usage": usage, "content": []}}
        path = write_transcript(Path(tempfile.mkdtemp()) / "agent-a3.jsonl", [
            reply, reply,  # same response split over two records: billed once
            tool_use("t1", "Edit", file_path="/repo/a.py"), tool_result("t1"),
            tool_use("t2", "Bash", command="gl.py mr-create --yes"),
            tool_result("t2", text="MR créée : !12 https://gitlab.example.com/g/p/-/merge_requests/12"),
            tool_use("t3", "Read", file_path="/repo/b.py"), tool_result("t3"),
        ])
        r = game.Run(path)
        r.update()
        self.assertAlmostEqual(r.cost, pricing.usd("claude-opus-5-5", usage))
        self.assertAlmostEqual(r.cost, (1000 * 4 + 1000 * 20) / 1e6)
        self.assertEqual(list(r.files), ["/repo/a.py"])
        self.assertEqual(r.mr_url, "https://gitlab.example.com/g/p/-/merge_requests/12")
        self.assertEqual(r.since_progress, 2)


class LauncherTests(unittest.TestCase):
    def test_rejects_unknown_agent_and_bad_prompt(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        (tmp / "feature-builder.md").write_text("---\nname: feature-builder\ncolor: blue\n---\nBuild.\n")
        with mock.patch.object(launcher, "agent_files", lambda: {"feature-builder": tmp / "feature-builder.md"}):
            self.assertIn("feature-builder", launcher.agents())
            self.assertEqual(launcher.launch("rm -rf /", "x"), (False, "agent inconnu"))
            self.assertEqual(launcher.launch("feature-builder", "  "), (False, "mission vide ou trop longue"))
            self.assertEqual(launcher.launch("feature-builder", "x" * 2001), (False, "mission vide ou trop longue"))

    def test_launched_claude_does_not_inherit_the_parent_session(self) -> None:
        env = launcher.clean_env({"PATH": "/bin", "DISPLAY": ":0", "CLAUDECODE": "1", "CLAUDE_PID": "1",
                                  "CLAUDE_CODE_CHILD_SESSION": "1", "CLAUDE_CODE_SESSION_ID": "x"})
        self.assertEqual(env, {"PATH": "/bin", "DISPLAY": ":0"})


class ConfigTests(unittest.TestCase):
    def test_backlog_query_is_one_or_several(self) -> None:
        tmp = Path(tempfile.mkdtemp()) / "agent-office.json"
        for value, expected in (("A", ["A"]), (["A", "B", ""], ["A", "B"]), ("", [])):
            tmp.write_text(json.dumps({"youtrack_backlog_query": value}))
            with mock.patch.object(config, "CONFIG_PATH", tmp):
                self.assertEqual(config.load()["youtrack_backlog_query"], expected)


class TeamTests(unittest.TestCase):
    def setUp(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        self.patches = [mock.patch.object(team, "STATE_DIR", tmp), mock.patch.object(team, "TEAM_FILE", tmp / "team.json")]
        for p in self.patches:
            p.start()
        self.tmp = tmp
        self.names = ["A1", "B2", "C3", "D4", "E5", "F6", "G7", "H8"]

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def test_first_launch_then_save(self) -> None:
        self.assertFalse(team.settings()["setup"])
        ok, _ = team.save({"chief": "Ada", "team": self.names, "office": "Labo <b>"})
        self.assertTrue(ok)
        s = team.settings()
        self.assertEqual((s["setup"], s["chief"], s["team"], s["cat"], s["office"], s["logo"]), (True, "Ada", self.names, "Brume", "Labo b", None))

    def test_rejects_bad_teams(self) -> None:
        self.assertFalse(team.save({"chief": "", "team": self.names})[0])
        self.assertFalse(team.save({"chief": "Ada", "team": self.names[:7]})[0])
        self.assertFalse(team.save({"chief": "a1", "team": self.names})[0])  # same name twice
        self.assertFalse(team.settings()["setup"])

    def test_logo_upload_replace_remove(self) -> None:
        svg = "data:image/svg+xml;base64," + __import__("base64").b64encode(b'<svg xmlns="http://www.w3.org/2000/svg"/>').decode()
        self.assertTrue(team.save({"chief": "Ada", "team": self.names, "logo": svg})[0])
        self.assertEqual(team.logo_path(), self.tmp / "logo.svg")
        self.assertTrue(team.save({"chief": "Ada", "team": self.names})[0])  # no key: logo kept
        self.assertEqual(team.logo_path(), self.tmp / "logo.svg")
        self.assertFalse(team.save({"chief": "Ada", "team": self.names, "logo": "data:text/html;base64,PGI+"})[0])
        self.assertFalse(team.save({"chief": "Ada", "team": self.names, "logo": "data:image/svg+xml;base64,aGVsbG8="})[0])
        big = "data:image/png;base64," + "A" * 500_000
        self.assertFalse(team.save({"chief": "Ada", "team": self.names, "logo": big})[0])
        self.assertTrue(team.save({"chief": "Ada", "team": self.names, "logo": None})[0])
        self.assertIsNone(team.logo_path())


class BillingTests(unittest.TestCase):
    def check(self, account: dict, env: dict, mode: str) -> None:
        tmp = Path(tempfile.mkdtemp())
        (tmp / "claude.json").write_text(json.dumps({"oauthAccount": account}))
        with mock.patch.object(billing, "CLAUDE_JSON", tmp / "claude.json"), mock.patch.object(billing, "SETTINGS", tmp / "none.json"), \
                mock.patch.dict("os.environ", env, clear=True):
            self.assertEqual(billing.billing()["mode"], mode)

    def test_modes(self) -> None:
        self.check({"billingType": "stripe_subscription"}, {}, "subscription")
        self.check({"billingType": "stripe_subscription", "hasExtraUsageEnabled": True}, {}, "api")
        self.check({"billingType": "stripe_subscription"}, {"ANTHROPIC_API_KEY": "x"}, "api")
        self.check({}, {}, "api")


class StaticTests(unittest.TestCase):
    def test_only_css_and_js_of_web_are_served(self) -> None:
        files = routes.static_files()
        self.assertIn("/static/style.css", files)
        self.assertIn("/static/js/main.js", files)
        self.assertTrue(all(p.suffix in (".css", ".js") and routes.WEB in p.parents for p in files.values()))
        self.assertNotIn("/static/../server.py", files)

    def test_page_scripts_exist(self) -> None:
        page = (routes.WEB / "index.html").read_text()
        self.assertIn("__OFFICE_TOKEN__", page)
        for src in [s.split('"')[0] for s in page.split('src="')[1:]]:
            self.assertIn(f"/{src}", routes.static_files(), src)


if __name__ == "__main__":
    unittest.main()
