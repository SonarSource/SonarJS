#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
cd "$ROOT_DIR"

AUTO_GENERATED_MARKER="Generated with GitHub Actions"
COMMENT_MARKER="<!-- ruling-report -->"
FIX_BRANCH="fix/update-ruling-for-${TARGET_REF}"
FIX_PR_URL=""
FIX_BRANCH_EXISTS="false"
HAS_DIFFERENCES="false"
STASHED_CHANGES="false"

if [ "${IS_PULL_REQUEST}" = "true" ]; then
  FIX_PR_TITLE="Update ruling results for PR #${PR_NUMBER}"
  FIX_PR_BODY=$'Auto-generated ruling update for PR #'"${PR_NUMBER}"$'.\n\nGenerated with GitHub Actions'
else
  FIX_PR_TITLE="Update ruling results for ${TARGET_REF}"
  FIX_PR_BODY=$'Auto-generated ruling update for '"${TARGET_REF}"$'.\n\nGenerated with GitHub Actions'
fi

FIX_COMMIT_MESSAGE=$'Update ruling results\n\nGenerated with GitHub Actions'

get_open_fix_pr_url() {
  gh pr list \
    --head "$FIX_BRANCH" \
    --base "$TARGET_REF" \
    --state open \
    --json url \
    --jq '.[0].url // empty'
}

stash_ruling_changes() {
  if [ -n "$(git status --porcelain -- its/ruling/src/test/expected/)" ]; then
    git stash push -u -m "ruling-sync-changes" -- its/ruling/src/test/expected/ >/dev/null
    STASHED_CHANGES="true"
  fi
}

restore_ruling_changes() {
  if [ "$STASHED_CHANGES" = "true" ]; then
    git stash pop >/dev/null
  fi
}

write_pr_comment() {
  if [ "$HAS_DIFFERENCES" = "true" ]; then
    {
      echo "$COMMENT_MARKER"
      cat ruling-report.md
      echo ""
      if [ "$RULING_FAILED" = "true" ] && [ -n "${FIX_PR_URL}" ]; then
        echo "---"
        echo "**Ruling needs updating.** A fix PR has been created: ${FIX_PR_URL}"
        echo ""
        echo "Please review and merge it into your branch."
      fi
    } > comment.md
  else
    {
      echo "$COMMENT_MARKER"
      echo "## Ruling Report"
      echo ""
      echo "**No changes to ruling expected issues in this PR**"
    } > comment.md
  fi

  if [ "$(wc -c < comment.md)" -gt 50000 ]; then
    head -c 50000 comment.md > comment-truncated.md
    echo "" >> comment-truncated.md
    echo "_(truncated - full report too large for PR comment)_" >> comment-truncated.md
    mv comment-truncated.md comment.md
  fi

  EXISTING_COMMENT_ID="$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
    --jq ".[] | select(.body | startswith(\"${COMMENT_MARKER}\")) | .id" | head -1)"

  if [ -n "$EXISTING_COMMENT_ID" ]; then
    gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${EXISTING_COMMENT_ID}" \
      -X PATCH -F body=@comment.md
  else
    gh pr comment "$PR_NUMBER" --body-file comment.md
  fi
}

write_summary() {
  if [ -n "${FIX_PR_URL}" ]; then
    {
      echo "## Ruling Report"
      echo ""
      echo "**Ruling needs updating.** A fix PR has been created: ${FIX_PR_URL}"
    } >> "$GITHUB_STEP_SUMMARY"
  else
    {
      echo "## Ruling Report"
      echo ""
      echo "**No ruling fix PR was needed for this run.**"
    } >> "$GITHUB_STEP_SUMMARY"
  fi
}

git fetch origin "$BASE_REF"
if [ -n "${BASE_SHA}" ]; then
  git fetch origin "$BASE_SHA" || true
  if ! git cat-file -e "$BASE_SHA^{commit}" 2>/dev/null; then
    echo "::error::Failed to fetch PR base SHA: $BASE_SHA"
    exit 1
  fi
fi

if [ "$RULING_FAILED" = "true" ]; then
  LAST_COMMIT_MSG="$(git log -1 --format=%B)"
  if printf '%s' "$LAST_COMMIT_MSG" | grep -q "$AUTO_GENERATED_MARKER"; then
    echo "Last commit was an auto-update, skipping to prevent infinite loop"
    exit 0
  fi

  npm run ruling-sync
fi

node tools/ruling-report.js > ruling-report.md
if [ -s ruling-report.md ]; then
  HAS_DIFFERENCES="true"
fi

if [ "$RULING_FAILED" = "true" ] && [ "$HAS_DIFFERENCES" = "true" ]; then
  if git ls-remote --exit-code origin "refs/heads/$FIX_BRANCH" >/dev/null 2>&1; then
    FIX_BRANCH_EXISTS="true"
  fi

  stash_ruling_changes

  git fetch origin "$TARGET_REF"
  git config user.name "github-actions[bot]"
  git config user.email "github-actions[bot]@users.noreply.github.com"
  git checkout -B "$FIX_BRANCH" "origin/$TARGET_REF"
  restore_ruling_changes

  git add its/ruling/src/test/expected/

  if git diff --staged --quiet; then
    echo "No ruling changes to commit"
  else
    git commit -m "$FIX_COMMIT_MESSAGE"
    if [ "$FIX_BRANCH_EXISTS" = "true" ]; then
      git push --force-with-lease origin "$FIX_BRANCH"
    else
      git push origin "$FIX_BRANCH"
    fi
  fi

  FIX_PR_URL="$(get_open_fix_pr_url 2>/dev/null || true)"
  if [ -z "$FIX_PR_URL" ]; then
    FIX_PR_URL="$(gh pr create \
      --title "$FIX_PR_TITLE" \
      --base "$TARGET_REF" \
      --head "$FIX_BRANCH" \
      --body "$FIX_PR_BODY")"
  fi
else
  FIX_PR_STATE="$(gh pr view "$FIX_BRANCH" --json state --jq '.state' 2>/dev/null || true)"
  if [ "$FIX_PR_STATE" = "OPEN" ]; then
    gh pr close "$FIX_BRANCH" --comment "No longer needed - the original PR is now up to date."
    git push origin --delete "$FIX_BRANCH" 2>/dev/null || true
  fi
fi

if [ "$IS_PULL_REQUEST" = "true" ]; then
  write_pr_comment
else
  write_summary
fi

if [ "$RULING_FAILED" = "true" ] && [ "$HAS_DIFFERENCES" = "true" ]; then
  if [ -n "$FIX_PR_URL" ]; then
    echo "::error::Ruling results are out of date. See fix PR: ${FIX_PR_URL}"
  else
    echo "::error::Ruling results are out of date."
  fi
  exit 1
fi
