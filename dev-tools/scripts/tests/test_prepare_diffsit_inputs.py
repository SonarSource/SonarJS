import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sit_pr_diffsit.prepare_diffsit_inputs import prepare_inputs


class PrepareDiffsitInputsTest(unittest.TestCase):
    def test_prepare_inputs_ignores_hidden_directories_in_flat_target_exports(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            base_dir = root / "base"
            target_dir = root / "target"
            reports_dir = root / "reports"
            manifest_output = root / "build" / "diffsit-manifest.json"

            (base_dir / "project-a").mkdir(parents=True)
            (base_dir / "project-a" / "issues.jsonl").write_text("", encoding="utf-8")

            (target_dir / "project-a").mkdir(parents=True)
            (target_dir / "project-a" / "issues.jsonl").write_text("", encoding="utf-8")
            (target_dir / ".work").mkdir(parents=True)

            manifest = prepare_inputs(
                rules_json=json.dumps([{"language": "javascript", "rule_id": "S2068"}]),
                base_dir=base_dir,
                target_dir=target_dir,
                reports_dir=reports_dir,
                manifest_output=manifest_output,
                rule_key_format="{language}:{rule_id}",
                flat_bundles=True,
            )

            self.assertEqual(1, len(manifest["runs"]))
            self.assertTrue(manifest_output.is_file())


if __name__ == "__main__":
    unittest.main()
