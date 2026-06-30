"""Shared helpers for SIT/FPS workflow scripts.

Provides utilities for writing GitHub Actions outputs and for returning
default FPS metrics when report data is unavailable.
"""

import os
import uuid
from pathlib import Path
from typing import Any


def resolve_path_under(root: Path, value: str | Path, label: str) -> Path:
    allowed_root = root.resolve()
    path = Path(value)
    candidate = path if path.is_absolute() else allowed_root / path
    resolved = candidate.resolve()
    if not resolved.is_relative_to(allowed_root):
        raise ValueError(f"{label} escapes allowed directory: {resolved}")
    return resolved


def append_output(key: str, value: str) -> None:
    output_path = os.environ.get("GITHUB_OUTPUT")
    if not output_path:
        raise RuntimeError("GITHUB_OUTPUT is not set")

    delimiter = f"EOF_{uuid.uuid4().hex}"
    with open(output_path, "a", encoding="utf-8") as output_file:
        output_file.write(f"{key}<<{delimiter}\n{value}\n{delimiter}\n")


def empty_report_metrics() -> dict[str, Any]:
    return {
        "issues_analyzed": None,
        "false_positive_rate": None,
        "cluster_count": None,
        "clusters": [],
    }
