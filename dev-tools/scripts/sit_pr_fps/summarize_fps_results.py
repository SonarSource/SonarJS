"""Convert FPS batch TSV output into structured JSON with report metrics.

For each rule run entry, this script enriches status data with FPS report
metrics (when available) and writes a single summary payload.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from common import empty_report_metrics, resolve_path_under


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Summarize FPS run TSV into JSON")
    parser.add_argument("--input-tsv", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--reports-dir", required=True)
    return parser.parse_args()


def load_report_metrics(reports_dir: Path, output_prefix: str) -> dict[str, Any]:
    report_path = reports_dir / f"{output_prefix}_summary.json"
    if not report_path.exists():
        return empty_report_metrics()

    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except Exception as err:  # pragma: no cover - defensive path for malformed report files
        print(
            f"Warning: failed to read FPS report '{report_path}': {err}",
            file=sys.stderr,
        )
        return empty_report_metrics()

    metrics = report.get("metrics") or {}
    clusters_raw = report.get("clusters") or []
    clusters = []
    for cluster in clusters_raw:
        cluster_metrics = cluster.get("metrics") or {}
        clusters.append(
            {
                "cluster_id": cluster.get("cluster_id"),
                "cluster_name": cluster.get("cluster_name"),
                "issue_count": cluster_metrics.get("issue_count"),
                "cluster_fp_rate": cluster_metrics.get("cluster_fp_rate"),
            }
        )

    return {
        "issues_analyzed": metrics.get("total_issues_analyzed"),
        "false_positive_rate": metrics.get("false_positive_rate"),
        "cluster_count": metrics.get("total_clusters"),
        "clusters": clusters,
    }


def summarize_tsv(input_path: Path, output_path: Path, reports_dir: Path, allowed_root: Path) -> dict[str, Any]:
    input_path = resolve_path_under(allowed_root, input_path, "--input-tsv")
    output_path = resolve_path_under(allowed_root, output_path, "--output-json")
    reports_dir = resolve_path_under(allowed_root, reports_dir, "--reports-dir")

    rows = []
    if input_path.exists():
        for raw_line in input_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line:
                continue

            parts = raw_line.split("\t")
            if len(parts) != 6:
                raise ValueError(f"Invalid row in {input_path}: '{raw_line}'")

            rule_key, output_prefix, status, exit_code, started_at, finished_at = parts
            report_metrics = load_report_metrics(reports_dir, output_prefix)
            rows.append(
                {
                    "rule_key": rule_key,
                    "output_prefix": output_prefix,
                    "status": status,
                    "exit_code": int(exit_code),
                    "started_at": started_at,
                    "finished_at": finished_at,
                    "issues_analyzed": report_metrics["issues_analyzed"],
                    "false_positive_rate": report_metrics["false_positive_rate"],
                    "cluster_count": report_metrics["cluster_count"],
                    "clusters": report_metrics["clusters"],
                }
            )

    payload = {
        "total": len(rows),
        "failed": sum(1 for row in rows if row["status"] != "success"),
        "results": rows,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def main() -> int:
    args = parse_args()
    allowed_root = Path.cwd()
    input_path = resolve_path_under(allowed_root, args.input_tsv, "--input-tsv")
    output_path = resolve_path_under(allowed_root, args.output_json, "--output-json")
    reports_dir = resolve_path_under(allowed_root, args.reports_dir, "--reports-dir")

    payload = summarize_tsv(
        input_path=input_path, output_path=output_path, reports_dir=reports_dir, allowed_root=allowed_root
    )
    print(f"Wrote FPS summary to {output_path} (total={payload['total']}, failed={payload['failed']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
