#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${SONARQUBE_CONTAINER:-sonarqube}"
SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"
TOKEN_FILE="${HOME}/.vibe-bot-credentials/.sonarqube/token"
SCAN_REPORT_FILE="peach-local-scan.json"
LEGACY_CONTAINER_FILE="container.txt"
LEGACY_SNAPSHOT_FILE="snapshot.tsv"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  manage-local-analyzer.sh status
  manage-local-analyzer.sh snapshot <state-dir>
  manage-local-analyzer.sh patch <local-jar> <state-dir>
  manage-local-analyzer.sh restore <state-dir>

Commands:
  status    Show the JavaScript analyzer jars currently present in the local SonarQube container,
            plus the server-side plugin metadata when the server is reachable.
  snapshot  Save the current JavaScript analyzer jar state from the container into <state-dir>.
  patch     Snapshot if needed, remove extra javascript jars from extensions/plugins, overwrite
            the active built-in javascript jar with <local-jar>, restart SonarQube, and wait for UP.
  restore   Restore the previously snapshotted analyzer state, restart SonarQube, and wait for UP.

Notes:
  - This helper patches the SonarQube analyzer, not the host sonar-scanner binary.
  - New snapshots are recorded in peach-local-scan.json. Legacy snapshot.tsv/container.txt sidecars
    are still read when finishing an older in-flight run.
  - If no snapshot exists but you need to get back to a clean container, recreate the SonarQube
    container from the local start-services workflow.
EOF
}

require_container() {
  docker inspect "$CONTAINER_NAME" >/dev/null 2>&1 || die "Docker container '$CONTAINER_NAME' not found"
}

current_container_id() {
  docker inspect "$CONTAINER_NAME" --format '{{.Id}}'
}

report_path_for_state_dir() {
  local state_dir=$1
  printf '%s/%s\n' "$(dirname "$state_dir")" "$SCAN_REPORT_FILE"
}

legacy_container_path_for_state_dir() {
  local state_dir=$1
  printf '%s/%s\n' "$state_dir" "$LEGACY_CONTAINER_FILE"
}

legacy_snapshot_path_for_state_dir() {
  local state_dir=$1
  printf '%s/%s\n' "$state_dir" "$LEGACY_SNAPSHOT_FILE"
}

report_has_analyzer_state() {
  local report_path=$1
  [[ -f "$report_path" ]] || return 1
  jq -e '.analyzerState.entries | length > 0' "$report_path" >/dev/null 2>&1
}

snapshot_container_id() {
  local state_dir=$1
  local report_path
  local legacy_container_path
  local container_id
  report_path=$(report_path_for_state_dir "$state_dir")

  if report_has_analyzer_state "$report_path"; then
    container_id=$(jq -r '.analyzerState.container.id // empty' "$report_path")
    [[ -n "$container_id" ]] || return 1
    printf '%s\n' "$container_id"
    return 0
  fi

  [[ -f "$report_path" ]] && return 1

  legacy_container_path=$(legacy_container_path_for_state_dir "$state_dir")
  [[ -f "$legacy_container_path" ]] || return 1
  container_id=$(awk 'NR == 1 { print $1 }' "$legacy_container_path")
  [[ -n "$container_id" ]] || return 1
  printf '%s\n' "$container_id"
}

snapshot_has_metadata() {
  local state_dir=$1
  local report_path
  local legacy_snapshot_path
  report_path=$(report_path_for_state_dir "$state_dir")
  legacy_snapshot_path=$(legacy_snapshot_path_for_state_dir "$state_dir")

  if [[ -f "$report_path" ]]; then
    report_has_analyzer_state "$report_path"
    return $?
  fi

  [[ -s "$legacy_snapshot_path" ]]
}

snapshot_builtin_path() {
  local state_dir=$1
  local report_path
  local legacy_snapshot_path
  local builtin_path
  report_path=$(report_path_for_state_dir "$state_dir")

  if report_has_analyzer_state "$report_path"; then
    builtin_path=$(
      jq -r '.analyzerState.entries[] | select(.kind == "builtin") | .originalPath' "$report_path"
    )
    [[ -n "$builtin_path" ]] || return 1
    printf '%s\n' "$builtin_path"
    return 0
  fi

  [[ -f "$report_path" ]] && return 1

  legacy_snapshot_path=$(legacy_snapshot_path_for_state_dir "$state_dir")
  [[ -f "$legacy_snapshot_path" ]] || return 1
  builtin_path=$(awk -F '\t' '$1 == "builtin" { print $2; exit }' "$legacy_snapshot_path")
  [[ -n "$builtin_path" ]] || return 1
  printf '%s\n' "$builtin_path"
}

snapshot_entries_tsv() {
  local state_dir=$1
  local report_path
  local legacy_snapshot_path
  report_path=$(report_path_for_state_dir "$state_dir")

  if report_has_analyzer_state "$report_path"; then
    jq -r '.analyzerState.entries[] | [.originalPath, .backupName] | @tsv' "$report_path"
    return 0
  fi

  [[ -f "$report_path" ]] && return 1

  legacy_snapshot_path=$(legacy_snapshot_path_for_state_dir "$state_dir")
  [[ -f "$legacy_snapshot_path" ]] || return 1
  awk -F '\t' 'NF >= 3 { print $2 "\t" $3 }' "$legacy_snapshot_path"
}

