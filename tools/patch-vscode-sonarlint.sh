#!/usr/bin/env bash

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/$(basename "${BASH_SOURCE[0]}")"

TARGET_KIND="auto"
SONARLINT_EXT=""
PATCH_JAR=""
RUN_BUILD=0
RESTORE_STAMP=""
ACTIVE_STAMP=""

usage() {
  cat <<EOF
Patch a local VS Code SonarLint / SonarQube for IDE installation with a SonarJS jar.

USAGE:
  $(basename "$0") [OPTIONS]

PATCH OPTIONS:
  --build               Build the plugin jar from the current checkout with:
                        mvn -pl sonar-plugin/sonar-javascript-plugin -am -DskipTests package
                        This may update generated tracked files in the repo.
  --jar <path>          Use an existing sonar-javascript-plugin jar
  --ext <path>          Patch a specific sonarsource.sonarlint-vscode-* directory
  --server              Prefer ~/.vscode-server/extensions
  --desktop             Prefer ~/.vscode/extensions

RESTORE OPTIONS:
  --restore <stamp>     Restore analyzer and eslint-bridge from a backup stamp
  --restore latest      Restore the most recent backup for the chosen extension

GENERAL:
  --help, -h            Show this help text

DEFAULTS:
  - Without --jar, the script uses the newest local
    sonar-plugin/sonar-javascript-plugin/target/sonar-javascript-plugin-*.jar
  - In auto mode, the script prefers ~/.vscode-server/extensions when present,
    otherwise ~/.vscode/extensions

EXAMPLES:
  $(basename "$0") --build
  $(basename "$0") --jar "\$HOME/Downloads/sonar-javascript-plugin-12.6.0-SNAPSHOT.jar"
  $(basename "$0") --desktop --build
  $(basename "$0") --restore latest
  $(basename "$0") --restore 20260602T105318+0200 --ext "\$HOME/.vscode/extensions/sonarsource.sonarlint-vscode-5.3.0-darwin-arm64"
EOF
}

info() {
  printf '%s\n' "$*"
}

warn() {
  printf 'Warning: %s\n' "$*" >&2
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

on_error() {
  if [ -n "${ACTIVE_STAMP}" ] && [ -n "${SONARLINT_EXT}" ]; then
    warn "Patch may be incomplete."
    warn "Restore with: ${SCRIPT_PATH} --restore ${ACTIVE_STAMP} --ext \"${SONARLINT_EXT}\""
  fi
}

trap on_error ERR

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

resolve_existing_path() {
  local path="$1"
  if [ ! -e "$path" ]; then
    fail "Path does not exist: $path"
  fi
  (
    cd "$(dirname "$path")"
    printf '%s/%s\n' "$(pwd)" "$(basename "$path")"
  )
}

stat_mtime() {
  local path="$1"
  if stat -f '%m' "$path" >/dev/null 2>&1; then
    stat -f '%m' "$path"
  else
    stat -c '%Y' "$path"
  fi
}

latest_extension_in_root() {
  local root="$1"
  local matches=()
  local path=""

  [ -d "$root" ] || return 1

  while IFS= read -r -d '' path; do
    matches+=("$path")
  done < <(find "$root" -maxdepth 1 -type d -name 'sonarsource.sonarlint-vscode-*' -print0 2>/dev/null)

  [ "${#matches[@]}" -gt 0 ] || return 1

  local best="${matches[0]}"
  local best_mtime
  best_mtime="$(stat_mtime "$best")"

  local candidate=""
  local candidate_mtime=""
  for candidate in "${matches[@]:1}"; do
    candidate_mtime="$(stat_mtime "$candidate")"
    if [ "$candidate_mtime" -gt "$best_mtime" ]; then
      best="$candidate"
      best_mtime="$candidate_mtime"
    fi
  done

  printf '%s\n' "$best"
}

detect_extension_path() {
  local server_root="${HOME}/.vscode-server/extensions"
  local desktop_root="${HOME}/.vscode/extensions"
  local server_ext=""
  local desktop_ext=""

  case "$TARGET_KIND" in
    server)
      latest_extension_in_root "$server_root" ||
        fail "No sonarsource.sonarlint-vscode-* extension found under ${server_root}"
      return 0
      ;;
    desktop)
      latest_extension_in_root "$desktop_root" ||
        fail "No sonarsource.sonarlint-vscode-* extension found under ${desktop_root}"
      return 0
      ;;
    auto)
      server_ext="$(latest_extension_in_root "$server_root" || true)"
      desktop_ext="$(latest_extension_in_root "$desktop_root" || true)"

      if [ -n "$server_ext" ]; then
        if [ -n "$desktop_ext" ]; then
          warn "Found both server and desktop extension copies; using server copy."
          warn "Pass --desktop, --server, or --ext to override."
        fi
        printf '%s\n' "$server_ext"
        return 0
      fi

      if [ -n "$desktop_ext" ]; then
        printf '%s\n' "$desktop_ext"
        return 0
      fi
      ;;
    *)
      fail "Unsupported target kind: $TARGET_KIND"
      ;;
  esac

  fail "No sonarsource.sonarlint-vscode-* extension found under ${server_root} or ${desktop_root}"
}

