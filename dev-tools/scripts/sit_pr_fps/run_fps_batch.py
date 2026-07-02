"""Run FPS sequentially for all changed rules and persist run summaries.

Executes `uv run --project dev-tools/scripts fps` per rule key, records
per-rule status in a TSV file, then materializes a consolidated JSON summary
for publish steps.
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

from common import resolve_path_under
from summarize_fps_results import summarize_tsv

FPS_NO_ISSUES_EXIT_CODE = 2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run FPS for a batch of changed rules")
    parser.add_argument("--rules-text", required=True, help="Newline-separated full rule keys")
    parser.add_argument("--workspace", required=True, help="GitHub workspace root")
    parser.add_argument("--sit-input", required=True, help="Normalized SIT bundle input directory")
    parser.add_argument("--reports-dir", required=True, help="FPS reports directory")
    parser.add_argument("--summary-tsv", required=True, help="Per-rule run summary TSV path")
    parser.add_argument("--summary-json", required=True, help="Per-rule run summary JSON path")
    parser.add_argument("--pr-number", required=True)
    parser.add_argument("--head-sha", required=True)
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_rule_keys(rules_text: str) -> list[str]:
    seen: set[str] = set()
    rule_keys: list[str] = []
    for raw_line in rules_text.splitlines():
        rule_key = raw_line.strip()
        if not rule_key or rule_key in seen:
            continue
        seen.add(rule_key)
        rule_keys.append(rule_key)
    return rule_keys


def sanitize_rule_key(rule_key: str) -> str:
    return re.sub(r"[:/]", "__", rule_key)


def run_one_rule(fps_project_dir: Path, run_dir: Path, sit_input: Path, rule_key: str, output_prefix: str) -> int:
    command = [
        "uv",
        "run",
        "--project",
        str(fps_project_dir),
        "fps",
        "--source",
        "sit",
        "--sit-input",
        str(sit_input),
        "--limit",
        "1000",
        "--export-json",
        "--output-prefix",
        output_prefix,
        rule_key,
    ]
    try:
        completed = subprocess.run(command, cwd=run_dir, check=False, capture_output=True, text=True)
    except OSError as err:
        print(f"Failed to run FPS for {rule_key}: {err}", file=sys.stderr)
        return 1

    if completed.stdout:
        print(completed.stdout, end="")
    if completed.stderr:
        print(completed.stderr, end="", file=sys.stderr)

    if completed.returncode == FPS_NO_ISSUES_EXIT_CODE:
        write_empty_report(run_dir / "reports" / f"{output_prefix}_summary.json")
        return 0

    return completed.returncode


def write_empty_report(report_path: Path) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(
            {
                "metrics": {
                    "total_issues_analyzed": 0,
                    "false_positive_rate": 0.0,
                    "total_clusters": 0,
                },
                "clusters": [],
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def resolve_run_dir(workspace: Path, reports_dir: Path) -> Path:
    return resolve_path_under(workspace, reports_dir.parent, "run directory")


def main() -> int:
    args = parse_args()
    workspace = Path(args.workspace).resolve()
    fps_project_dir = workspace / "dev-tools" / "scripts"
    sit_input = resolve_path_under(workspace, args.sit_input, "--sit-input")
    reports_dir = resolve_path_under(workspace, args.reports_dir, "--reports-dir")
    run_dir = resolve_run_dir(workspace, reports_dir)
    summary_tsv = resolve_path_under(workspace, args.summary_tsv, "--summary-tsv")
    summary_json = resolve_path_under(workspace, args.summary_json, "--summary-json")

    if not fps_project_dir.is_dir():
        print(f"FPS project directory does not exist: {fps_project_dir}", file=sys.stderr)
        return 1
    if not sit_input.is_dir():
        print(f"SIT input directory does not exist: {sit_input}", file=sys.stderr)
        return 1

    rule_keys = parse_rule_keys(args.rules_text)
    run_dir.mkdir(parents=True, exist_ok=True)
    summary_tsv.parent.mkdir(parents=True, exist_ok=True)

    failures = 0
    with open(summary_tsv, "w", encoding="utf-8") as summary_file:
        for rule_key in rule_keys:
            safe_rule_key = sanitize_rule_key(rule_key)
            output_prefix = f"pr{args.pr_number}_{args.head_sha[:12]}_{safe_rule_key}"
            started_at = utc_now()
            exit_code = run_one_rule(
                fps_project_dir=fps_project_dir,
                run_dir=run_dir,
                sit_input=sit_input,
                rule_key=rule_key,
                output_prefix=output_prefix,
            )
            finished_at = utc_now()
            status = "success" if exit_code == 0 else "failure"
            if exit_code != 0:
                failures = 1

            summary_file.write(f"{rule_key}\t{output_prefix}\t{status}\t{exit_code}\t{started_at}\t{finished_at}\n")

    payload = summarize_tsv(
        input_path=summary_tsv, output_path=summary_json, reports_dir=reports_dir, allowed_root=workspace
    )
    print(f"Wrote FPS summary to {summary_json} (total={payload['total']}, failed={payload['failed']})")

    if failures != 0:
        print("One or more FPS runs failed", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
