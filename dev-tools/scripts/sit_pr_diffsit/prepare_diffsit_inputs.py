"""Prepare language-scoped DiffSIT inputs and a run manifest.

The workflow downloads target and baseline SIT exports from the current run.
This script aligns those directories so DiffSIT can compare one language at a
time without Python invoking DiffSIT.
"""

import argparse
import json
import shutil
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sit_pr_fps.common import resolve_path_under

REPORT_FILES = {
    "json": "diffsit-report.json",
    "text": "diffsit-report.txt",
    "html": "diffsit-report.html",
}
ISSUES_FILE = "issues.jsonl"


def path_under_cwd(label: str):
    def parse_path(value: str) -> Path:
        try:
            return resolve_path_under(Path.cwd(), value, label)
        except ValueError as err:
            raise argparse.ArgumentTypeError(str(err)) from err

    return parse_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare DiffSIT inputs for the SIT PR workflow")
    parser.add_argument("--rules-json", required=True)
    parser.add_argument("--base-dir", required=True, type=path_under_cwd("--base-dir"))
    parser.add_argument("--target-dir", required=True, type=path_under_cwd("--target-dir"))
    parser.add_argument("--reports-dir", required=True, type=path_under_cwd("--reports-dir"))
    parser.add_argument("--manifest-output", required=True, type=path_under_cwd("--manifest-output"))
    parser.add_argument(
        "--rule-key-format",
        default="{language}dre:{rule_id}",
        help=(
            "Python format string for full rule keys used in the DiffSIT "
            "rule-filter (default keeps sonar-skunk's DRE convention)."
        ),
    )
    parser.add_argument(
        "--flat-bundles",
        action="store_true",
        help=(
            "If set, treat --base-dir and --target-dir as flat bundle "
            "directories (no language sub-layer)."
        ),
    )
    return parser.parse_args()


def load_rules(rules_json: str) -> dict[str, list[str]]:
    try:
        raw_rules = json.loads(rules_json)
    except json.JSONDecodeError as err:
        raise ValueError(f"rules_json must be valid JSON: {err}") from err

    if not isinstance(raw_rules, list):
        raise ValueError("rules_json must be a JSON array")

    grouped: dict[str, set[str]] = defaultdict(set)
    for raw_rule in raw_rules:
        if not isinstance(raw_rule, dict):
            raise ValueError("each rules_json entry must be an object")

        language = raw_rule.get("language")
        rule_id = raw_rule.get("rule_id")
        if not isinstance(language, str) or not language:
            raise ValueError("each rules_json entry must have a non-empty string language")
        if not isinstance(rule_id, str) or not rule_id:
            raise ValueError("each rules_json entry must have a non-empty string rule_id")

        grouped[language.lower()].add(rule_id.upper())

    return {language: sorted(rule_keys) for language, rule_keys in sorted(grouped.items())}


def exported_rule_key(language: str, rule_key: str, rule_key_format: str) -> str:
    return rule_key_format.format(language=language, rule_id=rule_key)


def visible_directories(root: Path) -> list[Path]:
    return [
        path for path in sorted(root.iterdir()) if path.is_dir() and not path.name.startswith(".")
    ]


def list_project_exports(language_dir: Path, label: str) -> dict[str, Path]:
    if not language_dir.is_dir():
        raise FileNotFoundError(f"{label} language export directory does not exist: {language_dir}")

    project_dirs = visible_directories(language_dir)
    missing_issue_files = [
        project_dir.name for project_dir in project_dirs if not (project_dir / ISSUES_FILE).is_file()
    ]
    if missing_issue_files:
        missing_projects = ", ".join(missing_issue_files)
        raise FileNotFoundError(
            f"{label} project export(s) missing {ISSUES_FILE} under {language_dir}: {missing_projects}"
        )

    projects = {project_dir.name: project_dir for project_dir in project_dirs}
    if not projects:
        raise FileNotFoundError(f"{label} language export directory contains no project exports: {language_dir}")
    return projects


def copy_project_export(source: Path, destination: Path) -> None:
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination)


def synthesize_empty_baseline(target_project_dir: Path, destination: Path) -> None:
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True, exist_ok=True)
    (destination / ISSUES_FILE).write_text("", encoding="utf-8")

    target_metadata = target_project_dir / "metadata.json"
    if target_metadata.is_file():
        shutil.copy2(target_metadata, destination / "metadata.json")


