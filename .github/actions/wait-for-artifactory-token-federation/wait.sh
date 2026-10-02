#!/usr/bin/env bash
set -euo pipefail

: "${ARTIFACTORY_ACCESS_TOKEN:?ARTIFACTORY_ACCESS_TOKEN must be configured before waiting for token federation}"
: "${ARTIFACTORY_URL:?ARTIFACTORY_URL must be set}"
: "${PROBE_PATH:?PROBE_PATH must be set}"

for attempt in {1..12}; do
  status=$(curl --silent --output /dev/null --write-out "%{http_code}" \
    --header "Authorization: Bearer ${ARTIFACTORY_ACCESS_TOKEN}" \
    "${ARTIFACTORY_URL}/${PROBE_PATH}" || true)
  if [[ "${status}" == "200" ]]; then
    echo "Artifactory token accepted by Edge"
    exit 0
  fi
  if [[ "${status}" != "401" && "${status}" != "000" ]]; then
    echo "Unexpected response from Edge: HTTP ${status}"
    exit 1
  fi
  echo "Waiting for Artifactory token federation (attempt ${attempt}/12)"
  sleep 10
done

echo "Artifactory token was not accepted by Edge within 2 minutes"
exit 1
