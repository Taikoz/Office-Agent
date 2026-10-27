"""ChiefOS → generated applications (stdlib only): python3 -I -m unittest discover -s tests"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from office import apps, config, gitlab, integrations  # noqa: E402

MRS = {"configured": True, "user": "me", "review": [{"title": "Fix\nthe cart", "ref": "demo/api!42", "authorName": "Alice", "ci": "failed", "draft": False,
                                                     "conflicts": False, "threadsOk": True, "updated": "2026-10-27T10:00:00Z", "url": "https://gitlab.example.com/demo/api/-/merge_requests/42"},
                                                    {"title": "Odd link", "ref": "demo/api!43", "url": "javascript:alert(1)"}],
       "mine": [], "assigned": []}


class AppsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        self.patches = [mock.patch.object(config, "STATE_DIR", self.tmp), mock.patch.object(config, "VAULT_KEY", self.tmp / "k" / "vault.key"),
                        mock.patch.object(gitlab, "CONF_FILE", self.tmp / "gitlab.json")]
        for p in self.patches:
            p.start()
        integrations._checks.clear()
        gitlab._cache.clear()
        with mock.patch.object(gitlab, "api", lambda conf, path, *a, **k: {"username": "me"} if path == "/user" else {"scopes": ["read_api"]}):
            integrations.configure("gitlab", {"url": "https://gitlab.example.com", "token": "glpat-" + "x" * 20})

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def test_every_view_reads_a_declared_operation(self) -> None:
        for c in integrations.all_connectors():
            for v in c.views:
                self.assertIn(v.op, c.reads, f"{c.id}.{v.id}")

    def test_a_scoped_view_keeps_its_project_key_in_every_row(self) -> None:
        app = apps.create("gitlab", "mrs_review")
        with mock.patch.object(gitlab, "my_mrs", return_value=MRS):
            rows = apps.data(app["id"])["rows"]
        self.assertEqual(app["template"]["scope"], ["gitlab_ref", "ref"])
        self.assertTrue(all(r["ref"] for r in rows))
        for c in integrations.all_connectors():
            for v in c.views:
                if v.scope:
                    self.assertIn(v.scope[0], ("gitlab_ref", "gitlab_project", "sentry"), f"{c.id}.{v.id}")

    def test_create_persist_and_read_an_app(self) -> None:
        app = apps.create("gitlab", "mrs_review")
        self.assertEqual((app["name"], app["icon"], app["state"]), ("MR à relire · GitLab", "👀", "ready"))
        self.assertEqual([a["id"] for a in apps.list_apps()["apps"]], [app["id"]])  # persisted
        with mock.patch.object(gitlab, "my_mrs", return_value=MRS):
            d = apps.data(app["id"])
        self.assertEqual(d["state"], "ready")
        self.assertEqual(d["rows"][0]["title"], "Fix the cart")  # control characters out
        self.assertEqual(d["rows"][0]["ci"], "failed")
        self.assertEqual(d["rows"][1]["url"], "")  # only a web address is a link
        self.assertNotIn("glpat-", (self.tmp / "apps.json").read_text())

    def test_an_edited_record_reaches_nothing_more(self) -> None:
        app = apps.create("gitlab", "mrs_review", params={"project": "7", "evil": "1"})
        self.assertEqual(app["params"], {})  # the view declares no param
        saved = json.loads((self.tmp / "apps.json").read_text())
        saved["apps"][0].update({"op": "job_log", "params": {"project": "1", "job": "2"}})
        (self.tmp / "apps.json").write_text(json.dumps(saved))
        with mock.patch.object(gitlab, "my_mrs", return_value=MRS) as mrs, mock.patch.object(gitlab, "job_log") as log:
            apps.data(app["id"])
        mrs.assert_called_once()
        log.assert_not_called()

    def test_an_unknown_template_or_connector_is_refused(self) -> None:
        self.assertEqual(apps.safe(lambda: apps.create("gitlab", "delete_repo"))[0], 404)
        self.assertEqual(apps.safe(lambda: apps.create("nope", "x"))[0], 404)

    def test_a_lost_connection_keeps_the_app_and_says_why(self) -> None:
        app = apps.create("gitlab", "red_pipelines")
        with mock.patch.object(gitlab, "failing_pipelines", side_effect=gitlab.GitLabError("jeton refusé (expiré ou révoqué ?)")) as fp:
            fp.side_effect.__cause__ = urllib.error.HTTPError("u", 401, "x", {}, None)  # type: ignore[arg-type]
            d = apps.data(app["id"])
        self.assertEqual((d["state"], d["connection"]), ("connection", "invalid"))
        integrations.disconnect("gitlab")
        self.assertEqual(apps.data(app["id"])["state"], "connection")
        self.assertEqual(len(apps.list_apps()["apps"]), 1)  # never deleted by a lost connection

    def test_rename_disable_and_delete(self) -> None:
        app = apps.create("gitlab", "mrs_mine")
        self.assertEqual(apps.update(app["id"], {"name": "Mes MR à moi", "enabled": False})["state"], "disabled")
        self.assertEqual(apps.data(app["id"])["state"], "disabled")
        self.assertEqual(apps.update(app["id"], {"enabled": True})["name"], "Mes MR à moi")
        self.assertEqual(apps.delete(app["id"]), {"apps": []})
        self.assertEqual(apps.safe(lambda: apps.data(app["id"]))[0], 404)


if __name__ == "__main__":
    unittest.main()
