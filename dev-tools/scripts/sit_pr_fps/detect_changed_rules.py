"""Detect changed SonarJS rules and publish the canonical rules payload.

Adapted from sonar-skunk's dev-tools/scripts/sit_pr_fps/detect_changed_rules.py.
Differences from the upstream version:
  - SonarJS rule path patterns (jsts and css rules + metadata locations).
  - One JSTS rule source can map to two SonarQube repositories (`javascript`
    and `typescript`); we read `compatibleLanguages` from the rule metadata to
    decide.

Emits to `GITHUB_OUTPUT` `rules_json` in the format
`[{"language": "<repository>", "rule_id": "S####"}, ...]` where `language` is
the SonarQube repository key (`javascript`, `typescript`, or `css`).
"""

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import TypedDict

from common import append_output

JSTS_RULE_PATH_RE = re.compile(r"^packages/analysis/src/jsts/rules/(?P<rule_id>S\d+)/.+$")
JSTS_METADATA_PATH_RE = re.compile(
    r"^sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/(?P<rule_id>S\d+)\.json$"
)
CSS_RULE_PATH_RE = re.compile(r"^packages/analysis/src/css/rules/(?P<rule_id>S\d+)/.+$")
CSS_METADATA_PATH_RE = re.compile(
    r"^sonar-plugin/css/src/main/resources/org/sonar/l10n/css/rules/css/(?P<rule_id>S\d+)\.json$"
)

JSTS_METADATA_DIRS = (
    "sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript",
    "resources/rule-data/javascript",
)

GIT_OBJECT_ID_RE = re.compile(r"^[0-9a-fA-F]{40}(?:[0-9a-fA-F]{24})?$")

LANGUAGE_TO_REPOSITORY = {"js": "javascript", "ts": "typescript"}


class RuleChange(TypedDict):
    language: str
    rule_id: str


@dataclass(frozen=True)
class DetectionPayload:
    rules: list[RuleChange]
    paths: list[str]


def git_object_id(value: str) -> str:
    if not GIT_OBJECT_ID_RE.fullmatch(value):
        raise argparse.ArgumentTypeError("must be a full Git object ID")
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Detect changed SonarJS rule files in a PR diff")
    parser.add_argument("--base-sha", required=True, type=git_object_id)
    parser.add_argument("--head-sha", required=True, type=git_object_id)
    parser.add_argument("--repo-root", required=True)
    return parser.parse_args()


def compute_changed_files(repo_root: Path, base_sha: str, head_sha: str) -> list[str]:
    result = subprocess.run(
        [
            "git",
            "diff",
            "--name-only",
            "--diff-filter=ACMR",
            f"{base_sha}...{head_sha}",
        ],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def jsts_compatible_repositories(repo_root: Path, rule_id: str) -> list[str]:
    last_checked: Path | None = None
    for metadata_dir in JSTS_METADATA_DIRS:
        metadata_path = repo_root / metadata_dir / f"{rule_id}.json"
        last_checked = metadata_path
        if not metadata_path.is_file():
            continue
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        languages = metadata.get("compatibleLanguages") or []
        if not languages:
            raise ValueError(f"{metadata_path} does not define compatibleLanguages")
        repositories: list[str] = []
        for language in languages:
            repository = LANGUAGE_TO_REPOSITORY.get(language)
            if repository is None:
                raise ValueError(
                    f"{metadata_path} contains unsupported compatibleLanguages entry: {language}"
                )
            repositories.append(repository)
        return repositories
    raise FileNotFoundError(
        f"Unable to find rule metadata for {rule_id}; last checked {last_checked}"
    )


def build_payload(repo_root: Path, changed_files: list[str]) -> DetectionPayload:
    rules: list[RuleChange] = []
    seen: set[tuple[str, str]] = set()
    rule_paths: dict[tuple[str, str], str] = {}

    for relative_path in changed_files:
        jsts_match = JSTS_RULE_PATH_RE.match(relative_path) or JSTS_METADATA_PATH_RE.match(
            relative_path
        )
        if jsts_match is not None:
            rule_id = jsts_match.group("rule_id").upper()
            for repository in jsts_compatible_repositories(repo_root, rule_id):
                key = (repository, rule_id)
                if key in seen:
                    continue
                seen.add(key)
                rule_paths.setdefault(key, relative_path)
                rules.append({"language": repository, "rule_id": rule_id})
            continue

        css_match = CSS_RULE_PATH_RE.match(relative_path) or CSS_METADATA_PATH_RE.match(
            relative_path
        )
        if css_match is not None:
            rule_id = css_match.group("rule_id").upper()
            key = ("css", rule_id)
            if key in seen:
                continue
            seen.add(key)
            rule_paths[key] = relative_path
            rules.append({"language": "css", "rule_id": rule_id})

    rules.sort(key=lambda item: (item["language"], item["rule_id"]))
    paths = [rule_paths[(rule["language"], rule["rule_id"])] for rule in rules]

    return DetectionPayload(rules=rules, paths=paths)


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()

    if not repo_root.is_dir():
        print(f"Repository root does not exist: {repo_root}", file=sys.stderr)
        return 1

    changed_files = compute_changed_files(
        repo_root=repo_root, base_sha=args.base_sha, head_sha=args.head_sha
    )
    payload = build_payload(repo_root=repo_root, changed_files=changed_files)

    print(f"Detected {len(payload.rules)} changed rule(s)")
    for path in payload.paths:
        print(f"- {path}")

    append_output("rules_json", json.dumps(payload.rules, separators=(",", ":")))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
