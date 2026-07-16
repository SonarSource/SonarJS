#!/usr/bin/env bash
set -euo pipefail

root="$1"
maven_bom="$2"
npm_bom="$3"
output="$4"
group="$5"
name="$6"
version="$7"

cli="${root}/target/cyclonedx-cli"
if [[ ! -x "$cli" ]]; then
  arch="$(uname -m)"
  case "$arch" in
    x86_64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)
      echo "Unsupported architecture: $(uname -m)" >&2
      exit 1
      ;;
  esac

  cli_version="v0.25.0"
  mkdir -p "${root}/target"
  curl -fsSL \
    -o "$cli" \
    "https://github.com/CycloneDX/cyclonedx-cli/releases/download/${cli_version}/cyclonedx-linux-${arch}"
  chmod +x "$cli"
fi

"$cli" merge --hierarchical \
  --input-files "$maven_bom" "$npm_bom" \
  --output-file "$output" \
  --group "$group" \
  --name "$name" \
  --version "$version"