write_legacy_snapshot_state() {
  local state_dir=$1
  local snapshot_path=$2
  local legacy_container_path
  local legacy_snapshot_path

  legacy_container_path=$(legacy_container_path_for_state_dir "$state_dir")
  legacy_snapshot_path=$(legacy_snapshot_path_for_state_dir "$state_dir")

  docker inspect "$CONTAINER_NAME" \
    --format '{{.Id}} {{.Image}} {{.Created}} {{.State.StartedAt}}' \
    > "$legacy_container_path"
  cp "$snapshot_path" "$legacy_snapshot_path"
}

require_matching_snapshot_target() {
  local state_dir=$1
  local expected
  local current

  expected=$(snapshot_container_id "$state_dir") || die "Snapshot container metadata not found in $state_dir"
  current=$(current_container_id)

  [[ "$expected" == "$current" ]] || die \
    "Snapshot in $state_dir belongs to a different SonarQube container. Recreate the container or create a fresh snapshot."
}

snapshot_matches_current_target() {
  local state_dir=$1
  local expected
  local current

  expected=$(snapshot_container_id "$state_dir") || return 1
  current=$(current_container_id)
  [[ "$expected" == "$current" ]]
}

container_json() {
  docker inspect "$CONTAINER_NAME" \
    | jq -c '.[0] | {
        id: .Id,
        image: .Image,
        createdAt: .Created,
        startedAt: .State.StartedAt
      }'
}

entries_json_from_snapshot() {
  local snapshot_path=$1
  jq -Rcs '
    split("\n")
    | map(select(length > 0))
    | map(split("\t"))
    | map({
        kind: .[0],
        originalPath: .[1],
        backupName: .[2]
      })
  ' < "$snapshot_path"
}

install_container_file() {
  local source_path=$1
  local target_path=$2
  local target_dir
  local temp_path

  target_dir=$(dirname "$target_path")
  temp_path="/tmp/$(basename "$target_path").$$"
  docker cp "$source_path" "$CONTAINER_NAME:$temp_path"
  docker exec -u 0 "$CONTAINER_NAME" sh -lc \
    "mkdir -p \"$target_dir\" && cp \"$temp_path\" \"$target_path\" && chown sonarqube:root \"$target_path\" && chmod 550 \"$target_path\" && rm -f \"$temp_path\""
}

wait_for_sonarqube() {
  local tries=90

  for ((i = 0; i < tries; i++)); do
    if curl -sf "$SONAR_HOST_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; then
      return 0
    fi
    sleep 2
  done

  die "SonarQube did not become UP at $SONAR_HOST_URL after restart"
}

list_builtin_paths() {
  docker exec "$CONTAINER_NAME" sh -lc \
    'find /opt/sonarqube/lib/extensions -maxdepth 1 -name "sonar-javascript-plugin*.jar" -print | sort'
}

list_extra_paths() {
  docker exec "$CONTAINER_NAME" sh -lc \
    'find /opt/sonarqube/extensions/plugins -maxdepth 1 -name "sonar-javascript-plugin*.jar" -print | sort'
}

list_all_paths() {
  {
    list_builtin_paths
    list_extra_paths
  } | awk 'NF'
}

extract_manifest_value() {
  local jar_path=$1
  local key=$2
  unzip -p "$jar_path" META-INF/MANIFEST.MF 2>/dev/null \
    | awk -F': ' -v key="$key" '$1 == key { sub(/\r$/, "", $2); print $2; exit }'
}

describe_container_jar() {
  local path=$1
  local kind=$2
  local tmp
  local md5
  local version
  local build

  tmp=$(mktemp)
  docker cp "$CONTAINER_NAME:$path" "$tmp"
  md5=$(md5sum "$tmp" | awk '{print $1}') # NOSONAR - SonarQube exposes plugin hashes as MD5 fingerprints for comparison only.
  version=$(extract_manifest_value "$tmp" "Plugin-Version")
  build=$(extract_manifest_value "$tmp" "Implementation-Build")
  rm -f "$tmp"

  printf '%s\t%s\t%s\t%s\t%s\n' "$kind" "$path" "$md5" "${version:-unknown}" "${build:-unknown}"
}

write_server_api_status() {
  if ! curl -sf "$SONAR_HOST_URL/api/system/status" >/dev/null 2>&1; then
    echo "Server API: SonarQube is not UP at $SONAR_HOST_URL"
    return 0
  fi

  if [[ ! -f "$TOKEN_FILE" ]]; then
    echo "Server API: token file not found at $TOKEN_FILE"
    return 0
  fi

  local token
  token=$(tr -d '\r\n' < "$TOKEN_FILE")

  curl -sf -u "$token:" "$SONAR_HOST_URL/api/plugins/installed" \
    | jq -r '
        .plugins[]
        | select(.key == "javascript")
        | "Server API: version=\(.version) build=\(.implementationBuild) hash=\(.hash) type=\(.type) filename=\(.filename)"
      '
}