latest_local_patch_jar() {
  local target_dir="${REPO_ROOT}/sonar-plugin/sonar-javascript-plugin/target"
  local matches=()
  local path=""

  while IFS= read -r -d '' path; do
    matches+=("$path")
  done < <(
    find "$target_dir" -maxdepth 1 -type f -name 'sonar-javascript-plugin-*.jar' \
      ! -name '*-sources.jar' \
      ! -name '*-javadoc.jar' \
      ! -name '*-multi.jar' \
      ! -name '*-darwin-*.jar' \
      ! -name '*-linux-*.jar' \
      ! -name '*-win-*.jar' \
      -print0 2>/dev/null
  )

  [ "${#matches[@]}" -gt 0 ] || return 1

  local best="${matches[0]}"
  local best_mtime
  best_mtime="$(stat_mtime "$best")"

  local candidate=""
  local candidate_mtime=""
  for candidate in "${matches[@]:1}"; do
    candidate_mtime="$(stat_mtime "$candidate")"
    if [ "$candidate_mtime" -gt "$best_mtime" ]; then
      best="$candidate"
      best_mtime="$candidate_mtime"
    fi
  done

  printf '%s\n' "$best"
}

bridge_payload_entry() {
  local jar="$1"
  local entry=""
  while IFS= read -r entry; do
    case "$entry" in
      sonarjs-*.tgz)
        printf '%s\n' "$entry"
        return 0
        ;;
    esac
  done < <(unzip -Z1 "$jar")

  return 1
}

print_manifest_summary() {
  local jar="$1"
  unzip -p "$jar" META-INF/MANIFEST.MF | grep -E 'Plugin-Version|Plugin-Display-Version|Implementation-Build' || true
}

latest_backup_stamp() {
  local ext="$1"
  local backups=("$ext"/analyzers/sonarjs.jar.bak-*)

  [ "${#backups[@]}" -gt 0 ] || return 1

  local best="${backups[0]}"
  local best_mtime
  best_mtime="$(stat_mtime "$best")"

  local candidate=""
  local candidate_mtime=""
  for candidate in "${backups[@]:1}"; do
    candidate_mtime="$(stat_mtime "$candidate")"
    if [ "$candidate_mtime" -gt "$best_mtime" ]; then
      best="$candidate"
      best_mtime="$candidate_mtime"
    fi
  done

  printf '%s\n' "${best##*sonarjs.jar.bak-}"
}

log_root_for_extension() {
  local ext="$1"

  case "$ext" in
    "${HOME}/.vscode-server/extensions/"*)
      printf '%s\n' "${HOME}/.vscode-server/data/logs"
      ;;
    "${HOME}/.vscode/extensions/"*)
      printf '%s\n' "${HOME}/Library/Application Support/Code/logs"
      ;;
    *)
      return 1
      ;;
  esac
}

print_log_hint() {
  local ext="$1"
  local log_root=""

  if ! log_root="$(log_root_for_extension "$ext")"; then
    warn "Could not infer the SonarQube for IDE logs directory for ${ext}."
    return 0
  fi

  cat <<EOF

After reloading VS Code and opening a JS/TS file, verify the runtime with:
  LATEST_LOG="\$(find "${log_root}" -path '*SonarSource.sonarlint-vscode/SonarQube for IDE.log' 2>/dev/null | sort | tail -n 1)"
  grep -En 'Starting analysis with configuration|sonar\\.js\\.internal\\.bundlePath|server\\.cjs' "\$LATEST_LOG"
EOF
}

build_local_plugin() {
  require_command mvn

  info "Building sonar-javascript-plugin from ${REPO_ROOT}"
  info "Command: mvn -pl sonar-plugin/sonar-javascript-plugin -am -DskipTests package"
  info "Note: this build may update generated tracked files such as README rule counts."

  (
    cd "$REPO_ROOT"
    mvn -pl sonar-plugin/sonar-javascript-plugin -am -DskipTests package
  )
}

