## Goal

Ensure the SonarJS PR SIT flow proves that DiffSIT reporting works end to end on this branch, then keep the branch moving autonomously until the PR is green or blocked by external state.

## Scope

This design covers two concrete pieces of work:

1. Add a temporary, easy-to-revert SonarJS rule change that produces a real SIT diff on ruling data.
2. Add a thread-scoped automation that monitors PR #7307, applies bounded fixes when needed, pushes them, and reports progress in this thread.

This design does not change the long-term SIT architecture. It uses the existing experimental branch and keeps the canary isolated so it can be reverted before merge.

## Canary Rule Choice

Use `javascript:S5759` as the SIT canary.

Why this rule:

- It has exactly one dedicated `custom-jsts` ruling hit in `its/ruling/src/test/expected/custom-jsts/javascript-S5759.json`.
- That hit comes from `its/sources/custom/jsts/S5759.js` and is not shared with other single-hit custom-jsts rule expectations.
- The rule has a normal SonarJS implementation and unit test, so the temporary behavior change can be made and reverted cleanly.

## Canary Change

Make a temporary production-rule change in `packages/analysis/src/jsts/rules/S5759/rule.ts` that suppresses the current `xfwd: true` report path.

Keep the branch coherent by updating:

- `packages/analysis/src/jsts/rules/S5759/unit.test.ts`
- `its/ruling/src/test/expected/custom-jsts/javascript-S5759.json`

Expected effect:

- Unit tests reflect the temporary behavior.
- The `custom-jsts` ruling expectation drops its single `S5759` issue.
- SIT export and DiffSIT should report one removed `javascript:S5759` issue for `custom-jsts:S5759.js`.

The canary must be isolated in its own commit so it can be reverted without touching the SIT workflow implementation.

## Verification

Before pushing the canary commit, run focused verification:

- formatting on the touched files
- `packages/analysis/src/jsts/rules/S5759/unit.test.ts`
- a direct content check that the ruling expectation matches the temporary rule behavior

If local environment constraints prevent full ruling or full plugin rebuild, keep verification focused and use CI as the authoritative end-to-end SIT/export confirmation.

## Automation

Create a heartbeat automation attached to this thread, not a detached cron job.

Heartbeat behavior:

1. Wake periodically and inspect PR #7307.
2. Read current CI check status.
3. Read unresolved review threads.
4. If the PR is blocked by branch-local issues, apply the smallest relevant fix.
5. Run focused verification for the specific fix.
6. Commit and push autonomously when verification passes.
7. Reply to and resolve GitHub review threads when the current branch already addresses them.
8. Report actions and current state back into this thread.

## Automation Boundaries

The automation may:

- edit files on `sit-exporter-experiment`
- create commits
- push commits
- post GitHub thread replies
- resolve addressed review threads

The automation must not:

- force-push
- rebase
- merge the branch
- perform unrelated refactors
- broaden scope beyond fixes needed to get SIT diff reporting and PR checks working

## Success Criteria

The work is successful when:

- the branch contains a real, intentional SIT canary diff for `S5759`
- SIT/DiffSIT reports show the canary change as a real diff
- the monitor can continue driving the branch forward without manual polling
- the canary remains easy to revert before merge

## Failure Handling

If CI failures are caused by missing credentials, missing external artifacts, GitHub outages, or unavailable upstream state, the automation should stop changing code, report the blocker here, and wait for the next heartbeat.
