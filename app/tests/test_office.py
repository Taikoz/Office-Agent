"""Server tests (stdlib only): python3 -I -m unittest discover -s tests"""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from office import billing, blueprints, claudefiles, config, framecheck, game, gitlab, history, insights, knowhow, launcher, lessons, net, pricing, questions, quips, routes, savegame, schedules, slack, team, terminal, transcripts  # noqa: E402


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

    def test_one_agent_type_per_desk(self) -> None:
        mine = {n: Path(f"/x/{n}.md") for n in ("tech-lead", "mr-reviewer", "zeta-bot", "feature-builder")}
        with mock.patch.object(team, "agent_files", return_value=mine):
            roles = team.settings()["roles"]
        self.assertEqual(roles, ["feature-builder", "mr-reviewer", "zeta-bot", "general-purpose", "Explore", "general-purpose", "general-purpose", "general-purpose"])
        self.assertFalse(team.save_roles(["x"] * 7)[0])
        self.assertFalse(team.save_roles(["bad name"] * 8)[0])
        mine_roles = ["Explore"] * 7 + ["mr-reviewer"]
        self.assertTrue(team.save_roles(mine_roles)[0])
        self.assertEqual(team.settings()["roles"], mine_roles)
        self.assertTrue(team.save({"chief": "Boss", "team": self.names})[0])
        self.assertEqual(team.settings()["roles"], mine_roles)  # renaming the team keeps the roles

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
        self.assertIn("/static/css/01-base.css", files)
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

    def test_daily_backup_keeps_a_week(self) -> None:
        backups = self.tmp / "backups"
        backups.mkdir()
        for d in range(1, 10):
            (backups / f"save-2026-01-{d:02d}.json").write_text("{}")
        savegame.save({"savedAt": 1, "keys": {"office-build": "{}"}})  # no save yet: nothing to copy
        savegame.save({"savedAt": 2, "keys": {"office-build": '{"seq": 1}'}})  # today's copy of the previous save
        kept = sorted(p.name for p in backups.glob("save-*.json"))
        self.assertEqual(len(kept), savegame.BACKUP_KEEP)
        self.assertIn(f"save-{savegame.date.today().isoformat()}.json", kept)

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
        self.assertEqual(history.project_name(re.sub(r"[^A-Za-z0-9]", "-", str(Path.home())) + "-repos-Office-Agent"), "Office-Agent")

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


class TerminalTests(unittest.TestCase):
    @unittest.skipUnless(os.name == "posix", "pty")
    def test_shell_runs_a_command_and_closes(self) -> None:
        home = Path(tempfile.mkdtemp())
        with mock.patch.object(Path, "home", lambda: home), mock.patch.dict("os.environ", {"SHELL": "/bin/sh"}):
            t = terminal.open_term(str(home), 24, 80)
            terminal.write(t["id"], "echo office-$((40+2))\n")
            out, since = b"", 0
            for _ in range(30):
                r = terminal.read(t["id"], since, 0.2)
                out += __import__("base64").b64decode(r["data"]); since = r["next"]
                if b"office-42" in out:
                    break
            terminal.close(t["id"])
        self.assertIn(b"office-42", out)
        with mock.patch.object(Path, "home", lambda: home):
            with self.assertRaises(ValueError):
                terminal.open_term("/etc")


