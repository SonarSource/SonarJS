#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${SONARQUBE_CONTAINER:-sonarqube}"
SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"
TOKEN_FILE="${HOME}/.vibe-bot-credentials/.sonarqube/token"

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
  - The restore command only restores a state previously captured by snapshot.
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

snapshot_container_id() {
  local state_dir=$1
  [[ -f "$state_dir/container.txt" ]] || return 1
  awk 'NR == 1 { print $1 }' "$state_dir/container.txt"
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

write_snapshot_metadata() {
  local state_dir=$1
  docker inspect "$CONTAINER_NAME" \
    --format '{{.Id}} {{.Image}} {{.Created}} {{.State.StartedAt}}' \
    > "$state_dir/container.txt"
}

command_snapshot() {
  local state_dir=${1:-}
  [[ -n "$state_dir" ]] || die "snapshot requires <state-dir>"
  require_container

  mkdir -p "$state_dir/files"
  write_snapshot_metadata "$state_dir"
  : > "$state_dir/snapshot.tsv"

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
    printf '%s\t%s\t%s\n' "$kind" "$path" "$backup_name" >> "$state_dir/snapshot.tsv"
    index=$((index + 1))
  done < <(list_all_paths)

  [[ -s "$state_dir/snapshot.tsv" ]] || die "No JavaScript analyzer jar found to snapshot"
}

command_patch() {
  local local_jar=${1:-}
  local state_dir=${2:-}
  [[ -n "$local_jar" && -n "$state_dir" ]] || die "patch requires <local-jar> <state-dir>"
  [[ -f "$local_jar" ]] || die "Local analyzer jar not found: $local_jar"
  require_container

  if [[ ! -f "$state_dir/snapshot.tsv" ]]; then
    command_snapshot "$state_dir"
  else
    require_matching_snapshot_target "$state_dir"
  fi

  local builtin_path
  builtin_path=$(awk -F '\t' '$1 == "builtin" { print $2; exit }' "$state_dir/snapshot.tsv")
  [[ -n "$builtin_path" ]] || die "No built-in JavaScript analyzer jar recorded in snapshot"

  local extra_path
  while IFS= read -r extra_path; do
    [[ -n "$extra_path" ]] || continue
    docker exec "$CONTAINER_NAME" sh -lc "rm -f \"$extra_path\""
  done < <(list_extra_paths)

  docker cp "$local_jar" "$CONTAINER_NAME:$builtin_path"
  docker restart "$CONTAINER_NAME" >/dev/null
  wait_for_sonarqube
  command_status
}

command_restore() {
  local state_dir=${1:-}
  [[ -n "$state_dir" ]] || die "restore requires <state-dir>"
  [[ -f "$state_dir/snapshot.tsv" ]] || die "Snapshot metadata not found in $state_dir"
  require_container
  require_matching_snapshot_target "$state_dir"

  local current_path
  while IFS= read -r current_path; do
    [[ -n "$current_path" ]] || continue
    docker exec "$CONTAINER_NAME" sh -lc "rm -f \"$current_path\""
  done < <(list_all_paths)

  local original_path
  local backup_name

  while IFS=$'\t' read -r _ original_path backup_name; do
    [[ -n "$original_path" ]] || continue
    [[ -f "$state_dir/files/$backup_name" ]] || die "Missing backup file: $state_dir/files/$backup_name"
    docker cp "$state_dir/files/$backup_name" "$CONTAINER_NAME:$original_path"
  done < "$state_dir/snapshot.tsv"

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
