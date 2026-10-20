"""ChiefOS → 🚚 Livraisons (stdlib only): python3 -I -m unittest discover -s tests"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from office import deliveries  # noqa: E402


class ImagesTest(unittest.TestCase):
    def test_repository_and_tag(self) -> None:
        text = 'chartVersion: 2.6.11\nimage:\n  registry: "eu.pkg.dev/x"\n  repository: "group/app/api/api_3.13.5"\n  tag: "2026.10.16.0"\nenv: dev\n'
        self.assertEqual(deliveries.images(text), [("group/app/api/api_3.13.5", "2026.10.16.0")])

    def test_name_tag_blocks_and_sidecars(self) -> None:
        text = "app:\n  image:\n    name: eu.pkg.dev/p/containers/core/cat/app\n    tag: 0.0.70\n  sidecars:\n    cleaner:\n      image:\n        name: eu.pkg.dev/p/c/cleaner\n        tag: 0.0.70\n"
        self.assertEqual(deliveries.images(text), [("eu.pkg.dev/p/containers/core/cat/app", "0.0.70"), ("eu.pkg.dev/p/c/cleaner", "0.0.70")])

    def test_inline_image_and_no_pairing_across_blocks(self) -> None:
        text = "web:\n  image: registry.io/team/web:1.2.3\nother:\n  name: not-an-image\nchart:\n  tag: 9.9.9\n"
        self.assertEqual(deliveries.images(text), [("registry.io/team/web", "1.2.3")])


class HelpersTest(unittest.TestCase):
    def test_project_candidates(self) -> None:
        self.assertEqual(deliveries.project_candidates("group/app/api/api_3.13.5"), ["group/app/api/api_3.13.5", "group/app/api", "group/app"])
        self.assertEqual(deliveries.project_candidates("eu.pkg.dev/p/c/app")[0], "p/c/app")

    def test_env_kind(self) -> None:
        self.assertEqual([deliveries.env_kind(e) for e in ("core-dev", "core-stg", "core-prd-eu-west1", "production", "misc")], ["dev", "stg", "prd", "prd", ""])

    def test_version_order(self) -> None:
        tags = ["2026.10.16.0", "2026.9.30.2", "2026.10.14.1", "2026.10.14.0"]
        self.assertEqual(sorted(tags, key=deliveries.version_key), ["2026.9.30.2", "2026.10.14.0", "2026.10.14.1", "2026.10.16.0"])
        self.assertLess(deliveries.version_key("0.0.70.dev1"), deliveries.version_key("0.0.70"))
        self.assertLess(deliveries.version_key("0.0.70"), deliveries.version_key("0.0.71.dev0"))


class BeforeProdTest(unittest.TestCase):
    def test_yaml_keys(self) -> None:
        text = "image:\n  tag: 1\nenvVariables:\n  apiUrl: x\n  flag: \"true\"\nlist:\n- name: a\n  value: b\nblock: |\n  raw\n"
        self.assertEqual(deliveries.yaml_keys(text), {"image.tag", "envVariables.apiUrl", "envVariables.flag", "list.name", "list.value"})

    def test_config_gaps(self) -> None:
        envs = {"core-prd": {"text": "image:\n  tag: 1\nenvVariables:\n  apiUrl: p\n"},
                "core-stg": {"text": "image:\n  tag: 2\nenvVariables:\n  apiUrl: s\n  newFlag: on\n"},
                "core-dev": {"text": "envVariables:\n  apiUrl: d\n"}}
        self.assertEqual(deliveries.config_gaps(envs), [{"env": "core-stg", "keys": ["envVariables.newFlag"], "more": 0}])
        self.assertEqual(deliveries.config_gaps({"core-dev": {"text": "a: 1\n"}}), [])

    def test_risk_patterns(self) -> None:
        kind = lambda path: next((k for k, _l, pat in deliveries.RISKS if pat.search(path)), None)
        self.assertEqual(kind("alembic/versions/0042_rules.py"), "migration")
        self.assertEqual(kind("app/db/migrations/0001_init.py"), "migration")
        self.assertEqual(kind("uv.lock"), "deps")
        self.assertEqual(kind("front/package.json"), "deps")
        self.assertEqual(kind("env/.env.dev"), "config")
        self.assertEqual(kind("helm/values.yaml"), "config")
        self.assertIsNone(kind("src/components/chart/Charts.tsx"))
        found = [next(g for g in m.groups() if g) for m in deliveries.ENV_RE.finditer('x = os.getenv("API_KEY") or import.meta.env.VITE_URL')]
        self.assertEqual(found, ["API_KEY", "VITE_URL"])


if __name__ == "__main__":
    unittest.main()
