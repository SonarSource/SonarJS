#!/usr/bin/env bash

set -euo pipefail

cd "${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"

FIX_BRANCH="fix/update-ruling-for-${TARGET_REF}"
FIX_COMMIT_MESSAGE=$'Update ruling results\n\nGenerated with GitHub Actions'

if [ "$RULING_FAILED" != "true" ]; then
  FIX_PR_STATE="$(gh pr view "$FIX_BRANCH" --json state --jq '.state' 2>/dev/null || true)"
  if [ "$FIX_PR_STATE" = "OPEN" ]; then
    gh pr close "$FIX_BRANCH" --comment 'No longer needed - the original PR is now up to date.'
    git push origin --delete "$FIX_BRANCH" 2>/dev/null || true
  fi
  exit 0
fi

if git log -1 --format=%B | grep -q 'Generated with GitHub Actions'; then
  echo 'Last commit was an auto-update; skipping to prevent a loop.'
  exit 0
fi

if [ "$IS_PULL_REQUEST" = "true" ]; then
  CURRENT_HEAD_SHA="$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}" --jq '.head.sha')"
  if [ "$CURRENT_HEAD_SHA" != "$TESTED_HEAD_SHA" ]; then
    echo '::error::PR head changed since ruling ran; refusing to apply stale results.'
    exit 1
  fi
fi

node "$ACTION_PATH/sync-results.mjs" "$NEW_RESULTS_PATH" "$OLD_RESULTS_PATH"
if [ -z "$(git status --porcelain -- "$OLD_RESULTS_PATH")" ]; then
  echo '::error::Ruling failed, but generated results contain no expected-result changes.'
  exit 1
fi

git stash push -u -m ruling-sync-changes -- "$OLD_RESULTS_PATH" >/dev/null
git fetch origin "refs/heads/$TARGET_REF:refs/remotes/origin/$TARGET_REF"
if [ "$(git rev-parse "origin/$TARGET_REF")" != "$TESTED_HEAD_SHA" ]; then
  echo '::error::Target branch changed since ruling ran; refusing to apply stale results.'
  exit 1
fi
git config user.name 'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'

FIX_BRANCH_SHA="$(git ls-remote origin "refs/heads/$FIX_BRANCH" | cut -f1)"

git checkout -f -B "$FIX_BRANCH" "origin/$TARGET_REF"
git stash pop >/dev/null
git add -- "$OLD_RESULTS_PATH"
if git diff --staged --quiet -- "$OLD_RESULTS_PATH"; then
  echo '::error::Ruling results no longer differ from the target branch.'
  exit 1
fi

git commit -m "$FIX_COMMIT_MESSAGE"
if [ -n "$FIX_BRANCH_SHA" ]; then
  git push "--force-with-lease=refs/heads/$FIX_BRANCH:$FIX_BRANCH_SHA" origin "$FIX_BRANCH"
else
  git push origin "$FIX_BRANCH"
fi

FIX_PR_NUMBER="$(gh pr list --head "$FIX_BRANCH" --base "$TARGET_REF" --state open --json number --jq '.[0].number // empty')"
if [ -z "$FIX_PR_NUMBER" ]; then
  if [ "$IS_PULL_REQUEST" = "true" ]; then
    FIX_PR_TITLE="Update ruling results for PR #${PR_NUMBER}"
    FIX_PR_BODY="Auto-generated ruling update for PR #${PR_NUMBER}."
  else
    FIX_PR_TITLE="Update ruling results for ${TARGET_REF}"
    FIX_PR_BODY="Auto-generated ruling update for ${TARGET_REF}."
  fi
  FIX_PR_URL="$(gh pr create --title "$FIX_PR_TITLE" --base "$TARGET_REF" --head "$FIX_BRANCH" --body "$FIX_PR_BODY")"
  FIX_PR_NUMBER="$(gh pr view "$FIX_PR_URL" --json number --jq .number)"
else
  FIX_PR_URL="$(gh pr view "$FIX_PR_NUMBER" --json url --jq .url)"
fi

echo "Ruling fix PR: $FIX_PR_URL" >> "$GITHUB_STEP_SUMMARY"

# GITHUB_TOKEN-created PR events do not start workflows, so request the
# independently rerunnable report workflow explicitly. PR runs report the
# committed fix on the original PR, where reviewers expect the ruling result.
REPORT_PR_NUMBER="$FIX_PR_NUMBER"
REPORT_FIX_PR_URL=""
if [ "$IS_PULL_REQUEST" = "true" ]; then
  REPORT_PR_NUMBER="$PR_NUMBER"
  REPORT_FIX_PR_URL="$FIX_PR_URL"
  # Report what the fix PR changes relative to the tested PR branch.
  REPORT_BASE_SHA="$TESTED_HEAD_SHA"
else
  REPORT_BASE_SHA="$(git rev-parse "origin/$TARGET_REF")"
fi
if ! gh workflow run ruling-diff-comment.yml --ref "$FIX_BRANCH" \
  -f pr-number="$REPORT_PR_NUMBER" \
  -f base-sha="$REPORT_BASE_SHA" \
  -f head-sha="$(git rev-parse HEAD)" \
  -f fix-pr-url="$REPORT_FIX_PR_URL"; then
  echo '::warning::Ruling comment dispatch failed; rerun Ruling Diff Comment manually.'
fi