class ClaudeFilesTests(unittest.TestCase):
    def test_only_skills_agents_commands_and_backups(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        base = tmp / ".claude"
        (base / "skills" / "deploy").mkdir(parents=True)
        (base / "agents").mkdir()
        (base / "skills" / "deploy" / "SKILL.md").write_text("---\nname: deploy\ndescription: Déploie.\n---\nCorps")
        (base / "settings.json").write_text("{}")
        with mock.patch.object(claudefiles, "roots", lambda: [("Global", base)]), mock.patch.object(claudefiles, "BACKUPS", tmp / "b"), mock.patch.object(claudefiles, "TRASH", tmp / "t"):
            files = claudefiles.list_files()
            self.assertEqual([(f["kind"], f["name"], f["description"]) for f in files], [("skill", "deploy", "Déploie.")])
            path = files[0]["path"]
            got = claudefiles.read(path)
            with self.assertRaises(ValueError):
                claudefiles.read(str(base / "settings.json"))   # not a skill / agent / command
            with self.assertRaises(FileExistsError):
                claudefiles.save(path, "x", got["mtime"] - 10)  # changed on disk meanwhile
            claudefiles.save(path, "---\nname: deploy\n---\nNouveau", got["mtime"])
            self.assertEqual(len(list((tmp / "b").iterdir())), 1)
            claudefiles.save(str(base / "agents" / "copie.md"), "---\nname: copie\n---\n")  # a new file (duplicate)
            with self.assertRaises(ValueError):
                claudefiles.save(str(base / "hooks" / "x.sh"), "echo")
            claudefiles.delete(path)
            self.assertFalse((base / "skills" / "deploy").exists())
            self.assertEqual(len(list((tmp / "t").iterdir())), 1)


class ScheduleTests(unittest.TestCase):
    def test_due_only_in_its_window_and_once(self) -> None:
        from datetime import datetime
        with mock.patch.object(schedules, "agents", lambda: ["cleaner"]):
            item = schedules.clean({"agent": "cleaner", "prompt": "Nettoie", "days": [0], "time": "09:00"})
        monday = datetime(2026, 10, 19, 9, 5)
        self.assertEqual(schedules.due(item, monday), "2026-10-19 09:00")
        self.assertIsNone(schedules.due(item, monday.replace(hour=8, minute=59)))
        self.assertIsNone(schedules.due(item, monday.replace(hour=10)))           # missed long ago: skipped
        self.assertIsNone(schedules.due(item, datetime(2026, 10, 20, 9, 5)))      # Tuesday
        self.assertIsNone(schedules.due({**item, "last": "2026-10-19 09:00"}, monday))
        with mock.patch.object(schedules, "agents", lambda: ["cleaner"]):
            for bad in ({"agent": "x", "prompt": "p", "days": [0], "time": "09:00"}, {"agent": "cleaner", "prompt": "p", "days": [], "time": "09:00"}, {"agent": "cleaner", "prompt": "p", "days": [1], "time": "25:00"}):
                with self.assertRaises(ValueError):
                    schedules.clean(bad)


class HookAndDashboardTests(unittest.TestCase):
    def test_hook_install_merges_settings_once(self) -> None:
        home = Path(tempfile.mkdtemp())
        repo = home / "app"
        (repo / ".claude").mkdir(parents=True)
        (repo / ".claude" / "settings.json").write_text('{"permissions": {"allow": ["Bash(ls)"]}}')
        with mock.patch.object(Path, "home", lambda: home), mock.patch.object(blueprints, "DRAFTS", home / "drafts"):
            body = {"kind": "hook", "name": "no-push-main", "target": str(repo), "content": "#!/usr/bin/env bash\nexit 0\n", "mode": "write",
                    "hook": {"event": "PreToolUse", "matcher": "Bash"}}
            self.assertEqual(blueprints.publish(body)[0], 200)
            self.assertEqual(blueprints.publish({**body, "overwrite": True})[0], 200)
        conf = json.loads((repo / ".claude" / "settings.json").read_text())
        self.assertEqual(conf["permissions"], {"allow": ["Bash(ls)"]})
        self.assertEqual(conf["hooks"]["PreToolUse"], [{"matcher": "Bash", "hooks": [{"type": "command", "command": 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/no-push-main.sh"'}]}])
        self.assertTrue(os.access(repo / ".claude" / "hooks" / "no-push-main.sh", os.X_OK))

    def test_dashboard_per_day_type_and_causes(self) -> None:
        fake = [{"type": "feature-builder", "status": "done", "first": 1_760_000_000, "last": 1_760_000_600, "cost": 2.0, "errors": 1, "lastError": ""},
                {"type": "feature-builder", "status": "blocked", "first": 1_760_000_000, "last": 1_760_000_100, "cost": 1.0, "errors": 3, "lastError": "Timeout 30000ms"}]
        with mock.patch.object(history, "runs", lambda game, days: iter(fake)):
            d = history.dashboard(None, 30)
        self.assertEqual((d["perType"][0]["runs"], d["perType"][0]["rate"], d["perType"][0]["avgCost"]), (2, 50, 1.5))
        self.assertEqual(d["causes"], [{"cause": "délai dépassé", "n": 1}])
        self.assertEqual(sum(x["runs"] for x in d["perDay"]), 2)


class HostCheckTests(unittest.TestCase):
    def test_foreign_host_is_refused(self) -> None:
        import http.client
        import threading
        from http.server import ThreadingHTTPServer
        srv = ThreadingHTTPServer(("127.0.0.1", 0), routes.make_handler(60, mock.MagicMock()))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        port = srv.server_address[1]
        try:
            c = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
            c.request("GET", "/api/viewer", headers={"Host": "evil.example:%d" % port})
            self.assertEqual(c.getresponse().status, 403)
            c = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
            c.request("GET", "/api/term/list")  # right host, no token
            self.assertEqual(c.getresponse().status, 403)
            c = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
            c.request("GET", "/api/viewer")
            self.assertEqual(c.getresponse().status, 200)
        finally:
            srv.shutdown()


class PlatformTests(unittest.TestCase):
    """The new tools on macOS and Windows, checked from any OS by faking the platform."""

    def test_macos_terminal_opens_in_the_folder(self) -> None:
        with mock.patch.object(launcher.sys, "platform", "darwin"):
            argv = launcher.terminal(["claude", "--agent", "x", "it's \"quoted\""], Path("/Users/me/my repo"))
        self.assertEqual(argv[:2], ["osascript", "-e"])
        self.assertIn("cd '/Users/me/my repo' && claude --agent x", argv[2])
        self.assertIn('\\"quoted\\"', argv[2])

    def test_windows_has_no_builtin_terminal(self) -> None:
        with mock.patch.object(terminal, "available", return_value=False):
            with self.assertRaises(ValueError):
                terminal.open_term(str(Path.home()))

    def test_windows_claude_in_folder_needs_claude_exe(self) -> None:
        with tempfile.TemporaryDirectory() as d, mock.patch.object(launcher.sys, "platform", "win32"), \
                mock.patch.object(launcher.shutil, "which", return_value=None), mock.patch.object(launcher.subprocess, "Popen") as popen:
            ok, out = launcher.launch_claude_in(Path(d), "écris le skill")
        self.assertFalse(ok)
        self.assertIn("claude.exe", out)
        popen.assert_not_called()

    def test_windows_claude_in_folder_uses_argv(self) -> None:
        with tempfile.TemporaryDirectory() as d, mock.patch.object(launcher.sys, "platform", "win32"), \
                mock.patch.object(launcher.shutil, "which", return_value="C:/claude/claude.exe"), mock.patch.object(launcher.subprocess, "Popen") as popen:
            ok, _ = launcher.launch_claude_in(Path(d), 'a "b" & c')
        self.assertTrue(ok)
        self.assertEqual(popen.call_args.args[0], ["C:/claude/claude.exe", 'a "b" & c'])

    def test_global_hook_command_is_a_posix_path(self) -> None:
        home = Path.home().resolve()
        self.assertEqual(blueprints.hook_command(home, home / ".claude" / "hooks" / "h.sh"), f'bash "{(home / ".claude" / "hooks" / "h.sh").as_posix()}"')


class NetTests(unittest.TestCase):
    """The office on the internal network: only presence and chat, behind the join code."""

    def setUp(self) -> None:
        net.HUB.reset()

    def test_hub_cleans_what_it_keeps(self) -> None:
        ok, me = net.HUB.hello({"name": "Ada\x00<b>" + "x" * 50, "look": {"skin": "#f1c7a3", "evil": "javascript:alert(1)", "Bad": 1, "style": 99, "hat": "crown"}})
        self.assertTrue(ok)
        _, other = net.HUB.hello({"name": "Bob"})
        ok, snap = net.HUB.snapshot(other["sid"], 0)
        peer = snap["peers"][0]
        self.assertEqual(peer["name"], ("Ada <b>" + "x" * 50)[:24].strip())
        self.assertEqual(peer["look"], {"skin": "#f1c7a3", "hat": "crown"})
        self.assertNotIn("sid", peer)
        self.assertNotIn(me["sid"], json.dumps(snap))  # the others never see a sid
        self.assertFalse(net.HUB.state({"sid": me["sid"], "x": "nope"})[0])
        self.assertTrue(net.HUB.state({"sid": me["sid"], "room": "../../etc", "x": 1e9, "y": -5})[0])
        ok, snap = net.HUB.snapshot(other["sid"], 0)
        self.assertEqual((snap["peers"][0]["room"], snap["peers"][0]["x"], snap["peers"][0]["y"]), ("office", 900.0, 0.0))
        self.assertTrue(net.HUB.say({"sid": me["sid"], "text": "salut " * 100})[0])
        self.assertLessEqual(len(net.HUB.chat[-1]["text"]), 200)
        self.assertFalse(net.HUB.say({"sid": "unknown", "text": "hop"})[0])

    def test_full_office(self) -> None:
        for i in range(net.MAX_PEERS):
            self.assertTrue(net.HUB.hello({"name": f"c{i}"})[0])
        self.assertFalse(net.HUB.hello({"name": "one more"})[0])

    def test_lan_server_needs_the_code_and_serves_nothing_else(self) -> None:
        from http.server import ThreadingHTTPServer
        import urllib.request
        srv = ThreadingHTTPServer(("127.0.0.1", 0), net.LanHandler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        net.STATE["code"] = "ABC234"
        base = f"http://127.0.0.1:{srv.server_port}"
        def call(path: str, body: dict | None = None, code: str = "", origin: str = "") -> tuple[int, dict, dict]:
            req = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None, method="POST" if body is not None else "GET")
            req.add_header("Content-Type", "application/json")
            if code:
                req.add_header("X-Join-Code", code)
            if origin:
                req.add_header("Origin", origin)
            try:
                with urllib.request.urlopen(req) as r:
                    return r.status, json.loads(r.read()), dict(r.headers)
            except urllib.error.HTTPError as e:
                return e.code, json.loads(e.read() or b"{}"), dict(e.headers)
        try:
            self.assertEqual(call("/api/state")[0], 404)
            self.assertEqual(call("/net/hello", {"name": "x"})[0], 403)
            self.assertEqual(call("/net/hello", {"name": "x"}, "WRONG1")[0], 403)
            status, body, headers = call("/net/hello", {"name": "Guest"}, "abc234", "http://127.0.0.1:8765")
            self.assertEqual(status, 200)
            self.assertEqual(headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:8765")
            self.assertIsNone(call("/net/hello", {"name": "y"}, "ABC234", "https://evil.example")[2].get("Access-Control-Allow-Origin"))
            status, snap, _ = call(f"/net/peers?sid={body['sid']}&since=0", None, "ABC234")
            self.assertEqual(status, 200)
            self.assertIn("chat", snap)
        finally:
            srv.shutdown(); srv.server_close(); net.STATE["code"] = ""


class NetVisitTests(unittest.TestCase):
    """Each in its office; the layout an office sends is what its visitors get."""

    def setUp(self) -> None:
        net.HUB.reset()

    def test_sync_visiting_and_layout(self) -> None:
        _, a = net.HUB.hello({"name": "A"})
        _, b = net.HUB.hello({"name": "B"})
        self.assertRegex(a["pid"], r"^[0-9a-f]{8}$")
        ok, snap = net.act("sync", {"sid": b["sid"], "room": "lounge", "x": 10, "y": 90, "visiting": a["pid"], "since": 0})
        self.assertTrue(ok)
        ok, snap = net.act("sync", {"sid": a["sid"], "room": "office", "x": 1, "y": 80, "visiting": "not-a-pid", "since": 0})
        self.assertEqual(snap["peers"][0]["visiting"], a["pid"])
        self.assertEqual(net.HUB.peers[a["sid"]]["visiting"], "")
        self.assertTrue(net.act("layout", {"sid": a["sid"], "layout": {"rooms": ["office"], "items": []}})[0])
        ok, got = net.act("layout", {"sid": b["sid"], "pid": a["pid"]})
        self.assertEqual(got["layout"]["rooms"], ["office"])
        self.assertEqual(net.act("layout", {"sid": b["sid"], "pid": a["pid"], "at": got["at"]})[1], {"at": got["at"], "same": True})  # unchanged: not sent again
        self.assertFalse(net.act("layout", {"sid": a["sid"], "layout": {"x": "y" * (net.LAYOUT_MAX + 1)}})[0])
        self.assertFalse(net.act("layout", {"sid": "nobody", "pid": a["pid"]})[0])


class NetMessagesTests(unittest.TestCase):
    def setUp(self) -> None:
        net.HUB.reset()

    def test_private_messages_and_calls_reach_only_the_two(self) -> None:
        _, a = net.HUB.hello({"name": "A"})
        _, b = net.HUB.hello({"name": "B"})
        _, c = net.HUB.hello({"name": "C"})
        self.assertTrue(net.act("chat", {"sid": a["sid"], "text": "à tous"})[0])
        self.assertTrue(net.act("chat", {"sid": a["sid"], "text": "rien que pour B", "to": b["pid"]})[0])
        self.assertTrue(net.act("chat", {"sid": a["sid"], "kind": "invite", "to": b["pid"]})[0])
        self.assertFalse(net.act("chat", {"sid": a["sid"], "kind": "invite"})[0])  # a call needs someone to call
        self.assertFalse(net.act("chat", {"sid": a["sid"], "kind": "hack", "to": b["pid"], "text": "x"})[0])
        texts = lambda who: [m["text"] or m["kind"] for m in net.HUB.snapshot(who["sid"], 0)[1]["chat"] if m["kind"] != "system"]
        self.assertEqual(texts(b), ["à tous", "rien que pour B", "invite"])
        self.assertEqual(texts(c), ["à tous"])
        self.assertEqual(texts(a), ["à tous", "rien que pour B", "invite"])


class NetCrewTests(unittest.TestCase):
    def setUp(self) -> None:
        net.HUB.reset()

    def test_visitors_see_the_cleaned_team_and_act_only_where_they_are(self) -> None:
        _, a = net.HUB.hello({"name": "A"}, host=True)
        _, b = net.HUB.hello({"name": "B"})
        crew = [{"n": "Alice", "room": "office", "x": 120, "y": 140, "look": {"skin": "#f1c7a3", "beardColor": "#222222", "evil": "<script>"},
                 "pose": {"seated": True, "arms": "type", "dir": [0, -1], "z": 3, "hack": 1}, "b": "💻 au travail", "st": "work",
                 "ticket": "DEMO-1234", "cmd": "rm -rf /", "sk": [["💻 Développement", 4]], "mood": 80},
                {"n": "Bob", "room": "nowhere", "x": 1, "y": 1}]
        self.assertTrue(net.act("crew", {"sid": a["sid"], "crew": crew})[0])
        net.act("sync", {"sid": b["sid"], "room": "office", "x": 50, "y": 110, "visiting": a["pid"], "pose": {"seated": True, "arms": "nope"}})
        ok, snap = net.HUB.snapshot(b["sid"], 0)
        self.assertEqual([m["n"] for m in snap["crew"]], ["Alice"])  # the unknown room is dropped
        alice = snap["crew"][0]
        self.assertNotIn("ticket", alice)
        self.assertNotIn("cmd", alice)
        self.assertEqual(alice["look"], {"skin": "#f1c7a3", "beardColor": "#222222"})
        self.assertEqual(alice["pose"], {"seated": True, "arms": "type", "dir": [0.0, -1.0], "z": 3.0})
        net.act("crew", {"sid": a["sid"], "crew": [{"n": "Brume", "room": "office", "x": 10, "y": 90, "pet": "cat", "pm": "sleep", "fx": 12, "fy": 99, "pose": {"z": 12.6}},
                                                    {"n": "Rex", "room": "office", "x": 1, "y": 1, "pet": "tiger", "pm": "eat"}]})
        pets = net.HUB.snapshot(b["sid"], 0)[1]["crew"]
        self.assertEqual((pets[0]["pet"], pets[0]["pm"], pets[0]["fy"]), ("cat", "sleep", 99.0))
        self.assertNotIn("pet", pets[1])  # an unknown animal: a plain entry, nothing more
        self.assertNotIn("crew", net.HUB.snapshot(a["sid"], 0)[1])  # the host visits nobody
        self.assertEqual(next(p for p in net.HUB.snapshot(a["sid"], 0)[1]["peers"] if p["pid"] == b["pid"])["pose"], {"seated": True})
        # acts: to the office we are in, of a known kind only
        self.assertTrue(net.act("chat", {"sid": b["sid"], "kind": "act", "to": a["pid"], "text": "cheer:Alice"})[0])
        self.assertTrue(net.act("chat", {"sid": b["sid"], "kind": "act", "to": a["pid"], "text": "use:42:lamp"})[0])
        self.assertFalse(net.act("chat", {"sid": b["sid"], "kind": "act", "to": a["pid"], "text": "use:42:print"})[0])
        self.assertFalse(net.act("chat", {"sid": b["sid"], "kind": "act", "to": a["pid"], "text": "launch:agent"})[0])
        self.assertFalse(net.act("chat", {"sid": a["sid"], "kind": "act", "to": b["pid"], "text": "cheer:Bob"})[0])  # A is not visiting B
        acts = [m["text"] for m in net.HUB.snapshot(a["sid"], 0)[1]["chat"] if m["kind"] == "act"]
        self.assertEqual(acts, ["cheer:Alice", "use:42:lamp"])


class NetDuelPartyTests(unittest.TestCase):
    def setUp(self) -> None:
        net.HUB.reset()

    def test_duel_relay_presence_and_party(self) -> None:
        _, a = net.HUB.hello({"name": "A"}, host=True)
        _, b = net.HUB.hello({"name": "B"})
        _, c = net.HUB.hello({"name": "C"})
        self.assertTrue(net.act("chat", {"sid": a["sid"], "kind": "duel", "to": b["pid"], "text": "invite:pingpong:0a1b2c3d"})[0])
        self.assertFalse(net.act("chat", {"sid": a["sid"], "kind": "duel", "to": b["pid"], "text": "invite:poker:0a1b2c3d"})[0])
        self.assertTrue(net.act("chat", {"sid": a["sid"], "kind": "party", "text": "start", "to": b["pid"]})[0])
        self.assertFalse(net.act("chat", {"sid": a["sid"], "kind": "party", "text": "rave", "to": b["pid"]})[0])
        # the relay: each one gets the other's last state; a third player is refused
        self.assertEqual(net.act("duel", {"sid": a["sid"], "gid": "0a1b2c3d", "st": {"ball": [1, 2]}})[1], {"st": None, "watching": 0})
        ok, got = net.act("duel", {"sid": b["sid"], "gid": "0a1b2c3d", "st": {"py": 100}})
        self.assertEqual(got["st"], {"ball": [1, 2]})
        self.assertEqual(net.act("duel", {"sid": a["sid"], "gid": "0a1b2c3d", "st": {"ball": [3, 4]}})[1]["st"], {"py": 100})
        self.assertFalse(net.act("duel", {"sid": c["sid"], "gid": "0a1b2c3d", "st": {}})[0])
        self.assertFalse(net.act("duel", {"sid": a["sid"], "gid": "nope", "st": {}})[0])
        self.assertFalse(net.act("duel", {"sid": a["sid"], "gid": "0a1b2c3d", "st": {"x": "y" * net.DUEL_MAX}})[0])
        # emote and presence: known words only
        net.act("state", {"sid": b["sid"], "room": "office", "x": 1, "y": 1, "emote": "dance", "status": "dnd"})
        peer = next(p for p in net.HUB.snapshot(a["sid"], 0)[1]["peers"] if p["pid"] == b["pid"])
        self.assertEqual((peer["emote"], peer["status"]), ("dance", "dnd"))
        net.act("state", {"sid": b["sid"], "room": "office", "x": 1, "y": 1, "emote": "<b>", "status": "hacker"})
        peer = next(p for p in net.HUB.snapshot(a["sid"], 0)[1]["peers"] if p["pid"] == b["pid"])
        self.assertEqual((peer["emote"], peer["status"]), ("", "dnd"))
        # the teams of the afterwork come with the sync, when asked
        net.act("crew", {"sid": b["sid"], "crew": [{"n": "Zoé", "room": "lounge", "x": 1, "y": 1}]})
        ok, body = net.act("sync", {"sid": a["sid"], "room": "lounge", "x": 1, "y": 1, "want": [b["pid"], c["pid"]]})
        self.assertEqual(list(body["crews"]), [b["pid"]])


class NetMoreTests(unittest.TestCase):
    def setUp(self) -> None:
        net.HUB.reset()

    def test_spectators_calls_gifts_guestbook(self) -> None:
        _, a = net.HUB.hello({"name": "A"}, host=True)
        _, b = net.HUB.hello({"name": "B"})
        _, c = net.HUB.hello({"name": "C"})
        net.act("duel", {"sid": a["sid"], "gid": "0a1b2c3d", "st": {"ps": 2}})
        self.assertEqual(net.act("watch", {"sid": c["sid"], "gid": "0a1b2c3d", "pid": a["pid"]})[1], {"st": {"ps": 2}})
        self.assertEqual(net.act("duel", {"sid": a["sid"], "gid": "0a1b2c3d", "st": {"ps": 3}})[1]["watching"], 1)
        self.assertFalse(net.act("watch", {"sid": c["sid"], "gid": "ffffffff", "pid": a["pid"]})[0])
        net.act("state", {"sid": a["sid"], "room": "lounge", "x": 1, "y": 1, "duel": f"0a1b2c3d:darts:{b['pid']}"})
        self.assertEqual(next(p for p in net.HUB.snapshot(c["sid"], 0)[1]["peers"] if p["pid"] == a["pid"])["duel"], f"0a1b2c3d:darts:{b['pid']}")
        # the voice's set-up goes through a bigger relay; the call and gift words are checked
        sdp = {"sdp": "v=0" + "x" * 5000}
        self.assertTrue(net.act("rtc", {"sid": a["sid"], "gid": "11112222", "st": sdp})[0])
        self.assertEqual(net.act("rtc", {"sid": b["sid"], "gid": "11112222", "st": {"sdp": "answer"}})[1]["st"], sdp)
        self.assertFalse(net.act("duel", {"sid": a["sid"], "gid": "33334444", "st": sdp})[0])  # too big for a duel
        self.assertTrue(net.act("chat", {"sid": a["sid"], "kind": "visio", "to": b["pid"], "text": "ring:11112222"})[0])
        self.assertTrue(net.act("chat", {"sid": a["sid"], "kind": "gift", "to": b["pid"], "text": "croissants"})[0])
        self.assertFalse(net.act("chat", {"sid": a["sid"], "kind": "gift", "to": b["pid"], "text": "money:1000"})[0])
        self.assertTrue(net.act("chat", {"sid": a["sid"], "kind": "duel", "to": b["pid"], "text": "cheer:0a1b2c3d:fire"})[0])
        # a guestbook: only in the office we visit
        self.assertFalse(net.act("chat", {"sid": c["sid"], "kind": "guestbook", "to": a["pid"], "text": "Super bureau !"})[0])
        net.act("state", {"sid": c["sid"], "room": "office", "x": 1, "y": 1, "visiting": a["pid"]})
        self.assertTrue(net.act("chat", {"sid": c["sid"], "kind": "guestbook", "to": a["pid"], "text": "Super bureau !"})[0])

    def test_join_code_kept_between_starts(self) -> None:
        with tempfile.TemporaryDirectory() as d, mock.patch.object(config, "STATE_DIR", Path(d)):
            self.assertEqual(net.load_conf(), {})
            net.save_conf(code="ABCDEF", port=8770)
            net.save_conf(auto=True)
            self.assertEqual(net.load_conf(), {"code": "ABCDEF", "port": 8770, "auto": True})
            (Path(d) / "net.json").write_text('{"code": "<bad>", "port": 1}')
            self.assertEqual(net.load_conf(), {"code": "", "port": net.DEFAULT_PORT, "auto": False})


class NetRejoinTests(unittest.TestCase):
    def test_a_page_coming_back_replaces_its_session(self) -> None:
        net.HUB.reset()
        _, h1 = net.HUB.hello({"name": "H"}, host=True)
        _, g1 = net.HUB.hello({"name": "G"})
        _, g2 = net.HUB.hello({"name": "G", "old": g1["sid"]})
        _, h2 = net.HUB.hello({"name": "H"}, host=True)
        self.assertEqual(sorted(p["name"] for p in net.HUB.peers.values()), ["G", "H"])
        self.assertNotIn(g1["sid"], net.HUB.peers)
        self.assertNotIn(h1["sid"], net.HUB.peers)


class QuipTests(unittest.TestCase):
    """The devs' own words (quips.py): off by default, a daily cap, the comic's JSON, no real model call."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.patch = mock.patch.object(config, "STATE_DIR", Path(self.tmp.name))
        self.patch.start()
        quips._cache.clear()
        self.detail = {"status": "working", "ticket": "DEMO-1", "description": "Ajouter le refresh token", "eventCount": 3,
                       "events": [{"kind": "tool", "tool": "Bash", "label": "pytest"}, {"kind": "error", "label": "KeyError 'exp'"}],
                       "edits": [{"file": "/repo/src/auth/login.py", "new": "def refresh(): ..."}],
                       "terminal": [{"cmd": "pytest tests/", "failed": True, "out": "3 failed"}]}

    def tearDown(self) -> None:
        self.patch.stop()
        self.tmp.cleanup()

    def test_off_by_default_and_capped(self) -> None:
        self.assertFalse(quips.status()["on"])
        self.assertEqual(quips.ask("s", "p"), (None, "off"))
        quips.set_on(True)
        with mock.patch.object(quips, "engine", return_value="cli"), mock.patch.object(quips, "_cli", return_value=" Encore ce test ! "), mock.patch.object(quips, "GAP", 0):
            self.assertEqual(quips.ask("s", "p"), ("Encore ce test !", ""))
            s = quips.settings(); s["used"] = quips.DAILY_MAX; quips._save(s)
            self.assertEqual(quips.ask("s", "p"), (None, "limit"))

    def test_failed_call_gives_its_slot_back_and_off_wins(self) -> None:
        quips.set_on(True)
        with mock.patch.object(quips, "engine", return_value="cli"), mock.patch.object(quips, "_cli", return_value=None), mock.patch.object(quips, "GAP", 0):
            self.assertEqual(quips.ask("s", "p"), (None, "failed"))
            self.assertEqual(quips.settings()["used"], 0)
        call = mock.Mock(return_value="trop tard")
        with mock.patch.object(quips, "engine", return_value="cli"), mock.patch.object(quips, "_cli", call), \
                mock.patch.object(quips.time, "sleep", side_effect=lambda _s: quips.set_on(False)), mock.patch.object(quips, "_last", quips.time.time() + 5):
            self.assertEqual(quips.ask("s", "p"), (None, "off"))  # switched off during the wait: no call, the slot back
        call.assert_not_called()
        self.assertEqual(quips.settings(), {**quips.settings(), "on": False, "used": 0})

    def test_context_and_cache(self) -> None:
        ctx = quips.work_context(self.detail)
        self.assertIn("DEMO-1", ctx)
        self.assertIn("login.py", ctx)
        self.assertNotIn("/repo/src", ctx)
        self.assertIn("(échec)", ctx)
        with mock.patch.object(quips, "agent_detail", return_value=self.detail), mock.patch.object(quips, "ask", return_value=("« Ce KeyError me nargue 😤 »\nautre", "")) as ask:
            self.assertEqual(quips.quip("s1", "a1", "Léa"), {"line": "Ce KeyError me nargue 😤"})
            self.assertEqual(quips.quip("s1", "a1", "Léa"), {"line": "Ce KeyError me nargue 😤", "same": True})
            self.assertEqual(ask.call_count, 1)

    def test_comic_json(self) -> None:
        moments = [{"kind": "ticket", "hint": "DEMO-1"}, {"kind": "bug", "hint": "KeyError"}]
        answer = 'Voici : [{"caption": "Lundi matin.", "say": "Allez !"}, {"caption": "Le drame.", "say": "Non 😱"}]'
        with mock.patch.object(quips, "agent_detail", return_value=self.detail), mock.patch.object(quips, "ask", return_value=(answer, "")):
            self.assertEqual(quips.comic("s1", "a1", "Léa", moments)["panels"][1], {"caption": "Le drame.", "say": "Non 😱"})
        quips._cache.clear()
        with mock.patch.object(quips, "agent_detail", return_value=self.detail), mock.patch.object(quips, "ask", return_value=("pas de JSON", "")):
            self.assertEqual(quips.comic("s1", "a1", "Léa", moments), {"error": "failed"})


class SlackTests(unittest.TestCase):
    """The Slack channel of ChiefOS → Support, with a fake Slack API (no network)."""

    def fake(self, token: str, method: str, params: dict | None = None) -> dict:
        self.calls.append(method)
        if token != "xoxb-good-token-123":
            raise slack.SlackError(slack.ERRORS["invalid_auth"])
        return {
            "auth.test": {"ok": True, "team": "Acme", "url": "https://acme.slack.com/", "user": "office-bot"},
            "conversations.list": {"ok": True, "channels": [{"id": "C0SUPPORT1", "name": "support"}]},
            "conversations.info": {"ok": True, "channel": {"id": "C0SUPPORT1", "name": "support"}},
            "users.info": {"ok": True, "user": {"profile": {"display_name": "Léa"}}},
            "conversations.history": {"ok": True, "messages": [
                {"ts": "1700000002.000200", "user": "U1", "text": "Ping <@U1> voir <https://x.io/a|le ticket> &amp; merci", "reply_count": 2, "reactions": [{"name": "eyes", "count": 3}]},
                {"ts": "1700000001.000100", "subtype": "channel_join", "user": "U1", "text": "a rejoint"},
                {"ts": "1700000000.000100", "bot_profile": {"name": "Alertes"}, "text": "CI rouge"}]},
        }[method]

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        self.calls: list[str] = []
        self.patches = [mock.patch.object(config, "STATE_DIR", self.tmp), mock.patch.object(slack, "api", self.fake)]
        for p in self.patches:
            p.start()
        slack._cache.clear()
        slack._people.clear()

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def test_save_by_name_messages_and_token_never_shown(self) -> None:
        st = slack.save("xoxb-good-token-123", "#support")
        self.assertEqual(st, {"configured": True, "team": "Acme", "channel": "support", "channelId": "C0SUPPORT1", "bot": "office-bot"})
        self.assertEqual(oct((self.tmp / "slack.json").stat().st_mode & 0o777), "0o600")
        self.assertNotIn("xoxb", json.dumps(slack.status()))
        body = slack.messages()
        self.assertEqual([m["name"] for m in body["messages"]], ["Alertes", "Léa"])  # oldest first, the join skipped
        lea = body["messages"][1]
        self.assertEqual(lea["text"], "Ping @Léa voir le ticket (https://x.io/a) & merci")
        self.assertEqual((lea["replies"], lea["reactions"]), (2, [{"name": "eyes", "count": 3}]))
        self.assertEqual(lea["link"], "https://acme.slack.com/archives/C0SUPPORT1/p1700000002000200")
        self.assertNotIn("xoxb", json.dumps(body))
        n = self.calls.count("conversations.history")
        slack.messages()
        self.assertEqual(self.calls.count("conversations.history"), n)  # cached

    def test_refusals(self) -> None:
        self.assertEqual(slack.safe(lambda: slack.save("bad", "#support"))[0], 502)  # not a token
        self.assertIn("refusé", slack.safe(lambda: slack.save("xoxb-wrong-token-999", "#support"))[1]["error"])
        self.assertEqual(slack.safe(slack.messages)[1]["error"], "Slack n'est pas relié (ChiefOS → Réglages)")
        slack.save("xoxb-good-token-123", "C0SUPPORT1")
        self.assertEqual(slack.save("", "C0SUPPORT1")["configured"], True)  # an empty token keeps the saved one
        self.assertFalse(slack.forget()["configured"])


class InsightTests(unittest.TestCase):
    """ChiefOS → 💡 Idées (insights.py): shapes of commands and errors, recurring tasks / errors / corrections, no model call."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.projects = root / "projects"
        self.patches = [mock.patch.object(config, "STATE_DIR", root / "state"), mock.patch.object(config, "PROJECTS", self.projects),
                        mock.patch.object(insights, "list_files", return_value=[])]
        for p in self.patches:
            p.start()
        insights._result = None

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def session(self, name: str, day: str, records: list[dict]) -> Path:
        folder = self.projects / "-home-me-repos-demo"
        folder.mkdir(parents=True, exist_ok=True)
        first = {"type": "user", "timestamp": f"{day}T10:00:00Z", "message": {"role": "user", "content": "livre le ticket"}}
        return write_transcript(folder / f"{name}.jsonl", [first, *records])

    def test_command_shapes_skip_reading_and_heredocs(self) -> None:
        cmd = "cd x && python3 -I tools/gl.py mr-create --title 'a; b' | head\npython3 - <<'PY'\ndef f():\n  return 1\nPY\nnpm run build"
        self.assertEqual([s for s, _ in insights.command_tokens(cmd)], ["gl.py mr-create", "npm run"])
        self.assertEqual(insights.command_tokens("ls -la; cat a | grep b"), [])

    def test_error_signature_drops_paths_numbers_and_quotes(self) -> None:
        a = insights.error_signature("Exit code 2\nError: cannot open '/home/me/a.txt' at line 12")
        b = insights.error_signature("Exit code 2\nError: cannot open '/tmp/b.txt' at line 99")
        self.assertEqual(a, b)
        self.assertEqual(insights.error_signature("(eval):1: === not found"), insights.error_signature("(eval):3: ===== not found"))

    def test_recurring_task_needs_three_sessions_on_three_days(self) -> None:
        steps = lambda p: [tool_use(f"{p}1", "Bash", command="python3 tools/gl.py mr-create"), tool_result(f"{p}1"),
                           tool_use(f"{p}2", "Bash", command="python3 yt.py command X"), tool_result(f"{p}2"),
                           tool_use(f"{p}3", "Bash", command="python3 tools/gl.py mr-note 1"), tool_result(f"{p}3")]
        self.session("s1", "2026-10-01", steps("a"))
        self.session("s2", "2026-10-02", steps("b"))
        self.assertFalse([i for i in insights.compute()["items"] if i["kind"] == "task"])
        self.session("s3", "2026-10-03", steps("c"))
        tasks = [i for i in insights.compute()["items"] if i["kind"] == "task"]
        self.assertEqual(tasks[0]["steps"], ["gl.py mr-create", "yt.py command", "gl.py mr-note"])
        self.assertEqual(tasks[0]["sessions"], 3)

    def test_task_inside_a_named_skill_is_not_proposed(self) -> None:
        for i, day in enumerate(("2026-10-01", "2026-10-02", "2026-10-03")):
            self.session(f"s{i}", day, [tool_use(f"k{i}", "Skill", skill="deliver"), tool_result(f"k{i}"),
                                        *[r for j, c in enumerate(("make build", "make test", "make deploy")) for r in (tool_use(f"t{i}{j}", "Bash", command=c), tool_result(f"t{i}{j}"))]])
        self.assertFalse([i for i in insights.compute()["items"] if i["kind"] == "task"])

    def test_recurring_error_with_its_fix_and_corrections(self) -> None:
        for i, day in enumerate(("2026-10-01", "2026-10-02")):
            recs = [tool_use(f"e{i}", "Bash", command="pytest tests/x.py"), tool_result(f"e{i}", True, f"Exit code 1\nModuleNotFoundError: No module named 'jwt{i}'"),
                    tool_use(f"f{i}", "Bash", command="pytest -p no:cacheprovider tests/x.py"), tool_result(f"f{i}")]
            if i == 0:
                recs += [tool_use("e9", "Bash", command="pytest tests/y.py"), tool_result("e9", True, "Exit code 1\nModuleNotFoundError: No module named 'other'")]
            recs += [{"type": "user", "message": {"role": "user", "content": f"non, pas ça {n}"}} for n in range(2)]
            self.session(f"s{i}", day, recs)
        items = insights.compute()["items"]
        err = next(i for i in items if i["kind"] == "error")
        self.assertEqual((err["tool"], err["count"], err["sessions"]), ("pytest", 3, 2))
        self.assertEqual(err["fix"], "pytest -p no:cacheprovider tests/x.py")
        self.assertEqual(next(i for i in items if i["kind"] == "corrections")["count"], 4)

    def test_dismissed_items_are_hidden_and_digest_masks_secrets(self) -> None:
        for i, day in enumerate(("2026-10-01", "2026-10-02", "2026-10-03")):
            self.session(f"s{i}", day, [tool_use(f"e{i}", "Bash", command="curl x"), tool_result(f"e{i}", True, "Exit code 7\ncurl: (7) Failed to connect")])
        key = insights.insights()["items"][0]["key"]
        insights.dismiss(key)
        self.assertFalse([i for i in insights.insights()["items"] if i["key"] == key])
        self.assertNotIn("abc123", insights.redact("curl -H 'Authorization: Bearer abc123' -d token=abc123"))

    def test_ai_texts_are_kept_per_item_and_capped(self) -> None:
        item = {"key": "err:x|y", "kind": "error", "tool": "x", "signature": "y", "count": 3, "days": ["d"], "projects": ["p"], "samples": ["s"], "fix": ""}
        reply = json.dumps({"err:x|y": {"cause": "c", "remedy": "r", "junk": 1}})
        with mock.patch.object(insights.quips, "ask", return_value=(reply, "")) as ask:
            self.assertEqual(insights.write_ai([item]), {"written": 1})
            self.assertFalse(ask.call_args.kwargs["need_on"] is True)
        self.assertEqual(insights.state()["ai"]["err:x|y"], {"cause": "c", "remedy": "r"})
        raw = json.loads((config.STATE_DIR / "insights.json").read_text()); raw["aiUsed"] = insights.AI_DAILY
        (config.STATE_DIR / "insights.json").write_text(json.dumps(raw))
        self.assertEqual(insights.write_ai([{**item, "key": "err:z|w"}]), {"error": "limit"})


class LessonTests(unittest.TestCase):
    """ChiefOS → 📚 Leçons (lessons.py): harvest, the user's decisions, what a subagent receives, effect, the hook."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.patches = [mock.patch.object(config, "STATE_DIR", root / "state"), mock.patch.object(config, "QUESTIONS", root / "questions"),
                        mock.patch("office.questions.QUESTIONS", root / "questions")]
        for p in self.patches:
            p.start()
        lessons._harvest.update(at=0.0, running=False, error="", review=[], ci=[])
        self.err = {"key": "err:Bash|(eval):N: == not found", "kind": "error", "tool": "Bash", "signature": "(eval):N: == not found", "count": 14,
                    "sessions": 4, "days": ["2026-10-01", "2026-10-03"], "samples": ["(eval):1: === not found"], "fix": "", "projects": ["front"],
                    "projectShare": 1.0, "agents": ["feature-builder"], "agentShare": 0.8}

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def harvest(self, items: list[dict], summs: list[dict] | None = None) -> dict:
        with mock.patch.object(insights, "latest", return_value=({"items": items}, summs or [])):
            return lessons.harvest(network=False)

    def ask(self, qid: str, question: str, answer: str, created: float) -> None:
        folder = Path(self.tmp.name) / "questions"
        folder.mkdir(exist_ok=True)
        (folder / f"{qid}.json").write_text(json.dumps({"id": qid, "question": question, "answer": answer, "created": created, "answered": created + 5,
                                                         "from": "feature-builder", "cwd": "/home/me/repos/front"}))

    def test_harvest_proposes_once_and_never_again_after_a_decision(self) -> None:
        self.assertEqual(self.harvest([self.err])["added"], 1)
        x = lessons.load()["lessons"][0]
        self.assertEqual((x["id"], x["status"], x["scope"]), ("L-0001", "pending", {"agent": "feature-builder", "project": "front"}))
        lessons.decide("L-0001", "reject")
        self.assertEqual(self.harvest([self.err])["added"], 0)
        self.assertEqual(len(lessons.load()["lessons"]), 1)

    def test_a_question_asked_twice_becomes_a_faq(self) -> None:
        now = time.time()
        self.ask("q1", "Quelle branche cible pour la MR front ?", "main", now - 3000)
        self.harvest([])
        self.assertFalse(lessons.load()["lessons"])
        self.ask("q2", "Quelle branche cible pour cette MR front ?", "develop", now - 100)
        self.harvest([])
        faq = lessons.load()["lessons"][0]
        self.assertEqual(faq["kind"], "faq")
        self.assertIn("develop", faq["text"])
        self.assertEqual(faq["scope"], {"agent": "feature-builder", "project": "front"})

    def test_only_validated_lessons_of_the_right_scope_are_given(self) -> None:
        self.harvest([self.err])
        event = {"tool_name": "Agent", "cwd": "/home/me/repos/front", "tool_input": {"subagent_type": "feature-builder", "description": "Livre DEMO-1", "prompt": "Livre DEMO-1"}}
        self.assertIsNone(lessons.hook_output(event))  # still pending
        lessons.decide("L-0001", "approve", {"text": "Sous zsh, citer les séparateurs : echo '==='."})
        out = lessons.hook_output(event)["hookSpecificOutput"]
        self.assertEqual(out["hookEventName"], "PreToolUse")
        self.assertTrue(out["updatedInput"]["prompt"].startswith("Livre DEMO-1"))
        self.assertIn("[L-0001] Sous zsh, citer", out["updatedInput"]["prompt"])
        self.assertEqual(out["updatedInput"]["subagent_type"], "feature-builder")
        self.assertIsNone(lessons.hook_output({**event, "tool_input": out["updatedInput"]}))  # never twice
        self.assertIsNone(lessons.hook_output({**event, "cwd": "/home/me/repos/other"}))  # another project
        self.assertIsNone(lessons.hook_output({**event, "tool_input": {**event["tool_input"], "subagent_type": "mr-reviewer"}}))
        self.assertEqual(lessons.injections()[0]["ids"], ["L-0001"])
        with mock.patch.dict(config.CFG, {"lessons": False}):
            self.assertIsNone(lessons.hook_output(event))

    def test_injection_is_capped(self) -> None:
        data = {"seq": 9, "lessons": [{"id": f"L-000{i}", "key": f"k{i}", "kind": "correction", "status": "active", "text": "x" * 200,
                                       "scope": {"agent": "", "project": ""}, "words": []} for i in range(1, 10)]}
        lessons.save(data)
        chosen = lessons.select("feature-builder", "mission", "/r/x")
        self.assertLessEqual(len(chosen), lessons.MAX_INJECT)
        self.assertLessEqual(len(lessons.block(chosen)), lessons.MAX_CHARS + 300)

    def test_effect_ok_when_the_error_stops_and_ko_when_it_goes_on(self) -> None:
        self.harvest([self.err])
        lessons.decide("L-0001", "approve")
        data = lessons.load()
        data["lessons"][0].update(decided=time.time() - 7 * 86_400, decidedDay="2026-10-10")
        quiet = [{"day": "2026-10-12", "errors": []}]
        noisy = [{"day": "2026-10-12", "errors": [["Bash", "(eval):N: == not found", "", ""]] * 6}]
        with mock.patch.object(insights, "latest", return_value=({"items": []}, quiet)):
            lessons.measure(data)
        self.assertEqual(data["lessons"][0]["effect"], "ok")
        with mock.patch.object(insights, "latest", return_value=({"items": []}, noisy)):
            lessons.measure(data)
        self.assertEqual(data["lessons"][0]["effect"], "ko")
        self.assertEqual(lessons.expertise(data)[0]["agent"], "feature-builder")

    def test_review_and_ci_lessons(self) -> None:
        remarks = [{"mr": f"u{i}", "project": "front", "agent": "feature-builder", "text": "Avoid using any type in TypeScript props", "day": "2026-10-0%d" % (i + 1), "file": "a.ts"} for i in range(2)]
        self.assertEqual(lessons.review_lessons(remarks)[0]["scope"]["project"], "front")
        self.assertFalse(lessons.review_lessons(remarks[:1]))
        ci = lessons.ci_lessons([{"mr": "u", "project": "ledger", "agent": "x", "job": "lint-py", "stage": "test", "sig": "e501 line too long", "day": "2026-10-02", "fixed": True}])
        self.assertIn("lint-py", ci[0]["text"])

    def test_hook_command_prints_the_new_input_alone(self) -> None:
        import subprocess as sp
        home = Path(self.tmp.name) / "home"
        state = home / ".claude" / "agent-office"
        state.mkdir(parents=True)
        (state / "lessons.json").write_text(json.dumps({"seq": 1, "lessons": [{"id": "L-0001", "key": "k", "kind": "error", "status": "active",
                                                                              "text": "Citer les séparateurs sous zsh.", "scope": {"agent": "", "project": ""}, "words": []}]}))
        event = {"tool_name": "Agent", "cwd": "/tmp", "tool_input": {"subagent_type": "Explore", "description": "d", "prompt": "Find X"}}
        bin_office = Path(__file__).resolve().parent.parent.parent / "bin" / "office.py"
        run = sp.run([sys.executable, "-I", str(bin_office), "hook-lessons"], input=json.dumps(event), capture_output=True, text=True,
                     env={**os.environ, "HOME": str(home)}, timeout=30)
        self.assertEqual(run.returncode, 0)
        self.assertIn("[L-0001]", json.loads(run.stdout)["hookSpecificOutput"]["updatedInput"]["prompt"])

    def test_transcript_reports_the_lessons_received(self) -> None:
        folder = Path(self.tmp.name) / "s" / "subagents"
        folder.mkdir(parents=True)
        path = write_transcript(folder / "agent-a1.jsonl", [{"type": "user", "message": {"role": "user", "content": "Livre X" + lessons.block([{"id": "L-0003", "text": "t"}])}}])
        self.assertEqual(transcripts.subagent(path, time.time())["lessons"], ["L-0003"])


class KnowhowTests(unittest.TestCase):
    """ChiefOS → 🗺️ Compétences (knowhow.py): the topics of a run and how it went."""

    def test_topics_from_files_and_commands(self) -> None:
        home = str(Path.home())
        files = [f"{home}/repos/front/src/features/kanban/Board.tsx", f"{home}/repos/front/src/features/kanban/Board.test.tsx"]
        t = knowhow.topics_of(files, ["cd x && python3 -I tools/gl.py mr-create --title Q", "grep -rn docker src"])
        self.assertEqual(t["proj:front"], 1.0)
        self.assertEqual(t["zone:front/kanban"], 1.0)
        self.assertEqual((t["tech:React"], t["tech:Tests"]), (1.0, 0.5))
        self.assertEqual(t["tool:GitLab"], 1.0)
        self.assertNotIn("tool:Docker", t)  # a word in a grep is not a tool used

    def test_a_reviewer_gets_the_repository_its_commands_work_in(self) -> None:
        t = knowhow.topics_of([], ["git -C ~/repos/billing-api diff main", "python3 -I ~/repos/.claude/tools/gl.py mr-diff 12"], "repos")
        self.assertEqual(t["proj:billing-api"], 1.0)
        self.assertNotIn("proj:repos", t)

    def test_outcome(self) -> None:
        good = {"status": "done", "tests": {"ok": True}, "mr": "u1", "errors": 0}
        self.assertEqual(knowhow.outcome(good, set(), False), (4.0, ["livré", "tests verts", "MR"]))
        self.assertEqual(knowhow.outcome(good, {"u1"}, True)[0], 2.0)
        self.assertEqual(knowhow.outcome({"status": "blocked", "errors": 12}, set(), False)[0], -3.0)
