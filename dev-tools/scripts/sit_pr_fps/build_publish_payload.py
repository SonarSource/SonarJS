"""Build publish artifacts for SIT/FPS PR automation.

Generates the commit-status outcome, per-rule status payload, and markdown
comment body consumed by the workflow publish step.
"""

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from common import append_output, resolve_path_under

COMMENT_MARKER = "<!-- sit-pr-fps-summary -->"


def path_under_cwd(label: str):
    def parse_path(value: str) -> Path:
        try:
            return resolve_path_under(Path.cwd(), value, label)
        except ValueError as err:
            raise argparse.ArgumentTypeError(str(err)) from err

    return parse_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build commit-status and PR comment payload for SIT/FPS workflow")
    parser.add_argument("--rules-json", required=True)
    parser.add_argument("--sit-result", required=True)
    parser.add_argument("--diffsit-result", required=True)
    parser.add_argument("--fps-result", required=True)
    parser.add_argument(
        "--plugin-version",
        default="",
        help="Analyzer plugin version to include in the published comment.",
    )
    parser.add_argument(
        "--rule-key-format",
        default="{language}dre:{rule_id}",
        help=(
            "Python format string used to build full rule keys from `language` "
            "and `rule_id` fields of rules_json (default keeps sonar-skunk's "
            "DRE convention)."
        ),
    )
    parser.add_argument(
        "--sit-artifact-name-template",
        default="sit-export-bundles-{language}",
        help=(
            "Template for per-language SIT artifact names used when rendering "
            "links in the PR comment (default keeps sonar-skunk's per-language "
            "fan-out convention)."
        ),
    )
    parser.add_argument("--run-url", required=True)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--fps-summary-path", required=True, type=path_under_cwd("--fps-summary-path"))
    parser.add_argument("--diffsit-summary-path", required=True, type=path_under_cwd("--diffsit-summary-path"))
    parser.add_argument("--artifacts-json-path", required=True, type=path_under_cwd("--artifacts-json-path"))
    parser.add_argument("--comment-path", required=True, type=path_under_cwd("--comment-path"))
    parser.add_argument("--rule-statuses-path", required=True, type=path_under_cwd("--rule-statuses-path"))
    return parser.parse_args()


def load_json(value: str, fallback: Any) -> Any:
    if not value:
        return fallback
    return json.loads(value)


def derive_languages(rules: list[dict[str, str]]) -> list[str]:
    return sorted({rule["language"] for rule in rules})


def derive_full_rule_keys(rules: list[dict[str, str]], rule_key_format: str) -> list[str]:
    return [rule_key_format.format(language=rule["language"], rule_id=rule["rule_id"]) for rule in rules]


@dataclass(frozen=True)
class BuildContext:
    rules: list[dict[str, str]]
    has_rules: bool
    languages: list[str]
    full_rule_keys: list[str]
    sit_result: str
    diffsit_result: str
    fps_result: str
    plugin_version: str
    run_url: str
    repository: str
    run_id: str
    fps_summary: dict[str, Any] | None
    diffsit_summary: dict[str, Any] | None
    artifact_links: dict[str, str]
    sit_artifact_name_template: str


@dataclass(frozen=True)
class WorkflowOutcome:
    state: str
    description: str
    workflow_status: str


def format_rate(value: Any) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):.1f}%"


def format_count(value: Any) -> str:
    if value is None:
        return "n/a"
    return str(value)


def sanitize_cluster_name(value: Any) -> str:
    cluster_name = str(value or "(unnamed cluster)")
    return cluster_name.replace("|", "\\|").replace("\n", " ").strip()


def render_rule_sections(results: list[dict[str, Any]]) -> list[str]:
    lines = ["", "### FPS per rule", ""]
    sorted_results = sorted(results, key=lambda result: str(result.get("rule_key", "")))

    for result in sorted_results:
        rule_key = result.get("rule_key", "unknown")
        status = result.get("status", "unknown")
        issues_analyzed = format_count(result.get("issues_analyzed"))
        fp_rate = format_rate(result.get("false_positive_rate"))

        lines.append(f"#### `{rule_key}` — `{status}` — {issues_analyzed} issues — FP rate {fp_rate}")
        lines.append("")

        clusters = result.get("clusters") or []
        if not clusters:
            lines.append("No cluster data (FPS failed or report missing).")
            lines.append("")
            continue

        sorted_clusters = sorted(
            clusters,
            key=lambda cluster: cluster.get("cluster_fp_rate") or 0,
            reverse=True,
        )

        lines.extend(["| Cluster | Issues | FP |", "|:--------|-------:|---:|"])

        total_issues = 0
        for cluster in sorted_clusters:
            name = sanitize_cluster_name(cluster.get("cluster_name"))
            issue_count = cluster.get("issue_count")
            if issue_count is not None:
                total_issues += issue_count
            lines.append(f"| {name} | {format_count(issue_count)} | {format_rate(cluster.get('cluster_fp_rate'))} |")

        lines.append(f"| **Total** | **{total_issues}** | **{fp_rate}** |")
        lines.append("")

    return lines


