#!/usr/bin/env bash

set -euo pipefail

IS_PULL_REQUEST="${1:-false}"

if [ "$IS_PULL_REQUEST" != "true" ]; then
  exit 0
fi

# Pull request workflows test GitHub's synthetic merge commit. Its first parent
# is the exact base tree included in the analysis, even if the pull request was
# opened before the base branch advanced.
if ! REPORT_BASE_SHA="$(git rev-parse --verify 'HEAD^1^{commit}' 2>/dev/null)" ||
  ! git rev-parse --verify 'HEAD^2^{commit}' >/dev/null 2>&1; then
  echo "::error::The ruling bot expected a synthetic merge commit with both parents available. Ensure the checkout fetch depth is at least 2." >&2
  exit 1
fi

printf '%s\n' "$REPORT_BASE_SHA"