def prepare_language_base(base_dir: Path, target_dir: Path, prepared_base_dir: Path, language: str) -> None:
    target_language_dir = target_dir / language
    target_projects = list_project_exports(target_language_dir, "target")

    prepared_language_base = prepared_base_dir / language
    if prepared_language_base.exists():
        shutil.rmtree(prepared_language_base)
    prepared_language_base.mkdir(parents=True, exist_ok=True)

    base_language_dir = base_dir / language
    base_projects: dict[str, Path] = {}
    if base_language_dir.is_dir():
        for project_dir in visible_directories(base_language_dir):
            if not (project_dir / ISSUES_FILE).is_file():
                print(
                    f"Warning: base project export missing {ISSUES_FILE}, "
                    f"treating as empty baseline: {project_dir}",
                    file=sys.stderr,
                )
                continue
            base_projects[project_dir.name] = project_dir

    for project_name, base_project_dir in base_projects.items():
        copy_project_export(base_project_dir, prepared_language_base / project_name)

    for project_name, target_project_dir in target_projects.items():
        if project_name not in base_projects:
            synthesize_empty_baseline(target_project_dir, prepared_language_base / project_name)


def build_manifest(
    grouped_rules: dict[str, list[str]],
    target_dir: Path,
    reports_dir: Path,
    prepared_base_dir: Path,
    rule_key_format: str,
    flat_bundles: bool,
) -> dict[str, Any]:
    runs = []
    for language, rule_keys in grouped_rules.items():
        language_reports_dir = reports_dir / language
        base_dir_path = prepared_base_dir if flat_bundles else prepared_base_dir / language
        target_dir_path = target_dir if flat_bundles else target_dir / language
        runs.append(
            {
                "language": language,
                "rule_keys": rule_keys,
                "rule_filter": ",".join(
                    exported_rule_key(language, rule_key, rule_key_format) for rule_key in rule_keys
                ),
                "base_dir": str(base_dir_path),
                "target_dir": str(target_dir_path),
                "report_dir": str(language_reports_dir),
                "reports": {
                    report_format: str(language_reports_dir / filename)
                    for report_format, filename in REPORT_FILES.items()
                },
            }
        )
    return {"runs": runs}


def prepare_inputs(
    *,
    rules_json: str,
    base_dir: Path,
    target_dir: Path,
    reports_dir: Path,
    manifest_output: Path,
    rule_key_format: str,
    flat_bundles: bool,
) -> dict[str, Any]:
    grouped_rules = load_rules(rules_json)
    prepared_base_dir = manifest_output.parent / "prepared-base"

    if flat_bundles:
        prepare_flat_base(base_dir, target_dir, prepared_base_dir)
    else:
        for language in grouped_rules:
            prepare_language_base(base_dir, target_dir, prepared_base_dir, language)

    for language in grouped_rules:
        (reports_dir / language).mkdir(parents=True, exist_ok=True)

    manifest = build_manifest(
        grouped_rules, target_dir, reports_dir, prepared_base_dir, rule_key_format, flat_bundles
    )
    manifest_output.parent.mkdir(parents=True, exist_ok=True)
    manifest_output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def prepare_flat_base(base_dir: Path, target_dir: Path, prepared_base_dir: Path) -> None:
    target_projects = list_project_exports(target_dir, "target")

    if prepared_base_dir.exists():
        shutil.rmtree(prepared_base_dir)
    prepared_base_dir.mkdir(parents=True, exist_ok=True)

    base_projects: dict[str, Path] = {}
    if base_dir.is_dir():
        for project_dir in visible_directories(base_dir):
            if (project_dir / ISSUES_FILE).is_file():
                base_projects[project_dir.name] = project_dir

    for project_name, base_project_dir in base_projects.items():
        copy_project_export(base_project_dir, prepared_base_dir / project_name)

    for project_name, target_project_dir in target_projects.items():
        if project_name not in base_projects:
            synthesize_empty_baseline(target_project_dir, prepared_base_dir / project_name)


def main() -> int:
    args = parse_args()
    try:
        manifest = prepare_inputs(
            rules_json=args.rules_json,
            base_dir=args.base_dir,
            target_dir=args.target_dir,
            reports_dir=args.reports_dir,
            manifest_output=args.manifest_output,
            rule_key_format=args.rule_key_format,
            flat_bundles=args.flat_bundles,
        )
    except (FileNotFoundError, ValueError) as err:
        print(f"Error: {err}", file=sys.stderr)
        return 1

    print(f"Wrote DiffSIT manifest to {args.manifest_output} ({len(manifest['runs'])} run(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