def render_diffsit_summary(summary: dict[str, Any]) -> list[str]:
    overall = summary.get("overall") or {}
    return [
        "",
        "### DiffSIT summary",
        "",
        (
            "| Projects | Base issues | Target issues | New | Changed | Message changes "
            "| Secondary changes | Removed | Unchanged |"
        ),
        "|---------:|------------:|--------------:|----:|--------:|----------------:|------------------:|--------:|----------:|",
        (
            f"| {format_count(overall.get('projects'))} "
            f"| {format_count(overall.get('base_count'))} "
            f"| {format_count(overall.get('target_count'))} "
            f"| {format_count(overall.get('new'))} "
            f"| {format_count(overall.get('changed'))} "
            f"| {format_count(overall.get('message_changes'))} "
            f"| {format_count(overall.get('secondary_changes'))} "
            f"| {format_count(overall.get('removed'))} "
            f"| {format_count(overall.get('unchanged'))} |"
        ),
        "",
    ]


def truncate_description(description: str, max_len: int = 140) -> str:
    if len(description) <= max_len:
        return description
    return description[: max_len - 3] + "..."


def load_artifact_links(artifacts_json_path: Path, repository: str, run_id: str) -> dict[str, str]:
    artifacts_json_path = resolve_path_under(Path.cwd(), artifacts_json_path, "--artifacts-json-path")
    if not artifacts_json_path.exists():
        return {}

    try:
        payload = json.loads(artifacts_json_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}

    links = {}
    for artifact in payload.get("artifacts", []):
        artifact_id = artifact.get("id")
        artifact_name = artifact.get("name")
        if artifact_id is None or not artifact_name:
            continue
        links[artifact_name] = f"https://github.com/{repository}/actions/runs/{run_id}/artifacts/{artifact_id}"
    return links


def render_artifact_link(artifact_name: str, artifact_links: dict[str, str]) -> str:
    artifact_link = artifact_links.get(artifact_name)
    if not artifact_link:
        return f"`{artifact_name}` (artifact not found)"
    return f"[`{artifact_name}`]({artifact_link})"


def build_rule_statuses(results: list[dict[str, Any]], target_url: str) -> list[dict[str, str]]:
    statuses = []
    for result in results:
        rule_key = result.get("rule_key")
        if not rule_key:
            continue

        state = "success" if result.get("status") == "success" else "failure"
        metrics = []
        issues = result.get("issues_analyzed")
        fp_rate = result.get("false_positive_rate")
        clusters = result.get("cluster_count")
        if issues is not None:
            metrics.append(f"issues={issues}")
        if fp_rate is not None:
            metrics.append(f"fp={float(fp_rate):.1f}%")
        if clusters is not None:
            metrics.append(f"clusters={clusters}")

        status_word = "success" if state == "success" else "failed"
        description = f"FPS {status_word}"
        if metrics:
            description += f" ({', '.join(metrics)})"

        statuses.append(
            {
                "context": f"sit-fps/{rule_key}",
                "state": state,
                "description": truncate_description(description),
                "target_url": target_url,
            }
        )

    return statuses


def load_fps_summary(fps_summary_path: Path) -> dict[str, Any] | None:
    fps_summary_path = resolve_path_under(Path.cwd(), fps_summary_path, "--fps-summary-path")
    if not fps_summary_path.exists():
        return None
    return json.loads(fps_summary_path.read_text(encoding="utf-8"))


def load_diffsit_summary(diffsit_summary_path: Path) -> dict[str, Any] | None:
    diffsit_summary_path = resolve_path_under(Path.cwd(), diffsit_summary_path, "--diffsit-summary-path")
    if not diffsit_summary_path.exists():
        return None
    return json.loads(diffsit_summary_path.read_text(encoding="utf-8"))


