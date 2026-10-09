# Ruling bot

The updater persists generated expectations in a fix PR before requesting an independent report.
The reporter reads the exact tree tested by ruling and runs the bot code from that same checkout.
A third action closes obsolete fixes after their original PR closes or merges.

## Maintainer contract

This README is the canonical behavior and design contract for the ruling bot. Read it before
changing the controller, helpers, action metadata, or calling workflows. The
same entry point applies to coding agents working on those consumers. The
[CI guide](../../../docs/CI.md#js_ts_ruling) owns operator instructions and retry commands;
it links here for policy. Historical PR descriptions and reviews explain why a contract exists,
but intermediate proposals do not override the final accepted behavior recorded here.

A future PR must preserve these contracts or explicitly document a deliberate change, its reason,
the affected scenarios, and the replacement behavior. Update the relevant regression tests and
the [historical guarantees](#historical-guarantees) in that same PR. A resolved review thread alone
is not evidence that the implementation satisfies its contract.

| Trigger                                                                     | Required outcome                                                                                                                                     | Detail                                                                  |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| PR ruling fails and saved results change expectations                       | Persist an owned fix, then request a report on the original PR with its fix link. Keep the ruling failure visible.                                   | [Tested baseline and retries](#tested-baseline-and-independent-retries) |
| PR ruling passes                                                            | Close obsolete owned fixes and request a report of committed expectation changes, including on a retry without a new push.                           | [Freshness and coordination](#freshness-and-mutation-coordination)      |
| A fresh successful/raw report has no issue changes                          | Delete the obsolete bot report. A failed PR with zero net changes relative to the base still retains its failure notice and required fix link.       | [Report and cleanup policy](#closing-and-merging-the-original-pr)       |
| Default-branch ruling fails/passes                                          | On failure, persist a fix against that branch and report on the fix PR. On success, close obsolete owned fixes.                                      | [Tested baseline and retries](#tested-baseline-and-independent-retries) |
| Ruling never ran, or failed results were not saved                          | The Build caller skips the updater; the original failure remains visible. Raw PR reports can still describe committed expectation changes.           | [Configuration and reuse](#configuration-and-reuse)                     |
| Failed ruling has saved results but synchronization changes no expectations | Fail the updater visibly; do not manufacture a fix or dispatch a successful-looking replacement report.                                              | [Scenario coverage](#scenario-coverage-and-known-limits)                |
| Original PR closes or merges                                                | Close remaining open owned fixes by original identity, including retargeted legacy fixes. A reopened original makes delayed cleanup skip.            | [Lifecycle cleanup](#closing-and-merging-the-original-pr)               |
| Work is stale, evidence is invalid, or persistence/reporting fails          | Stale work skips mutations; invalid evidence and operational failures fail visibly. A dispatch failure leaves the persisted fix available for retry. | [Scenario coverage](#scenario-coverage-and-known-limits)                |

The updater follows the ruling step outcome and successful result persistence, rather than the
overall Build result. A passing ruling step can refresh its report even if another Build step
fails; the report does not claim that the receiving PR or entire Build passed. Persistence and
dispatch failures must remain dependencies of promotion and failure notification. The raw
reporter skips fork and Dependabot PR events; closed-event cleanup accepts only same-repository
originals. Each phase's permissions are documented under configuration and reuse.

## Configuration and reuse

SonarJS passes paths, links, snippet limits, and workflow settings explicitly in the updater action's
`with` block in `build.yml`. The producing ruling job names its results artifact with its Build
attempt and exposes that exact name as a job output. Upload, updater download, and the updater action
use the same name, including when a retry reuses outputs from an earlier attempt.

The updater forwards its resolved action inputs individually to the independent reporter workflow.
Workflow-contract tests check the accepted dispatch fields and GitHub.com's input limit. Explicitly forwarding
paths, links, and the artifact name preserves the producing Build's settings during independent
retries. Raw PR-event reports use the same SonarJS defaults in the reporter workflow.
The canonical configuration schema/defaults live in `config.mjs`; SonarJS settings live in
`.github/ruling-bot.config.mjs`. `provenance.mjs` owns the report provenance fields, their
dispatch values, input types/defaults, updater aliases, environment/caller bindings, and retry
placeholders. `generate-config.mjs` generates their marked action/workflow sections, this input
table, the CI retry command, and the local `ruling-sync` command. Run
`node .github/actions/ruling_bot/generate-config.mjs` after changing these definitions;
`--check` and the local regression suite reject stale consumers. No runtime config-loading
step or additional runtime dependency is needed. The report action validates the received parameters
before checking freshness or downloading artifacts.

### Ownership and duplication rules

| Definition                                                                        | Canonical owner                                                                  | Consumers                                                                   |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Public configuration names, descriptions, required inputs, and generic defaults   | [config.mjs](config.mjs)                                                         | Runtime validation, helpers, and generated contracts                        |
| SonarJS paths, link settings, artifact prefix, and workflow settings              | [ruling-bot.config.mjs](../../ruling-bot.config.mjs)                             | Generated Build/report callers and operator examples                        |
| Report provenance names, values, types, aliases, bindings, and retry placeholders | [provenance.mjs](provenance.mjs)                                                 | Dispatch, generated action/workflow contracts, and retry command            |
| Checked-in generated sections and local synchronization command                   | [generate-config.mjs](generate-config.mjs)                                       | Marked YAML/Markdown sections and `package.json`                            |
| Freshness, ownership, bot identity, leases, and lifecycle decisions               | [bot.mjs](bot.mjs)                                                               | Updater, reporter, and cleanup; shell launchers delegate to this controller |
| Expectation mirroring and report rendering                                        | [sync-results.mjs](sync-results.mjs), [generate-report.mjs](generate-report.mjs) | Bot actions and local synchronization/reporting                             |

Edit definitions at their owner and regenerate consumers; do not hand-edit marked generated
sections or add a second configuration-loading path. Caller-specific defaults belong in the
caller configuration, not in generic helpers. Add a shared runtime rule to its existing controller
or helper so independent actions and local commands agree. If a new consumer must repeat data,
identify its owner and generation/synchronization mechanism in the PR. Avoid separate manually
maintained option lists, paths, artifact names, provenance mappings, and copied behavior policies.
Tests may use explicit fixture values to check compatibility; production consumers must use the
canonical definition. The generated input table below owns the published default values.

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

Source paths, source/RSPEC links, and snippet limits were updater inputs before #8050 split persistence from
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
After querying Build history, the reporter rereads the receiving PR. For original-PR reports,
it must still be open and at the tested head before a comment is replaced or deleted. For
default-branch reports, the recipient is a separate fix PR: it must remain open, but its fix commit
is not the tested default-branch head.

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
commit. An existing fix branch must belong to this target. An orphan from failed PR creation is
recoverable through the original-target marker in its tip commit, or the exact old generated
message, with or without `🤖` before its generated footer. Both forms require the tip's author
and committer to match the bot's name and email, and no other open PR may use the branch.
A human commit retaining the target marker is therefore protected from orphan recovery.
New PR fixes use
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

## Merge commits and branch ancestry

For a PR, distinguish four commits even when some expectation trees happen to be equal:

```text
B = exact tested base       H = original PR head
          \                 /
           M = tested merge
           |
           F = generated fix

M^1 = B, M^2 = H; F's parent is M. The fix PR targets H's branch.
```

Passing reports compare `B` with committed expectations in `M`; failing reports compare `B` with
saved generated expectations applied to `M`. The fix commit `F` persists those changes but does
not become the report baseline or the freshness identity. The originating Build API identifies
`H`, while checkout/report inputs identify `M`. Depth two retains `M` and both immediate parents;
it does not promise enough history for a general merge-base traversal.

Review a branch behind its base, base-only expectation additions/modifications, independent
additions on both branches, a base advancing after testing, and merge commits inside either
parent's history. Also review two synthetic merges with the same `H` and different first parents:
their baseline comes from their own tested merge, while Build report authority is scoped to the
original PR head. Two originals sharing `H` or a source branch remain different targets.

Incorporating `B` before squash/rebase-merging `F` is part of the fix's documented usage; otherwise
those merge methods can discard the ancestry needed for base-only files. Incorporating the base
may start another Build and supersede the old fix. Closing/merging the original can delete its
branch and cause GitHub to retarget remaining fixes, so cleanup uses original identity.
For a default-branch run there is no synthetic PR merge: the tested branch commit is both the
baseline and freshness head, and the report recipient's fix commit is a separate identity.

## Scenario coverage and known limits

Use this map when reviewing changes. The named test files under [tests](tests) contain the
executable scenarios; their assertions, not a fixed test count, define regression coverage.
This table is a review checklist, not a claim of transactional guarantees across GitHub APIs.

| Scenario to consider                                                                                           | Expected safeguard or limit                                                                                                                                                           | Regression coverage                                                                                                  |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Wrong checkout, wrong merge parent, missing baseline, or divergent base/PR history                             | Validate the exact tested tree and parents before mutations; use its first parent even when the base moves.                                                                           | [bot.test.mjs](tests/bot.test.mjs): tested-tree validation, outdated PR, moving master, depth-two checkout           |
| PR head changes during generation or the final Build-history query                                             | Preserve the existing comment, including before deletion; the final recipient response must still match the tested head.                                                              | `bot.test.mjs`: advancing-head preflight, generation, deletion/replacement races                                     |
| Older Build, newer attempt, delayed dispatch, or newer Build at the same head                                  | Check original target, head, event, run ID, and current attempt. Other PRs/branches at that head do not supersede this target.                                                        | `bot.test.mjs`: stale runs/attempts and same-head/different-target cases                                             |
| Raw PR report arrives before/after a Build report, including after an empty report                             | Preserve Build authority for this original head through provenance and successful dispatch records across attempts. Failed/skipped/missing records do not establish authority.        | `bot.test.mjs`: older/newer raw merges, empty-report authority, legacy/failed/other-target evidence                  |
| Updater-only retry or unavailable artifact/tested commit                                                       | Keep producing-job artifact identity distinct from current Build attempt; unavailable evidence requires rerunning ruling.                                                             | `bot.test.mjs`, [workflows.test.mjs](tests/workflows.test.mjs): retries, dispatch contract, missing results          |
| Fix closes/merges or changes owner/base/head/repository during preparation, push, body update, or final checks | Stop publishing/advertising an invalid fix; retain results already persisted. Newly created fixes get the final validation too.                                                       | `bot.test.mjs`: PR/default-branch lifecycle-stage and selected-fix changes                                           |
| Another writer changes a fix ref during push/deletion, or creates a proposed new ref                           | Explicit expected-SHA leases, including an empty lease for branch creation, reject overwrites/deletions of changed refs.                                                              | `bot.test.mjs`: actual push/delete lease failures                                                                    |
| Original closes, merges, reopens, or its fix is retargeted                                                     | Trusted default-branch cleanup checks current original state and managed-fix identity; skip reopened originals and already merged fixes.                                              | `bot.test.mjs`: retargeting, reopening, closure/merge races                                                          |
| Shared source/fix branch, foreign target marker, human PR/comment, or human-modified orphan                    | Separate original-target identities; preserve shared branches; orphan tips require bot author and committer as well as ownership evidence.                                            | `bot.test.mjs`: shared originals/branches, legacy/modern recovery, all identity mismatches                           |
| Default-branch report recipient closes or has a head different from the tested branch                          | Check the fix recipient is open without comparing its fix head with the tested default-branch head.                                                                                   | `bot.test.mjs`: open/closed fix-recipient cases                                                                      |
| Generated build output is dirty; expectations include added, deleted, renamed, or base-only files              | Stash expectation changes separately and start the fix from the tested tree; mirror the final flat layout.                                                                            | `bot.test.mjs`, [report-renames.test.mjs](tests/report-renames.test.mjs)                                             |
| Saved results differ from branch expectations but equal the base, or head is a generated commit                | Keep failed PR fix requirements visible. Generated commit messages do not suppress valid failing updates; passing runs create no fix.                                                 | `bot.test.mjs`: zero-net-change and generated-head cases                                                             |
| Custom paths, empty snippet/link settings, rich CSS/TSX reports, or very large Unicode output                  | Validate/normalize inputs before artifacts/sync, retain display opt-outs, and use file-backed generation with UTF-8-safe comment truncation. Full generation still needs memory/disk. | [config.test.mjs](tests/config.test.mjs), [report-features.test.mjs](tests/report-features.test.mjs), `bot.test.mjs` |
| Schema/caller changes or another PR edits Build dependencies                                                   | Regenerate every consumer and preserve updater failure coverage for promotion, releasability, and protected-branch notification.                                                      | `workflows.test.mjs`: generation drift, dispatched fields/values, dependency coverage                                |

External state can change after the final check, and an open-PR listing is a snapshot: ownership,
shared-branch, and reopening decisions cannot be atomic with ref writes or comment updates.
Queues serialize participating bot jobs, not humans or unrelated workflows; SHA leases only guard
the selected Git ref. Report dispatch success is recorded independently of report completion.
Missing artifacts, unavailable commits, insufficient report-generation resources, and finite queue
capacity remain operational limits. Closed-event cleanup applies after its workflow reaches the
default branch; it does not retroactively receive closure events from before deployment.
Current branch/workflow compatibility and squash/rebase requirements are documented above, rather
than silently substituting another bot version, tested tree, or merge baseline.

## Regression tests

```sh
node --test .github/actions/ruling_bot/tests/*.test.mjs
```

The tests use real temporary Git repositories/local remotes and mocked GitHub responses. They
exercise divergent base/PR histories, artifact/configuration handoff, actual pushes and lease
failures, successful/failing reports, stale retries, ownership, and closure/merge/retargeting.
They do not mutate GitHub or execute the analyzer/ruling suite. Run them locally when changing the
bot; they are not scheduled by CI.

### Checklist for every ruling-bot PR

1. Read the contract and history; identify affected outcomes, identities, merge trees, and race
   scenarios. Record any deliberate behavior change and its replacement instead of silently
   removing functionality during cleanup.
2. Update canonical definitions and regenerate their consumers. Keep this README as the behavior
   owner and the CI guide as the operator/retry guide; link between them rather than copying policy.
3. Add or adjust a regression scenario for changed behavior, including the relevant failure/stale
   path. Preserve existing coverage; document an intentional supersession when replacing a test.
4. For behavior or configuration changes, run the full local suite above,
   `node .github/actions/ruling_bot/generate-config.mjs --check`,
   formatting for changed files, and `git diff --check`. The suite is opt-in: a green Build alone
   does not establish that these regression tests ran. Documentation-only changes need link,
   formatting and generation checks; keep transient CI status and test counts in the PR.
5. Review workflow permissions, dispatch inputs, artifact/output handoff, shared queues, and
   downstream dependency lists when those surfaces change. Recheck them after rebasing or resolving
   another PR's workflow changes. [#8108](https://github.com/SonarSource/SonarJS/pull/8108)'s
   build-number rework and [#8118](https://github.com/SonarSource/SonarJS/pull/8118)'s updater
   dependencies illustrate why both changes must survive reconciliation.
6. Update the history with the PR link, rationale, retained/superseded contract, and relevant
   scenario coverage. Record validation on the final reviewed commit and distinguish local tests,
   live workflow results, and accepted operational limits.

## Historical guarantees

The final review follows merged implementations and their PR discussions, including corrections
made after the initial review. Later accepted changes supersede earlier behavior; the regression
suite preserves the resulting contracts, rather than restoring every historical feature:

| History                                                                                                                                                                                                                                    | Guarantee                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| [#6123](https://github.com/SonarSource/SonarJS/pull/6123), [#6157](https://github.com/SonarSource/SonarJS/pull/6157)                                                                                                                       | Automatic updates, reusable bot comments, and complete PR changes                                                                   |
| [#6363](https://github.com/SonarSource/SonarJS/pull/6363), [#6436](https://github.com/SonarSource/SonarJS/pull/6436)                                                                                                                       | Source/RSPEC links, CSS/custom and TSX snippets, independent section limits, collapsed full report, and UTF-8-safe truncation       |
| [#6313](https://github.com/SonarSource/SonarJS/pull/6313)                                                                                                                                                                                  | Sync failing results before reporting their changes; this workflow fix was included in an analyzer PR                               |
| [#6466](https://github.com/SonarSource/SonarJS/pull/6466), [#6504](https://github.com/SonarSource/SonarJS/pull/6504), [#6883](https://github.com/SonarSource/SonarJS/pull/6883)                                                            | Persist fixes in PRs, reuse existing fixes, keep ruling failures visible, leave merged fixes alone, and support default-branch runs |
| [#6580](https://github.com/SonarSource/SonarJS/pull/6580), [#6619](https://github.com/SonarSource/SonarJS/pull/6619), [#7520](https://github.com/SonarSource/SonarJS/pull/7520), [#7869](https://github.com/SonarSource/SonarJS/pull/7869) | Compare the exact tested synthetic merge with its first parent; report passing changes without requiring a fix                      |
| [#7508](https://github.com/SonarSource/SonarJS/pull/7508), [#7627](https://github.com/SonarSource/SonarJS/pull/7627)                                                                                                                       | Reusable inputs and local sync command; recover a dirty checkout without losing generated expectation changes                       |
| [#7924](https://github.com/SonarSource/SonarJS/pull/7924), [#7922](https://github.com/SonarSource/SonarJS/pull/7922)                                                                                                                       | Flat expectation layout; include untracked additions, deletions, and both sides of committed renames                                |
| [#8050](https://github.com/SonarSource/SonarJS/pull/8050)                                                                                                                                                                                  | Persist results before independent reporting; preserve the final corrected tested-tree baseline and artifact provenance             |
| [#8051](https://github.com/SonarSource/SonarJS/pull/8051), [#8118](https://github.com/SonarSource/SonarJS/pull/8118)                                                                                                                       | Preserve updater failure coverage in promotion/notifications after execution and persistence become separate jobs                   |

The follow-up in [#8118](https://github.com/SonarSource/SonarJS/pull/8118) establishes the current
freshness, lifecycle, reporting, and configuration contracts described above. Its decisions cover
passing-retry refresh, authority after empty reports, exact producing-artifact identity, independent
original-target fix ownership, trusted close/merge cleanup, legacy and modern orphan recovery,
fix revalidation, tested-merge fix ancestry, matching tested bot code, generated input contracts,
and file-backed large reports. The final freshness response must include the tested original head;
modern orphan recovery must verify bot author and committer, not just a retained target marker.
Those two review corrections are recorded in
[commit 6e7d773f1](https://github.com/SonarSource/SonarJS/commit/6e7d773f1e9b685f9178b907a79b591dd815db2b).

The [tested-baseline discussion](https://github.com/SonarSource/SonarJS/pull/8050#issuecomment-5911107839)
and [freshness/configuration follow-ups](https://github.com/SonarSource/SonarJS/pull/8050#issuecomment-5912725642)
explain the requirements that #8118 carries forward. The
[stale-dispatch review](https://github.com/SonarSource/SonarJS/pull/8050#discussion_r4145977058)
motivates preserving pending reports and separating tested commits in workflow concurrency groups.
The [notification dependency review](https://github.com/SonarSource/SonarJS/pull/8051#discussion_r4144276258)
and [#8108 integration review](https://github.com/SonarSource/SonarJS/pull/8118#discussion_r4230333405)
show why updater failures must retain downstream coverage through unrelated workflow changes.
Reporter dispatch from the original branch
requires that branch to contain the current workflow contract; this compatibility decision and
the tested-base incorporation required for squash/rebase merges remain explicit operational
constraints. Future changes must update these decisions and their scenario coverage together.

Explicit supersessions also matter:

- #6253 introduced no-change confirmations, which #7508 retained. #8050 then replaced empty reports
  with comment deletion and documented that policy. Empty successful/raw reports remain silent.
- #7520 added a passing notice to the Build-owned report. #8050 moved reporting to PR events and
  independent dispatches and removed that notice. Committed changes are still reported without it;
  the updater now refreshes that report after a successful retry to clear an earlier failure.
- #6580/#6619's base-selection approach evolved through #7520 to #7869's exact tested merge first
  parent. #8050's initially proposed fix-versus-head comparison was corrected before merge.
- [#6442](https://github.com/SonarSource/SonarJS/pull/6442)'s README maintenance moved to nightly in
  [#6857](https://github.com/SonarSource/SonarJS/pull/6857); it remains outside the ruling bot.
  #6363's gist draft and [#7565](https://github.com/SonarSource/SonarJS/pull/7565)'s unmerged
  shared-action experiment do not define retained features.
- #7922's final flat expectation layout supersedes the alternative layout described in its PR body.
- #6123's generated-commit message guard belonged to the direct-push flow. It is removed: passing
  ruling creates no fix, and a failing run can need new expectations even after a generated commit.
  Fixes use separate owned branches/PRs, and their `GITHUB_TOKEN` events do not trigger another Build.
