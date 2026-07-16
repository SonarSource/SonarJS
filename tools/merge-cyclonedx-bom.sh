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

os="$(uname -s)"
case "$os" in
  Linux*) asset="cyclonedx-linux-${arch}" ;;
  Darwin*) asset="cyclonedx-osx-${arch}" ;;
  MINGW*|MSYS*|CYGWIN*|*_NT*)
    asset="cyclonedx-win-${arch}.exe"
    ;;
  *)
    echo "Unsupported OS: ${os}" >&2
    exit 1
    ;;
esac

cli_version="v0.29.1"
case "$asset" in
  cyclonedx-linux-arm64) sha256="f5e06b0ca05895feb39fb0d66443d6c64a50a7ac545e20a01b193b09adb1be9f" ;;
  cyclonedx-linux-x64) sha256="1daceab1a7613603072db34d406659f0865623a4f137637440764cb9aa31236c" ;;
  cyclonedx-osx-arm64) sha256="d14e98223a2aff50b416eaebee0577566ff16e8b86a85cbb12c5a43b39f55f40" ;;
  cyclonedx-osx-x64) sha256="d38e495afdcb5b999b4e23dc61be0b06243fb253d8e849ec873ffabdb38d6013" ;;
  cyclonedx-win-arm64.exe) sha256="d7dce1cbbddae799d65112ee12226653a0cceafda853c1189a212427f06209e1" ;;
  cyclonedx-win-x64.exe) sha256="9ac3fe935fa28571e6a16f0e3e4e6e818e41b8b022b6d5b9c1e0f0a9f1bc8273" ;;
  cyclonedx-win-x86.exe) sha256="e3fccb1e248968bc685d19c392c46ba40abcae8e71a2f00b619e41e416f1baf2" ;;
  *)
    echo "Unsupported CycloneDX CLI asset: ${asset}" >&2
    exit 1
    ;;
esac

mkdir -p "${root}/target"
cli_version_number="${cli_version#v}"
cli_asset="${asset#cyclonedx-}"
cli="${root}/target/cyclonedx-cli-${cli_version_number}-${cli_asset}"

calculate_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}' | tr -d '\\'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}' | tr -d '\\'
  else
    echo "No SHA-256 utility available (expected sha256sum or shasum)" >&2
    exit 1
  fi
}

if [[ ! -x "$cli" ]]; then
  download="${cli}.download"
  rm -f "$download"
  curl -fsSL \
    -o "$download" \
    "https://github.com/CycloneDX/cyclonedx-cli/releases/download/${cli_version}/${asset}"
  actual_sha256="$(calculate_sha256 "$download")"
  if [[ "$actual_sha256" != "$sha256" ]]; then
    rm -f "$download"
    echo "CycloneDX CLI checksum mismatch for ${asset}: expected ${sha256}, got ${actual_sha256}" >&2
    exit 1
  fi
  mv "$download" "$cli"
  chmod +x "$cli"
fi

actual_sha256="$(calculate_sha256 "$cli")"
if [[ "$actual_sha256" != "$sha256" ]]; then
  rm -f "$cli"
  echo "CycloneDX CLI checksum mismatch for cached ${asset}: expected ${sha256}, got ${actual_sha256}" >&2
  exit 1
fi

"$cli" merge --hierarchical \
  --input-files "$maven_bom" "$npm_bom" \
  --output-file "$output" \
  --group "$group" \
  --name "$name" \
  --version "$version"
