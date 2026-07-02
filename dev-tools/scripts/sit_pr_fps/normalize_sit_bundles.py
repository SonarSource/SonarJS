"""Normalize downloaded SIT artifacts into FPS-ready bundle directories.

This script flattens language-scoped SIT exports, validates bundle shape, and
ensures each normalized bundle has a `sources/` directory.

When `--language` is set, `--input-dir` is treated as a flat directory of
bundles (no language sub-layer) and the value is used as the output bundle
prefix. When unset, the script discovers languages from the top-level
subdirectories of `--input-dir`.
"""

import argparse
import shutil
import sys
from pathlib import Path

from common import resolve_path_under


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize SIT export bundles for FPS input")
    parser.add_argument("--input-dir", required=True, help="Root SIT download directory")
    parser.add_argument("--output-dir", required=True, help="Normalized output directory")
    parser.add_argument(
        "--language",
        default=None,
        help=(
            "If set, treat --input-dir as flat (no language sub-directory) and "
            "use this value as the output bundle prefix."
        ),
    )
    return parser.parse_args()


def list_dirs(root: Path, max_depth: int) -> list[Path]:
    dirs: list[Path] = []
    for path in sorted(root.rglob("*")):
        if not path.is_dir():
            continue
        if len(path.relative_to(root).parts) <= max_depth:
            dirs.append(path)
    return dirs


def main() -> int:
    args = parse_args()
    allowed_root = Path.cwd()
    input_dir = resolve_path_under(allowed_root, args.input_dir, "--input-dir")
    output_dir = resolve_path_under(allowed_root, args.output_dir, "--output-dir")

    if not input_dir.is_dir():
        print(f"SIT input directory does not exist: {input_dir}", file=sys.stderr)
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)
    bundle_count = 0

    if args.language:
        language_entries = [(args.language, input_dir)]
    else:
        language_entries = [
            (language_dir.name, language_dir)
            for language_dir in sorted(input_dir.iterdir())
            if language_dir.is_dir()
        ]

    for language, language_dir in language_entries:
        for bundle_dir in sorted(language_dir.iterdir()):
            if not bundle_dir.is_dir():
                continue
            if not (bundle_dir / "metadata.json").is_file():
                continue

            normalized_dir = output_dir / f"{language}__{bundle_dir.name}"
            if normalized_dir.exists():
                shutil.rmtree(normalized_dir)
            shutil.copytree(bundle_dir, normalized_dir)

            sources_dir = normalized_dir / "sources"
            if not sources_dir.is_dir():
                sources_dir.mkdir(parents=True, exist_ok=True)
                print(f"Created empty sources directory for {normalized_dir}")

            print(f"Prepared bundle: {normalized_dir}")
            bundle_count += 1

    if bundle_count == 0:
        print(f"No valid SIT bundles found under {input_dir}", file=sys.stderr)
        for path in list_dirs(input_dir, max_depth=3):
            print(path)
        return 1

    print(f"Prepared {bundle_count} bundle(s) for FPS")
    for path in sorted(output_dir.rglob("*")):
        if path.is_file():
            print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
