"""Server tests (stdlib only): python3 -I -m unittest discover -s tests"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
import unittest
from unittest import mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from office import billing, blueprints, config, framecheck, game, gitlab, history, launcher, pricing, questions, routes, savegame, team, transcripts  # noqa: E402


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

    def test_windows_opens_claude_exe_in_a_new_console_and_refuses_cmd(self) -> None:
        with mock.patch.object(launcher, "agent_files", lambda: {"feature-builder": Path("x.md")}), \
                mock.patch.object(launcher.sys, "platform", "win32"), mock.patch.object(launcher.subprocess, "Popen") as popen:
            with mock.patch.object(launcher.shutil, "which", lambda n: None if n == "claude.exe" else r"C:\npm\claude.cmd"):
                ok, _ = launcher.launch("feature-builder", "Deliver ABC-1 & calc")
                self.assertFalse(ok)
                popen.assert_not_called()
            with mock.patch.object(launcher.shutil, "which", lambda n: r"C:\Users\u\.local\bin\claude.exe"):
                ok, _ = launcher.launch("feature-builder", "Deliver ABC-1 & calc")
            self.assertTrue(ok)
            argv = popen.call_args.args[0]
            self.assertEqual(argv, [r"C:\Users\u\.local\bin\claude.exe", "--agent", "feature-builder", "Deliver ABC-1 & calc"])
            self.assertIn("creationflags", popen.call_args.kwargs)

    def test_launched_claude_does_not_inherit_the_parent_session(self) -> None:
        env = launcher.clean_env({"PATH": "/bin", "DISPLAY": ":0", "CLAUDECODE": "1", "CLAUDE_PID": "1",
                                  "CLAUDE_CODE_CHILD_SESSION": "1", "CLAUDE_CODE_SESSION_ID": "x"})
        self.assertEqual(env, {"PATH": "/bin", "DISPLAY": ":0"})


class ShimTests(unittest.TestCase):
    def test_shim_compiles_with_a_windows_path(self) -> None:
        import importlib.util
        from pathlib import PureWindowsPath
        spec = importlib.util.spec_from_file_location("office_cli", Path(__file__).resolve().parents[2] / "bin" / "office.py")
        cli = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cli)
        target = PureWindowsPath(r"C:\Users\alex\.claude\plugins\cache\agent-office\agent-office\0.3.1\bin\office.py")
        body = cli.shim_body(target)
        compile(body, "shim.py", "exec")
        self.assertIn(repr(str(target)), body)


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


class SaveGameTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        self.patches = [mock.patch.object(savegame, "STATE_DIR", self.tmp), mock.patch.object(savegame, "SAVE_FILE", self.tmp / "save.json")]
        for p in self.patches:
            p.start()

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def test_save_then_load(self) -> None:
        self.assertEqual(savegame.load(), {})
        data = {"savedAt": 1700000000000, "keys": {"office-wallet": '{"funds": 1500}', "office-build": "{}"}}
        self.assertEqual(savegame.save(data), (True, str(self.tmp / "save.json")))
        self.assertEqual(savegame.load(), data)
        savegame.save({"savedAt": 1700000000001, "keys": {"office-build": '{"seq": 3}'}})  # partial: the wallet stays
        self.assertEqual(savegame.load()["keys"], {"office-wallet": '{"funds": 1500}', "office-build": '{"seq": 3}'})

    def test_rejects_foreign_keys_and_oversize(self) -> None:
        self.assertFalse(savegame.save({"savedAt": 1, "keys": {"token": "x"}})[0])
        self.assertFalse(savegame.save({"savedAt": "1", "keys": {}})[0])
        self.assertFalse(savegame.save({"savedAt": 1, "keys": {"office-x": "a" * (savegame.VALUE_MAX + 1)}})[0])
        self.assertFalse((self.tmp / "save.json").exists())


class HistoryTests(unittest.TestCase):
    def test_project_name(self) -> None:
        home = str(Path.home()).replace("/", "-")
        self.assertEqual(history.project_name(f"{home}-repos-Office-Agent"), "Office-Agent")
        self.assertEqual(history.project_name("-tmp-x"), "tmp-x")

    def test_costs_group_by_ticket_and_project(self) -> None:
        fake = [{"ticket": "DEMO-1", "project": "front", "cost": 1.5, "first": 0, "last": 600, "status": "done", "type": "feature-builder"},
                {"ticket": "DEMO-1", "project": "front", "cost": 0.5, "first": 0, "last": 60, "status": "blocked", "type": "mr-reviewer"},
                {"ticket": None, "project": "api", "cost": 3.0, "first": 0, "last": 0, "status": "done", "type": "Explore"}]
        with mock.patch.object(history, "runs", lambda game, days: iter(fake)):
            c = history.costs(None, 30)
        self.assertEqual(c["total"], {"runs": 3, "cost": 5.0, "seconds": 660.0})
        self.assertEqual((c["tickets"][0]["key"], c["tickets"][0]["cost"], c["tickets"][0]["done"], c["tickets"][0]["blocked"]), ("DEMO-1", 2.0, 1, 1))
        self.assertEqual([p["key"] for p in c["projects"]], ["api", "front"])


class VersionTests(unittest.TestCase):
    def test_older_server_is_replaced_newer_kept(self) -> None:
        import importlib.util
        spec = importlib.util.spec_from_file_location("office_cli2", Path(__file__).resolve().parents[2] / "bin" / "office.py")
        cli = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cli)
        self.assertTrue(cli.older("0", "0.5.2"))          # a server from before versions were told
        self.assertTrue(cli.older("0.4.0", "0.5.2"))
        self.assertTrue(cli.older("0.5.1", "0.5.10"))
        self.assertFalse(cli.older("0.5.2", "0.5.2"))
        self.assertFalse(cli.older("0.6.0", "0.5.2"))     # a newer dev server stays

    def test_plugin_version_is_read(self) -> None:
        self.assertNotEqual(config.plugin_version(), "0")
        self.assertEqual(config.plugin_version(Path(tempfile.mkdtemp())), "0")


class TokenTests(unittest.TestCase):
    def test_token_survives_a_restart(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        with mock.patch.object(config, "STATE_DIR", tmp):
            first = config.load_token()
            self.assertEqual(config.load_token(), first)
            self.assertGreaterEqual(len(first), 24)
            if os.name != "nt":
                self.assertEqual((tmp / "token").stat().st_mode & 0o777, 0o600)


class GitLabTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        self.patches = [mock.patch.object(gitlab, "STATE_DIR", self.tmp), mock.patch.object(gitlab, "CONF_FILE", self.tmp / "gitlab.json")]
        for p in self.patches:
            p.start()
        gitlab._cache.clear()

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def test_url_is_normalized_and_checked(self) -> None:
        self.assertEqual(gitlab.normalize_url("gitlab.example.com/"), "https://gitlab.example.com")
        self.assertEqual(gitlab.normalize_url("https://git.corp.io/gitlab/api/v4"), "https://git.corp.io/gitlab")
        self.assertEqual(gitlab.normalize_url("http://localhost:8080"), "http://localhost:8080")
        for bad in ("", "ftp://x", "http://gitlab.example.com"):
            with self.assertRaises(gitlab.GitLabError):
                gitlab.normalize_url(bad)

    def test_token_saved_privately_and_never_shown(self) -> None:
        with mock.patch.object(gitlab, "api", lambda conf, path, *a, **k: {"username": "taikoz"}):
            st = gitlab.save("https://gitlab.com", "glpat-secret")
            self.assertEqual(st, {"configured": True, "url": "https://gitlab.com", "user": "taikoz"})
            self.assertNotIn("glpat-secret", json.dumps(gitlab.status()))
            if os.name != "nt":
                self.assertEqual((self.tmp / "gitlab.json").stat().st_mode & 0o777, 0o600)
            gitlab.save("https://gitlab.com", "")  # an empty token keeps the saved one
            self.assertEqual(gitlab.load()["token"], "glpat-secret")
        with mock.patch.object(gitlab, "api", lambda *a, **k: (_ for _ in ()).throw(gitlab.GitLabError("jeton refusé"))):
            self.assertEqual(gitlab.safe(lambda: gitlab.save("https://gitlab.com", "bad"))[0], 502)
        self.assertEqual(gitlab.load()["token"], "glpat-secret")  # a refused token does not replace the good one
        gitlab.forget()
        self.assertFalse(gitlab.status()["configured"])

    def test_log_tail_strips_colors_and_sections(self) -> None:
        log = "section_start:1:build\r\x1b[0K\x1b[32;1mok\x1b[0;m\nline 2\rline 2 final\n" + "\n".join(f"l{i}" for i in range(100))
        out = gitlab.tail(log, 3)
        self.assertEqual(out, "l97\nl98\nl99")
        self.assertIn("line 2 final", gitlab.tail(log, 200))
        self.assertNotIn("\x1b", gitlab.tail(log, 200))


class GitLabDetailTests(unittest.TestCase):
    def test_mr_detail_shapes_threads_jobs_and_files(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        answers = {
            "/projects/7/merge_requests/42": {"title": "Remises", "state": "opened", "source_branch": "f", "target_branch": "main", "author": {"username": "a", "name": "A"}, "has_conflicts": False},
            "/projects/7/merge_requests/42/approvals": {"approvals_required": 1, "approvals_left": 0, "approved_by": [{"user": {"username": "b", "name": "B"}}]},
            "/projects/7/merge_requests/42/discussions": [{"id": "d1", "notes": [{"author": {"username": "b"}, "body": "Nom ?", "resolvable": True, "resolved": False, "position": {"new_path": "cart.py", "new_line": 12}}]},
                                                          {"id": "d2", "notes": [{"author": {"username": "a"}, "body": "a ajouté 1 commit", "system": True}]}],
            "/projects/7/merge_requests/42/pipelines": [{"id": 9, "status": "failed", "web_url": "u"}],
            "/projects/7/merge_requests/42/diffs": [{"new_path": "cart.py", "diff": "@@ -1 +1,2 @@\n-a\n+b\n+c\n"}],
            "/projects/7/pipelines/9/jobs": [{"id": 5, "name": "pytest", "stage": "test", "status": "failed"}],
        }
        with mock.patch.object(gitlab, "load", lambda: {"url": "https://g", "token": "t"}), mock.patch.object(gitlab, "api", lambda conf, path, *a, **k: answers[path]):
            gitlab._cache.clear()
            d = gitlab.mr_detail(7, 42)
        self.assertEqual((d["approvals"]["left"], d["approvals"]["by"][0]["username"]), (0, "b"))
        self.assertEqual([(t["file"], t["line"], t["resolved"], t["system"]) for t in d["threads"]], [("cart.py", 12, False, False), ("", None, False, True)])
        self.assertEqual((d["pipeline"]["status"], d["jobs"][0]["name"]), ("failed", "pytest"))
        self.assertEqual((d["files"][0]["adds"], d["files"][0]["dels"]), (2, 1))


class FrameCheckTests(unittest.TestCase):
    def test_verdict_reads_xfo_and_frame_ancestors(self) -> None:
        from email.message import Message
        def h(**kw: str) -> Message:
            m = Message()
            for k, v in kw.items():
                m[k.replace("_", "-")] = v
            return m
        self.assertEqual(framecheck.verdict(h())[0], True)
        self.assertEqual(framecheck.verdict(h(X_Frame_Options="SAMEORIGIN"))[0], False)
        self.assertEqual(framecheck.verdict(h(Content_Security_Policy="default-src 'self'; frame-ancestors 'self'"))[0], False)
        self.assertEqual(framecheck.verdict(h(Content_Security_Policy="frame-ancestors *"))[0], True)
        self.assertEqual(framecheck.check("file:///etc/passwd")["embeddable"], False)


class BlueprintTests(unittest.TestCase):
    def test_destination_is_checked_and_publish_writes(self) -> None:
        home = Path(tempfile.mkdtemp())
        repo = home / "repos" / "app"
        repo.mkdir(parents=True)
        with mock.patch.object(Path, "home", lambda: home):
            self.assertEqual(blueprints.destination(str(repo), "skill", "deploy-check"), repo.resolve() / ".claude" / "skills" / "deploy-check" / "SKILL.md")
            self.assertEqual(blueprints.destination(str(home), "agent", "reviewer"), home.resolve() / ".claude" / "agents" / "reviewer.md")
            for bad in (("/etc", "skill", "x"), (str(repo), "skill", "../evil"), (str(repo), "skill", "Bad Name"), (str(repo), "macro", "x")):
                with self.assertRaises(ValueError):
                    blueprints.destination(*bad)
            body = {"kind": "skill", "name": "deploy-check", "target": str(repo), "content": "---\nname: deploy-check\n---\n", "mode": "write"}
            self.assertEqual(blueprints.publish(body)[0], 200)
            self.assertEqual(blueprints.publish(body)[0], 409)  # exists: not overwritten
            self.assertEqual(blueprints.publish({**body, "overwrite": True})[0], 200)
            with mock.patch.object(blueprints, "launch_claude_in", lambda cwd, prompt: (True, f"ok {cwd}")), mock.patch.object(blueprints, "DRAFTS", home / "drafts"):
                code, out = blueprints.publish({**body, "mode": "claude", "blueprint": {"nodes": []}})
            self.assertEqual(code, 200)
            self.assertTrue(Path(out["draft"]).exists())
