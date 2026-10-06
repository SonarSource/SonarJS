# Ruling bot

The updater persists generated expectations in a fix PR before requesting an independent report.
The reporter reads the exact tree tested by ruling, using implementation code from a stable workflow
ref. A third action closes obsolete fixes after their original PR closes or merges.

## Configuration and reuse

SonarJS settings live in [`.github/ruling-bot.json`](../../ruling-bot.json). Build loads this once,
adds the Build attempt to the artifact name, and passes the resulting configuration through job
outputs to upload, download, update, and dispatch. `report-config` carries that same JSON to the
reporter; a later change to the reporter's checkout cannot change a completed Build's paths or links.
The JSON bundle also keeps the dispatch within GitHub's ten-input limit.

Other repositories can use the updater, `report`, and `cleanup` composite actions with their own
configuration. Both result directories contain the sonar-lits `<project>/<language>-<rule>.json`
layout. Helper scripts resolve relative to the action installation; data paths resolve relative to
the tested checkout (`github.workspace`, or `repository-path` for the reporter).

| Input                   | Purpose                                             | Generic default           |
| ----------------------- | --------------------------------------------------- | ------------------------- |
| `new-results-path`      | Generated results, including additions and removals | Required                  |
| `old-results-path`      | Version-controlled expectations                     | Required                  |
| `sources-path`          | Local sources used for snippets                     | `its/sources`             |
| `sources-repo-url`      | Source-file links                                   | Empty                     |
| `rspec-base-url`        | Rule links                                          | Public RSPEC              |
| `max-inline-snippets`   | Snippet limit per report section                    | `10`                      |
| `results-artifact-name` | Exact saved-results artifact name                   | `ruling-results`          |
| `report-workflow`       | Reporter workflow filename or ID                    | `ruling-diff-comment.yml` |
| `report-workflow-ref`   | Ref containing the reporter implementation          | Repository default branch |

The first four optional reporting settings were action inputs before #8050; restoring them avoids
embedding SonarJS paths and URLs in the reporter. The artifact/workflow settings also make the
artifact handoff usable by other repositories. `tested-commit-sha` optionally overrides `github.sha`
in the updater; the reporter requires `head-sha` explicitly.

Calling workflows need Node, Git, and `gh`. The updater needs `contents: write`,
`pull-requests: write`, and `actions: write`; reporting needs `contents: read`,
`pull-requests: write`, and `actions: read`; cleanup needs `contents: write` and
`pull-requests: write`. Lifecycle ownership checks expect PRs/comments created by
`github-actions[bot]` using `GITHUB_TOKEN`.

## Tested baseline and independent retries

For a PR, `head-sha` is the synthetic two-parent merge tested by Build. Its first parent is the
report baseline; its second parent is the original PR head used for freshness checks. Neither the
branch point, a moving base branch, nor the fix commit is a substitute. The reporter rejects an
incorrect checkout, mismatched parents, or unavailable baseline before changing a comment.

A failure report mirrors saved generated results onto that tested merge. A passing report reads
expectations already committed in it. Both include new/untracked JSON files and deleted JSON files.
For a default-branch failure, the tested branch commit is the baseline and the report goes on the fix
PR. On a passing default-branch run, the updater closes obsolete default-branch fixes.

Dispatch defaults to the repository's default branch, which contains the reporter even when the PR
head predates its introduction. The workflow checks out implementation code and the exact tested
tree separately. Set `report-workflow-ref` to another stable ref when testing a reporter change.
Dispatch failure fails the update job visibly while leaving the persisted fix available.

The simplest retry is `gh run rerun <report-run-id>`; this retains the original dispatch inputs.
To dispatch again with a newer reporter implementation, supply the same tested SHAs, originating
Build run ID/attempt, fix URL, and configuration. See [the CI guide](../../../docs/CI.md#js_ts_ruling)
for a complete command. Artifact expiry or a missing merge commit fails visibly; it never substitutes
a newer tree or artifact. Rerunning ruling itself is required when that evidence is unavailable.

## Freshness and mutation coordination

The updater, reporter, and closed-event cleanup share a concurrency group for the original PR (or
the tested default branch). They use `cancel-in-progress: false` and `queue: max`. The queue preserves
pending jobs; merely disabling cancellation would still let a delayed run replace the one pending
newer report/cleanup. Report workflow groups additionally include the tested merge SHA, so an old
dispatch cannot cancel or replace another tree's report. GitHub bounds these queues at 100 pending
jobs/runs; this is coordination, not a guarantee of unlimited delivery.

Each queued operation checks the original PR's current state/head (or current default-branch head).
Build-derived work also checks the originating run attempt and whether a newer Build exists for the
same head/event. Checks repeat before writes. This covers advancing heads, different merges for the
same PR head, delayed dispatches, stale successful cleanup, and old attempts of a retried Build.
Raw PR-event reports carry no completed Build identity and cannot overwrite a completed report for
the same tested merge. Passing Build retries dispatch again, replacing stale failure notices even
when no push triggered a new PR event.

Fix pushes and deletions use an explicit SHA lease, including the empty lease when creating a new
branch. A concurrent update causes a visible failure rather than overwriting/deleting another
commit. An existing fix branch must belong to this target; an orphan from failed PR creation is
recoverable through the identity in its bot commit. Unrelated dirty tracked build output is discarded
when switching to the target branch, while expectation changes are retained through the stash.

GitHub API state checks and Git ref writes are separate operations. A human can still push, merge,
or reopen during the final API window; the queue coordinates bot jobs, and repeated checks/leases
reduce that window without claiming a cross-API transaction.

## Closing and merging the original PR

`ruling-fix-cleanup.yml` handles `pull_request_target: closed` using trusted default-branch code.
It never checks out or executes code from the closed PR and is restricted to same-repository PRs.

New fixes have an original repository/PR identity marker in their body and generated commit. Cleanup
uses that identity rather than the current base ref: GitHub may retarget a fix PR when its original
base branch is merged or deleted. For existing fixes, the exact legacy title/body, same head
repository, fix-branch prefix, and bot author establish ownership. A user-created PR is not owned
merely because its branch or body resembles a generated fix. Closed/merged fixes are left alone;
only open managed fixes are closed and their unchanged branches deleted. A delayed event for an
original PR that has reopened skips cleanup.

When ruling passes, the same guarded cleanup removes obsolete fixes. Empty reports remove stale bot
comments, except that a failing run with no net issue changes still retains its required fix link:
generated expectations may equal the tested base while the PR's committed expectations are wrong.
Only bot-authored report comments are updated. Large comments retain the existing UTF-8-safe limit.

## Regression tests

```sh
node --test .github/actions/ruling_bot/tests/*.test.mjs
```

The tests use real temporary Git repositories/local remotes and mocked GitHub responses. They
exercise divergent base/PR histories, artifact/configuration handoff, actual pushes and lease
failures, successful/failing reports, stale retries, ownership, and closure/merge/retargeting.
They do not mutate GitHub or execute the analyzer/ruling suite. `ruling-bot-tests.yml` runs them on
bot/workflow changes independently of the expensive Build pipeline.
