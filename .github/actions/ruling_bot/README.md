# Ruling bot

The updater persists generated expectations in a fix PR before requesting an independent report.
The reporter reads the exact tree tested by ruling and runs the bot code from that same checkout.
A third action closes obsolete fixes after their original PR closes or merges.

## Configuration and reuse

SonarJS passes paths, links, snippet limits, and workflow settings explicitly in the updater action's
`with` block in `build.yml`. The producing ruling job names its results artifact with its Build
attempt and exposes that exact name as a job output. Upload, updater download, and the updater action
use the same name, including when a retry reuses outputs from an earlier attempt.

The updater forwards its resolved action inputs individually to the independent reporter workflow.
All twenty dispatch inputs fit GitHub.com's current limit of twenty-five. Explicitly forwarding
paths, links, and the artifact name preserves the producing Build's settings during independent
retries. Raw PR-event reports use the same SonarJS defaults in the reporter workflow.
The canonical configuration schema/defaults live in `config.mjs`; SonarJS settings live in
`.github/ruling-bot.config.mjs`. `provenance.mjs` owns all nine report provenance fields, their
dispatch values, input types/defaults, updater aliases, environment/caller bindings, and retry
placeholders. `generate-config.mjs` generates their marked action/workflow sections, this input
table, the CI retry command, and the local `ruling-sync` command. Run
`node .github/actions/ruling_bot/generate-config.mjs` after changing these definitions;
`--check` and the local regression suite reject stale consumers. No runtime config-loading
step or additional runtime dependency is needed. The report action validates the received parameters
before checking freshness or downloading artifacts.

Other repositories can use the updater, `report`, and `cleanup` composite actions with their own
configuration. Both result directories contain the sonar-lits `<project>/<language>-<rule>.json`
layout. Helper scripts resolve relative to the action installation; data paths resolve relative to
the tested checkout (`github.workspace`, or `repository-path` for the reporter).

Result and source paths may be relative or absolute within that checkout. Valid paths are
normalized relative to the caller's checkout before dispatch. Reporter preflight exposes the
validated absolute download destination, so artifact download and report generation also agree
when the report action receives an absolute path directly. An empty `sources-path` disables
snippets; empty link URLs disable links.

<!-- BEGIN GENERATED INPUT TABLE -->

| Input                   | Purpose                                                             | Generic default                               |
| ----------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `new-results-path`      | Generated-results path within the tested repository                 | Required                                      |
| `old-results-path`      | Expected-results path within the tested repository                  | Required                                      |
| `sources-path`          | Local source checkout used for snippets; empty disables snippets    | `its/sources`                                 |
| `sources-repo-url`      | Remote source URL used for file links; empty disables links         | Empty                                         |
| `rspec-base-url`        | RSPEC URL used for rule links; empty disables links                 | `https://sonarsource.github.io/rspec/#/rspec` |
| `max-inline-snippets`   | Maximum detailed snippets per report section                        | `10`                                          |
| `results-artifact-name` | Exact saved generated-results artifact name                         | `ruling-results`                              |
| `report-workflow`       | Reporter workflow filename or ID                                    | `ruling-diff-comment.yml`                     |
| `report-workflow-ref`   | Reporter workflow ref; empty selects the tested target branch       | Empty                                         |
| `build-workflow`        | Build workflow filename or ID used to find authoritative dispatches | `build.yml`                                   |
| `report-dispatch-step`  | Build step recording a successful ruling report request             | `Record ruling report dispatch`               |

<!-- END GENERATED INPUT TABLE -->

The first four optional reporting settings were updater inputs before #8050 split persistence from
reporting. Passing them through the independent reporter now keeps its configuration tied to the
producing caller. The artifact/workflow settings also make the handoff usable by other repositories.
`tested-commit-sha` optionally overrides `github.sha` in the updater; the reporter requires `head-sha`
explicitly.

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