command_status() {
  require_container

  echo "Container: $CONTAINER_NAME"
  echo "JavaScript analyzer jars in container:"

  local found=0
  local path

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    found=1
    if [[ $path == /opt/sonarqube/lib/extensions/* ]]; then
      describe_container_jar "$path" "builtin"
    else
      describe_container_jar "$path" "extra"
    fi
  done < <(list_all_paths)

  if [[ $found -eq 0 ]]; then
    echo "No JavaScript analyzer jar found in container"
  fi

  write_server_api_status
}

command_snapshot() {
  local state_dir=${1:-}
  local report_path
  local snapshot_path
  local container_state_json
  local entries_json
  local use_report=0
  [[ -n "$state_dir" ]] || die "snapshot requires <state-dir>"
  require_container
  report_path=$(report_path_for_state_dir "$state_dir")
  if [[ -f "$report_path" ]]; then
    use_report=1
  fi

  rm -rf "$state_dir/files"
  mkdir -p "$state_dir/files"
  snapshot_path=$(mktemp)

  local path
  local kind
  local index=0
  local backup_name

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    if [[ $path == /opt/sonarqube/lib/extensions/* ]]; then
      kind="builtin"
    else
      kind="extra"
    fi
    backup_name=$(printf '%02d-%s.jar' "$index" "$kind")
    docker cp "$CONTAINER_NAME:$path" "$state_dir/files/$backup_name"
    printf '%s\t%s\t%s\n' "$kind" "$path" "$backup_name" >> "$snapshot_path"
    index=$((index + 1))
  done < <(list_all_paths)

  [[ -s "$snapshot_path" ]] || die "No JavaScript analyzer jar found to snapshot"

  if [[ "$use_report" -eq 1 ]]; then
    container_state_json=$(container_json)
    entries_json=$(entries_json_from_snapshot "$snapshot_path")
    node .claude/skills/peach-local-scan/scan-report.js \
      analyzer-state \
      "$report_path" \
      "$state_dir" \
      "$container_state_json" \
      "$entries_json"
    rm -f "$(legacy_container_path_for_state_dir "$state_dir")" "$(legacy_snapshot_path_for_state_dir "$state_dir")"
  else
    write_legacy_snapshot_state "$state_dir" "$snapshot_path"
  fi
  rm -f "$snapshot_path"
}

command_patch() {
  local local_jar=${1:-}
  local state_dir=${2:-}
  [[ -n "$local_jar" && -n "$state_dir" ]] || die "patch requires <local-jar> <state-dir>"
  [[ -f "$local_jar" ]] || die "Local analyzer jar not found: $local_jar"
  require_container

  if ! snapshot_has_metadata "$state_dir"; then
    command_snapshot "$state_dir"
  elif ! snapshot_matches_current_target "$state_dir"; then
    echo "Refreshing analyzer snapshot for current SonarQube container at $state_dir" >&2
    command_snapshot "$state_dir"
  fi

  local builtin_path
  builtin_path=$(snapshot_builtin_path "$state_dir")
  [[ -n "$builtin_path" ]] || die "No built-in JavaScript analyzer jar recorded in snapshot"

  local extra_path
  while IFS= read -r extra_path; do
    [[ -n "$extra_path" ]] || continue
    docker exec -u 0 "$CONTAINER_NAME" sh -lc "rm -f \"$extra_path\""
  done < <(list_extra_paths)

  install_container_file "$local_jar" "$builtin_path"
  docker restart "$CONTAINER_NAME" >/dev/null
  wait_for_sonarqube
  command_status
}

command_restore() {
  local state_dir=${1:-}
  local current_path
  local original_path
  local backup_name
  [[ -n "$state_dir" ]] || die "restore requires <state-dir>"
  require_container
  snapshot_has_metadata "$state_dir" || die "Snapshot metadata not found in $state_dir"
  require_matching_snapshot_target "$state_dir"

  while IFS= read -r current_path; do
    [[ -n "$current_path" ]] || continue
    docker exec -u 0 "$CONTAINER_NAME" sh -lc "rm -f \"$current_path\""
  done < <(list_all_paths)

  while IFS=$'\t' read -r original_path backup_name; do
    [[ -n "$original_path" ]] || continue
    [[ -f "$state_dir/files/$backup_name" ]] || die "Missing backup file: $state_dir/files/$backup_name"
    install_container_file "$state_dir/files/$backup_name" "$original_path"
  done < <(snapshot_entries_tsv "$state_dir")

  docker restart "$CONTAINER_NAME" >/dev/null
  wait_for_sonarqube
  command_status
}

main() {
  local cmd=${1:-}
  shift || true

  case "$cmd" in
    status)
      command_status "$@"
      ;;
    snapshot)
      command_snapshot "$@"
      ;;
    patch)
      command_patch "$@"
      ;;
    restore)
      command_restore "$@"
      ;;
    -h|--help|help|"")
      usage
      ;;
    *)
      usage >&2
      die "Unknown command: $cmd"
      ;;
  esac
}

main "$@"
