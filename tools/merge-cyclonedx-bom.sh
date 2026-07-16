#!/usr/bin/env bash
set -euo pipefail

root="$1"
maven_bom="$2"
npm_bom="$3"
output="$4"
group="$5"
name="$6"
version="$7"

arch="$(uname -m)"
case "$arch" in
  x86_64|amd64) arch="x64" ;;
  aarch64|arm64) arch="arm64" ;;
  i686|i386)
    case "$(uname -s)" in
      MINGW*|MSYS*|CYGWIN*|*_NT*) arch="x86" ;;
      *)
        echo "Unsupported architecture: $(uname -m)" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "Unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

cli_version="v0.29.1"
mkdir -p "${root}/target"

os="$(uname -s)"
case "$os" in
  Linux*) asset="cyclonedx-linux-${arch}"; cli="${root}/target/cyclonedx-cli" ;;
  Darwin*) asset="cyclonedx-osx-${arch}"; cli="${root}/target/cyclonedx-cli" ;;
  MINGW*|MSYS*|CYGWIN*|*_NT*)
    asset="cyclonedx-win-${arch}.exe"
    cli="${root}/target/cyclonedx-cli.exe"
    ;;
  *)
    echo "Unsupported OS: ${os}" >&2
    exit 1
    ;;
esac

if [[ ! -x "$cli" ]]; then
  curl -fsSL \
    -o "$cli" \
    "https://github.com/CycloneDX/cyclonedx-cli/releases/download/${cli_version}/${asset}"
  chmod +x "$cli"
fi

"$cli" merge --hierarchical \
  --input-files "$maven_bom" "$npm_bom" \
  --output-file "$output" \
  --group "$group" \
  --name "$name" \
  --version "$version"