def load_context(args: argparse.Namespace) -> BuildContext:
    rules = load_json(args.rules_json, [])
    return BuildContext(
        rules=rules,
        has_rules=len(rules) > 0,
        languages=derive_languages(rules),
        full_rule_keys=derive_full_rule_keys(rules, args.rule_key_format),
        sit_result=args.sit_result or "skipped",
        diffsit_result=args.diffsit_result or "skipped",
        fps_result=args.fps_result or "skipped",
        plugin_version=args.plugin_version or "n/a",
        run_url=args.run_url,
        repository=args.repository,
        run_id=args.run_id,
        fps_summary=load_fps_summary(args.fps_summary_path),
        diffsit_summary=load_diffsit_summary(args.diffsit_summary_path),
        artifact_links=load_artifact_links(args.artifacts_json_path, args.repository, args.run_id),
        sit_artifact_name_template=args.sit_artifact_name_template,
    )


def resolve_workflow_outcome(has_rules: bool, sit_result: str, diffsit_result: str, fps_result: str) -> WorkflowOutcome:
    if not has_rules:
        return WorkflowOutcome(
            state="success",
            description="No rule changes detected",
            workflow_status="Skipped (no changed rules)",
        )
    if sit_result != "success":
        return WorkflowOutcome(
            state="failure",
            description="SIT export failed",
            workflow_status="Failed",
        )
    if diffsit_result != "success":
        return WorkflowOutcome(
            state="failure",
            description="DiffSIT failed",
            workflow_status="Failed",
        )
    if fps_result != "success":
        return WorkflowOutcome(
            state="failure",
            description="FPS failed for one or more rules",
            workflow_status="Failed",
        )
    return WorkflowOutcome(
        state="success",
        description="SIT/FPS/DiffSIT completed successfully",
        workflow_status="Success",
    )


def build_comment_lines(context: BuildContext, workflow_status: str) -> list[str]:
    lines = [
        COMMENT_MARKER,
        "",
        "## SIT/FPS PR Automation",
        "",
        f"- Status: **{workflow_status}**",
        f"- Workflow run: {context.run_url}",
        f"- Plugin version: `{context.plugin_version}`",
        f"- Languages: `{', '.join(context.languages) if context.languages else 'none'}`",
        f"- Changed rules: `{', '.join(context.full_rule_keys) if context.full_rule_keys else 'none'}`",
    ]

    if context.languages:
        sit_artifacts = [
            render_artifact_link(
                context.sit_artifact_name_template.format(language=language),
                context.artifact_links,
            )
            for language in context.languages
        ]
        lines.append(f"- SIT artifacts: {', '.join(sit_artifacts)}")
    else:
        lines.append("- SIT artifacts: `none`")

    if context.has_rules:
        fps_artifacts = [
            render_artifact_link("fps-reports", context.artifact_links),
            render_artifact_link("fps-run-summary", context.artifact_links),
        ]
        lines.append(f"- FPS artifacts: {', '.join(fps_artifacts)}")
        diffsit_artifacts = [
            render_artifact_link("diffsit-reports", context.artifact_links),
            render_artifact_link("diffsit-run-summary", context.artifact_links),
        ]
        lines.append(f"- DiffSIT artifacts: {', '.join(diffsit_artifacts)}")
    else:
        lines.append("- FPS artifacts: `not produced`")
        lines.append("- DiffSIT artifacts: `not produced`")

    if context.fps_summary and context.fps_summary.get("results"):
        lines.extend(render_rule_sections(context.fps_summary["results"]))
    if context.diffsit_summary and context.diffsit_summary.get("overall"):
        lines.extend(render_diffsit_summary(context.diffsit_summary))
    return lines


def write_file(path: Path, content: str) -> None:
    path = resolve_path_under(Path.cwd(), path, "output path")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_comment(path: Path, lines: list[str]) -> None:
    write_file(path, "\n".join(lines).strip() + "\n")


def write_rule_statuses(path: Path, rule_statuses: list[dict[str, str]]) -> None:
    write_file(path, json.dumps(rule_statuses, indent=2))


def publish_workflow_outputs(outcome: WorkflowOutcome) -> None:
    append_output("state", outcome.state)
    append_output("description", outcome.description)


def main() -> int:
    args = parse_args()
    context = load_context(args)
    outcome = resolve_workflow_outcome(
        has_rules=context.has_rules,
        sit_result=context.sit_result,
        diffsit_result=context.diffsit_result,
        fps_result=context.fps_result,
    )

    comment_lines = build_comment_lines(context=context, workflow_status=outcome.workflow_status)
    write_comment(path=args.comment_path, lines=comment_lines)

    rule_statuses: list[dict[str, str]] = []
    if context.fps_summary and context.fps_summary.get("results"):
        rule_statuses = build_rule_statuses(context.fps_summary["results"], context.run_url)
    write_rule_statuses(path=args.rule_statuses_path, rule_statuses=rule_statuses)

    publish_workflow_outputs(outcome)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
