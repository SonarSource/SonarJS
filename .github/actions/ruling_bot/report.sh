#!/usr/bin/env bash

set -euo pipefail

cd "${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"

if ! [[ "$BASE_SHA" =~ ^[0-9a-f]{40}$ ]] || ! git cat-file -e "${BASE_SHA}^{commit}"; then
  echo 'Invalid or unavailable ruling report base commit.' >&2
  exit 1
fi
if [ "$(git rev-parse HEAD)" != "$HEAD_SHA" ]; then
  echo 'Checked-out commit does not match the requested ruling report head.' >&2
  exit 1
fi

REPORT_BASE_SHA="$(git merge-base "$BASE_SHA" HEAD)"
BASE_SHA="$REPORT_BASE_SHA" \
  SOURCES_REPO_URL=https://github.com/SonarSource/jsts-test-sources/blob/master \
  RSPEC_BASE_URL='https://musical-adventure-r9qk65j.pages.github.io/rspec/#' \
  node .github/actions/ruling_bot/generate-report.mjs \
  its/ruling/src/test/resources/expected > ruling-report.md

EXISTING_COMMENT_ID="$(gh api --paginate \
  "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments?per_page=100" \
  --jq '.[] | select(.body | startswith("<!-- ruling-report -->")) | .id' | sed -n '1p')"

if [ ! -s ruling-report.md ]; then
  if [ -n "$EXISTING_COMMENT_ID" ]; then
    gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${EXISTING_COMMENT_ID}" -X DELETE
  fi
  echo 'No committed ruling result changes; any older ruling comment was cleared.'
  exit 0
fi

{
  echo '<!-- ruling-report -->'
  if [ -n "${FIX_PR_URL:-}" ]; then
    printf 'Ruling needs updating. A [fix PR](%s) has been created. Please review and merge it into your branch.\n\n' "$FIX_PR_URL"
  fi
  cat ruling-report.md
} > comment.md

if [ "$(wc -c < comment.md)" -gt 50000 ]; then
  # iconv exits nonzero when the byte cutoff splits a UTF-8 character.
  head -c 50000 comment.md | { iconv -c -f utf-8 -t utf-8 || true; } > comment-truncated.md
  printf '\n\n_(truncated; see the committed JSON files for the complete results)_\n' >> comment-truncated.md
  mv comment-truncated.md comment.md
fi

if [ -n "$EXISTING_COMMENT_ID" ]; then
  gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${EXISTING_COMMENT_ID}" \
    -X PATCH -F body=@comment.md
else
  gh pr comment "$PR_NUMBER" --body-file comment.md
fi