patch_extension() {
  local ext="$1"
  local patch_jar="$2"
  local payload=""

  require_command cp
  require_command mv
  require_command mkdir
  require_command unzip
  require_command tar

  [ -f "$patch_jar" ] || fail "Patch jar not found: $patch_jar"
  [ -f "$ext/analyzers/sonarjs.jar" ] || fail "Missing analyzer jar under ${ext}/analyzers"

  payload="$(bridge_payload_entry "$patch_jar")"
  [ -n "$payload" ] || fail "Could not find embedded sonarjs *.tgz payload in $patch_jar"

  ACTIVE_STAMP="$(date +%Y%m%dT%H%M%S%z)"

  info "Patching extension: $ext"
  info "Using jar: $patch_jar"
  info "Embedded bridge payload: $payload"

  cp "$ext/analyzers/sonarjs.jar" "$ext/analyzers/sonarjs.jar.bak-${ACTIVE_STAMP}"

  if [ -d "$ext/eslint-bridge" ]; then
    mv "$ext/eslint-bridge" "$ext/eslint-bridge.bak-${ACTIVE_STAMP}"
  fi

  cp "$patch_jar" "$ext/analyzers/sonarjs.jar"
  mkdir -p "$ext/eslint-bridge"

  unzip -p "$ext/analyzers/sonarjs.jar" "$payload" | tar -xzf - -C "$ext/eslint-bridge"

  [ -f "$ext/eslint-bridge/package/bin/server.cjs" ] ||
    fail "eslint-bridge extraction failed: package/bin/server.cjs is missing"

  info ""
  info "Patch complete."
  info "Backup stamp: ${ACTIVE_STAMP}"
  print_manifest_summary "$ext/analyzers/sonarjs.jar"

  cat <<EOF

Restore with:
  ${SCRIPT_PATH} --restore ${ACTIVE_STAMP} --ext "${ext}"
EOF

  print_log_hint "$ext"
}

restore_extension() {
  local ext="$1"
  local stamp="$2"
  local backup_jar="$ext/analyzers/sonarjs.jar.bak-${stamp}"
  local backup_bridge="$ext/eslint-bridge.bak-${stamp}"

  require_command cp
  require_command mv
  require_command rm

  [ -f "$backup_jar" ] || fail "Backup jar not found: $backup_jar"

  info "Restoring extension: $ext"
  info "Using backup stamp: $stamp"

  cp "$backup_jar" "$ext/analyzers/sonarjs.jar"

  if [ -d "$backup_bridge" ]; then
    rm -rf "$ext/eslint-bridge"
    mv "$backup_bridge" "$ext/eslint-bridge"
  else
    warn "No eslint-bridge backup found for stamp ${stamp}; left current eslint-bridge in place."
  fi

  info ""
  info "Restore complete."
  print_manifest_summary "$ext/analyzers/sonarjs.jar"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --build)
      RUN_BUILD=1
      shift
      ;;
    --jar)
      [ "$#" -ge 2 ] || fail "--jar requires a path"
      PATCH_JAR="$2"
      shift 2
      ;;
    --ext)
      [ "$#" -ge 2 ] || fail "--ext requires a path"
      SONARLINT_EXT="$2"
      shift 2
      ;;
    --restore)
      [ "$#" -ge 2 ] || fail "--restore requires a stamp or 'latest'"
      RESTORE_STAMP="$2"
      shift 2
      ;;
    --server)
      TARGET_KIND="server"
      shift
      ;;
    --desktop)
      TARGET_KIND="desktop"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

if [ -n "$RESTORE_STAMP" ] && [ "$RUN_BUILD" -eq 1 ]; then
  fail "--restore cannot be combined with --build"
fi

if [ -n "$RESTORE_STAMP" ] && [ -n "$PATCH_JAR" ]; then
  fail "--restore cannot be combined with --jar"
fi

if [ -n "$SONARLINT_EXT" ]; then
  SONARLINT_EXT="$(resolve_existing_path "$SONARLINT_EXT")"
else
  SONARLINT_EXT="$(detect_extension_path)"
fi

[ -d "$SONARLINT_EXT" ] || fail "Extension directory not found: $SONARLINT_EXT"

if [ -n "$RESTORE_STAMP" ]; then
  if [ "$RESTORE_STAMP" = "latest" ]; then
    RESTORE_STAMP="$(latest_backup_stamp "$SONARLINT_EXT")" ||
      fail "No backup stamps found under ${SONARLINT_EXT}/analyzers"
  fi

  restore_extension "$SONARLINT_EXT" "$RESTORE_STAMP"
  exit 0
fi

if [ -n "$PATCH_JAR" ] && [ "$RUN_BUILD" -eq 1 ]; then
  fail "--build cannot be combined with --jar"
fi

if [ "$RUN_BUILD" -eq 1 ]; then
  build_local_plugin
fi

if [ -n "$PATCH_JAR" ]; then
  PATCH_JAR="$(resolve_existing_path "$PATCH_JAR")"
else
  PATCH_JAR="$(latest_local_patch_jar)" ||
    fail "No local sonar-javascript-plugin jar found. Run with --build or pass --jar <path>."
fi

patch_extension "$SONARLINT_EXT" "$PATCH_JAR"