Dispatch defaults to the original tested target branch. The reporter workflow checks out the exact
tested commit once for both bot code and data. Branches must contain the current reporter workflow;
rebase branches predating its introduction or input changes. `report-workflow-ref` can override the
workflow selection, while the bot code still comes from the tested commit.
Dispatch failure fails the update job visibly while leaving the persisted fix available.
Build promotion depends on the updater, so persistence or dispatch failures block promotion and
releasability. Protected-branch failure notifications also depend on the updater.
The updater's `pr-number` identifies the original PR and is empty for a branch run.
Its `tested-base-sha` is the tested PR merge's first parent and is also empty for a branch run;
the controller derives that branch run's baseline from its tested commit. The reporter's
`pr-number` instead identifies the report recipient, which is the fix PR for a `master` failure.

Report generation writes stdout directly to a temporary file. The controller reads only a
comment-sized prefix, then truncates the assembled comment safely at a UTF-8 boundary. Reports
larger than the subprocess capture limit can therefore still produce a comment. Temporary report
files are removed after success, stale skips, or generation failure; the generator still needs
enough memory and disk space to render the complete report.

Report retries require a tested commit containing the current reporter action and input contract.
For Builds predating their introduction, rebase the original PR branch and rerun ruling; supplying
an old artifact name cannot add the missing bot code to that tested commit.
For a supported Build, the simplest retry is `gh run rerun <report-run-id>`; this retains the
original dispatch inputs.
To dispatch again, supply the same tested SHAs, originating
Build run ID and its current attempt, fix URL, and configuration. Preserve the producing ruling
job's artifact name separately: rerunning only the updater can make the current Build attempt `2`
while the saved artifact remains `actual_js_ts-1`. See [the CI guide](../../../docs/CI.md#js_ts_ruling)
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
same original PR or branch and head/event. Checks repeat before writes. This covers advancing heads,
different merges for the same PR head, delayed dispatches, stale successful cleanup, and old attempts
of a retried Build.
Raw PR-event reports carry no completed Build identity and cannot overwrite a completed report for
the same PR head, even across different tested merges. The updater exposes `report-requested` only
after a successful dispatch. The Build caller then
runs the configured `report-dispatch-step`; raw reporters query successful steps across Build
attempts for the same original PR head in `build-workflow`. This preserves authority after an
empty report deletes its comment. Legacy Builds without that step, failed/skipped dispatches,
and Builds for another PR/head do not suppress raw reports. Other callers should record the
output in the same way as SonarJS. Raw reports can still refresh reports from an earlier head.
Passing Build retries dispatch again, replacing stale failure notices even
when no push triggered a new PR event; an empty successful report clears the obsolete comment.

Fix pushes and deletions use an explicit SHA lease, including the empty lease when creating a new
branch. A concurrent update causes a visible failure rather than overwriting/deleting another
commit. An existing fix branch must belong to this target; an orphan from failed PR creation is
recoverable through the identity in its bot commit. Leftover legacy branches are also recoverable
when their tip has the exact old generated message, with or without `🤖` before its generated footer,
and both author and committer match the bot's
name and email, and no other open PR uses that branch. New PR fixes use
`fix/update-ruling-for-pr-<number>` to keep two original PRs on the same source branch independent.
Existing target-owned fixes and recoverable legacy branches remain supported. Default-branch fix
names retain `fix/update-ruling-for-<branch>`. Unrelated dirty tracked build output is discarded when
creating the fix branch, while expectation changes are retained through the stash.

An existing fix is revalidated before its branch is pushed, before its body is updated, and before
its link is recorded or dispatched. It must still be open and unmerged, owned by the original
target, on the selected base/branch, and at the expected commit. Newly created fixes receive the
same final check. If a fix closes or changes during preparation, the updater fails visibly without
publishing it. If it changes during/after a push or body update, already persisted results remain,
but the updater fails without dispatching or advertising the invalid fix. Both PR and `master`
runs use these checks. A retry follows the normal owned-fix selection flow.

The fix branch starts from the exact tested commit, including the tested base history. Stash
restoration therefore uses the same expectation tree that produced the changes, including files
added only on the base. The generated commit changes only expectations. The fix PR also exposes
base changes absent from its original branch. For a PR behind its tested base, incorporate that
base before merging the fix: squash/rebase merges do not preserve the fix branch's base ancestry
and can leave independently added expectation files in conflict with the target branch. Updating
the original branch can trigger ruling again and refresh the fix. Generated fix PRs explain this.

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

When ruling passes, the same guarded cleanup removes obsolete fixes. Successful and raw PR-event
reports with no issue changes clear an existing report comment, preserving the policy introduced
by #8050. Reports describe expectation changes without claiming that the receiving PR passed ruling.
A failed original-PR run with no net issue changes retains its failure notice and any required fix
link: generated expectations may equal the tested base while the PR's committed expectations are
wrong. Default-branch reports describe the generated changes on the fix PR without asking that fix
PR to update its own expectations.
Only bot-authored report comments are updated. Large comments retain the existing UTF-8-safe limit.

## Regression tests

```sh
node --test .github/actions/ruling_bot/tests/*.test.mjs
```

The tests use real temporary Git repositories/local remotes and mocked GitHub responses. They
exercise divergent base/PR histories, artifact/configuration handoff, actual pushes and lease
failures, successful/failing reports, stale retries, ownership, and closure/merge/retargeting.
They do not mutate GitHub or execute the analyzer/ruling suite. Run them locally when changing the
bot; they are not scheduled by CI.

## Historical guarantees

The final review follows merged implementations and their PR discussions, including corrections
made after the initial review. Later accepted changes supersede earlier behavior; the regression
suite preserves the resulting contracts, rather than restoring every historical feature:

| History                                                                                                                                                                                                                                    | Guarantee                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [#6123](https://github.com/SonarSource/SonarJS/pull/6123), [#6157](https://github.com/SonarSource/SonarJS/pull/6157)                                                                                                                       | Automatic updates, reusable bot comments, and complete PR changes                                                             |
| [#6363](https://github.com/SonarSource/SonarJS/pull/6363), [#6436](https://github.com/SonarSource/SonarJS/pull/6436)                                                                                                                       | Source/RSPEC links, CSS/custom and TSX snippets, independent section limits, collapsed full report, and UTF-8-safe truncation |
| [#6466](https://github.com/SonarSource/SonarJS/pull/6466), [#6883](https://github.com/SonarSource/SonarJS/pull/6883)                                                                                                                       | Persist fixes in PRs, reuse existing fixes, keep ruling failures visible, and support default-branch runs                     |
| [#6580](https://github.com/SonarSource/SonarJS/pull/6580), [#6619](https://github.com/SonarSource/SonarJS/pull/6619), [#7520](https://github.com/SonarSource/SonarJS/pull/7520), [#7869](https://github.com/SonarSource/SonarJS/pull/7869) | Compare the exact tested synthetic merge with its first parent; report passing changes without requiring a fix                |
| [#7508](https://github.com/SonarSource/SonarJS/pull/7508), [#7627](https://github.com/SonarSource/SonarJS/pull/7627)                                                                                                                       | Reusable inputs and local sync command; recover a dirty checkout without losing generated expectation changes                 |
| [#7924](https://github.com/SonarSource/SonarJS/pull/7924), [#7922](https://github.com/SonarSource/SonarJS/pull/7922)                                                                                                                       | Flat expectation layout; include untracked additions, deletions, and both sides of committed renames                          |
| [#8050](https://github.com/SonarSource/SonarJS/pull/8050)                                                                                                                                                                                  | Persist results before independent reporting; preserve the final corrected tested-tree baseline and artifact provenance       |

Explicit supersessions also matter:

- #6253 introduced no-change confirmations, which #7508 retained. #8050 then replaced empty reports
  with comment deletion and documented that policy. Empty successful/raw reports remain silent.
- #7520 added a passing notice to the Build-owned report. #8050 moved reporting to PR events and
  independent dispatches and removed that notice. Committed changes are still reported without it;
  the updater now refreshes that report after a successful retry to clear an earlier failure.
- #6580/#6619's base-selection approach evolved through #7520 to #7869's exact tested merge first
  parent. #8050's initially proposed fix-versus-head comparison was corrected before merge.
- #6442's README maintenance moved to nightly in #6857; it remains outside the ruling bot.
  #6363's gist draft and #7565's unmerged shared-action experiment do not define retained features.
- #7922's final flat expectation layout supersedes the alternative layout described in its PR body.
- #6123's generated-commit message guard belonged to the direct-push flow. It is removed: passing
  ruling creates no fix, and a failing run can need new expectations even after a generated commit.
  Fixes use separate owned branches/PRs, and their `GITHUB_TOKEN` events do not trigger another Build.
