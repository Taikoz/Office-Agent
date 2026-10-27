"""ChiefOS → 🔌 Intégrations (stdlib only): python3 -I -m unittest discover -s tests"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from office import config, gitlab, integrations, sentry, slack  # noqa: E402

TOKEN = "glpat-" + "s3cr3t" * 4


def http_error(code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError("https://gitlab.example.com/api/v4/user", code, "x", {}, None)  # type: ignore[arg-type]


class Base(unittest.TestCase):
    def setUp(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        self.patches = [mock.patch.object(config, "STATE_DIR", tmp), mock.patch.object(config, "VAULT_KEY", tmp / "key" / "vault.key"),
                        mock.patch.object(gitlab, "CONF_FILE", tmp / "gitlab.json")]
        for p in self.patches:
            p.start()
        self.tmp = tmp
        integrations._checks.clear()
        gitlab._cache.clear()

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def connect_gitlab(self) -> dict:
        def api(conf: dict, path: str, *a: object, **k: object) -> dict:
            return {"username": "adrien"} if path == "/user" else {"scopes": ["read_api"], "expires_at": "2999-01-01"}
        with mock.patch.object(gitlab, "api", api):
            return integrations.configure("gitlab", {"url": "https://gitlab.example.com", "token": TOKEN, "admin": "true"})


class CatalogueTest(Base):
    def test_the_three_providers_are_declared_with_their_form(self) -> None:
        cat = integrations.catalogue()
        ids = [c["id"] for c in cat["connectors"]]
        self.assertEqual(ids[:3], ["gitlab", "sentry", "slack"])
        gl = cat["connectors"][0]
        self.assertEqual([f["key"] for f in gl["auth"][0]["fields"]], ["url", "token"])
        self.assertEqual(gl["auth"][0]["fields"][1]["kind"], "secret")
        self.assertIn("merge_requests", gl["reads"])
        self.assertEqual(gl["writes"], [])

    def test_a_connector_without_its_operation_or_with_an_unknown_domain_is_refused(self) -> None:
        base = integrations.get("slack")
        bad_op = integrations.Connector(**{**base.__dict__, "id": "x1", "reads": {}})
        bad_domain = integrations.Connector(**{**base.__dict__, "id": "x2", "capabilities": (integrations.Capability("a", "sales", "a"),)})
        with self.assertRaises(ValueError):
            integrations.register(bad_op)
        with self.assertRaises(ValueError):
            integrations.register(bad_domain)


class ConnectionTest(Base):
    def test_not_configured_until_connected(self) -> None:
        states = {c["id"]: c["state"] for c in integrations.connections()["connections"]}
        self.assertEqual(states, {"gitlab": "not_configured", "sentry": "not_configured", "slack": "not_configured"})

    def test_connect_keeps_the_token_sealed_and_never_returns_it(self) -> None:
        conn = self.connect_gitlab()
        self.assertEqual(conn["state"], "connected")
        self.assertIn("@adrien", conn["account"])
        everything = json.dumps({**integrations.catalogue(), **integrations.connections(), "c": conn})
        self.assertNotIn(TOKEN, everything)
        on_disk = (self.tmp / "gitlab.json").read_text()
        self.assertNotIn(TOKEN, on_disk)
        self.assertNotIn("admin", on_disk)  # an undeclared field is dropped
        self.assertEqual(gitlab.load()["token"], TOKEN)

    def test_check_tells_why_a_token_no_longer_works(self) -> None:
        self.connect_gitlab()
        for code, state in ((401, "invalid"), (403, "insufficient")):
            with mock.patch.object(gitlab.vault, "open_authed", side_effect=http_error(code)):
                self.assertEqual(integrations.check("gitlab")["state"], state)
        with mock.patch.object(gitlab.vault, "open_authed", side_effect=urllib.error.URLError("down")):
            self.assertEqual(integrations.check("gitlab")["state"], "unreachable")

    def test_an_expired_token_is_shown_as_expired(self) -> None:
        self.connect_gitlab()
        with mock.patch.object(integrations.get("gitlab"), "status", return_value={"configured": True, "url": "u", "user": "a", "expires": "2001-01-01"}):
            self.assertEqual(integrations.connection(integrations.get("gitlab"))["state"], "expired")

    def test_disconnect_forgets_the_token(self) -> None:
        self.connect_gitlab()
        self.assertEqual(integrations.disconnect("gitlab")["state"], "not_configured")
        self.assertFalse((self.tmp / "gitlab.json").exists())

    def test_a_refused_token_is_a_readable_400(self) -> None:
        with mock.patch.object(gitlab.vault, "open_authed", side_effect=http_error(401)):
            code, body = integrations.safe(lambda: integrations.configure("gitlab", {"url": "https://gitlab.example.com", "token": TOKEN}))
        self.assertEqual(code, 400)
        self.assertIn("jeton refusé", body["error"])


class RunTest(Base):
    def test_only_declared_reads_of_a_connected_service_run(self) -> None:
        self.assertEqual(integrations.safe(lambda: integrations.run("gitlab", "merge_requests"))[0], 403)  # not connected
        self.connect_gitlab()
        self.assertEqual(integrations.safe(lambda: integrations.run("gitlab", "forget"))[0], 403)  # not a declared read
        self.assertEqual(integrations.safe(lambda: integrations.run("nope", "x"))[0], 404)
        with mock.patch.object(gitlab, "mr_detail", return_value={"ok": 1}) as detail:
            self.assertEqual(integrations.run("gitlab", "merge_request", {"project": "7", "iid": "42"}), {"ok": 1})
            detail.assert_called_once_with(7, 42)
        self.assertEqual(integrations.safe(lambda: integrations.run("gitlab", "merge_request", {"project": "../x", "iid": "1"}))[0], 403)

    def test_the_other_providers_errors_are_readable(self) -> None:
        for err in (sentry.SentryError("a"), slack.SlackError("b")):
            def boom(e: Exception = err) -> None:
                raise e
            self.assertEqual(integrations.safe(boom)[0], 400)


class RouteTest(Base):
    def test_the_routes_need_the_page_token_and_never_return_a_secret(self) -> None:
        import http.client
        import threading
        from http.server import ThreadingHTTPServer

        from office import routes
        srv = ThreadingHTTPServer(("127.0.0.1", 0), routes.make_handler(60, mock.MagicMock()))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        port = srv.server_address[1]

        def call(method: str, path: str, body: dict | None = None, token: bool = True) -> tuple[int, str]:
            c = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
            headers = {"Origin": f"http://127.0.0.1:{port}", "Content-Type": "application/json", **({"X-Office-Token": routes.TOKEN} if token else {})}
            c.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
            r = c.getresponse()
            return r.status, r.read().decode()
        try:
            self.assertEqual(call("GET", "/api/integrations", token=False)[0], 403)
            self.assertEqual(call("POST", "/api/integrations/config", {"id": "gitlab"}, token=False)[0], 403)
            with mock.patch.object(gitlab, "api", lambda conf, path, *a, **k: {"username": "adrien"} if path == "/user" else {"scopes": ["read_api"]}):
                code, text = call("POST", "/api/integrations/config", {"id": "gitlab", "values": {"url": "https://gitlab.example.com", "token": TOKEN}})
            self.assertEqual((code, json.loads(text)["state"]), (200, "connected"))
            code, text = call("GET", "/api/integrations")
            self.assertEqual(code, 200)
            self.assertNotIn(TOKEN, text)
            self.assertEqual({c["id"]: c["state"] for c in json.loads(text)["connections"]}["gitlab"], "connected")
            self.assertEqual(call("GET", "/api/integrations/run?id=gitlab&op=forget")[0], 403)
            self.assertEqual(call("POST", "/api/integrations/config", {"id": "gitlab", "forget": True})[0], 200)
            self.assertFalse((self.tmp / "gitlab.json").exists())
        finally:
            srv.shutdown()


if __name__ == "__main__":
    unittest.main()
