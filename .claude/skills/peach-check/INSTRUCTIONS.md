# Peach Main Analysis Check

Canonical instructions for the `peach-check` skill live in this file.

Use this skill when the user asks to check the latest Peach run, triage Peach Main Analysis
failures, or decide whether Peach blocks a SonarJS release.

## Overview

- Repository under analysis: `SonarSource/peachee-js`
- Workflow file: `main-analysis.yml`
- Branch: `js-ts-css-html`
- Classification guide: `docs/peach-main-analysis.md`
- Canonical issue-history helper: `.claude/skills/peach-check/peach-issue-history.js`

This skill fetches the target run, collects failed jobs, runs an analysis-consistency check across
successful project scans to verify that the current Peach state is materially consistent with
recent history, classifies the findings with the guide, and prints a summary focused on SonarJS
ownership.

## Prerequisites

- Run from the SonarJS repository.
- Verify GitHub auth first with `gh auth status`.
- Ensure the current GitHub identity can access `SonarSource/peachee-js`.
- Ensure `PEACH_KEY` and `PEACHEE_ROOT` are set, and that `PEACHEE_ROOT` points to a local
  `peachee-js` checkout.
- Parallelize independent job triage work when the runtime permits it, but do not chain shell commands.

## Command Discipline

- Never chain commands with `&&`, `;`, or `|`.
- Keep each shell command standalone so permission prompts and failures stay attributable.
- Parallel execution is fine when calls are independent.
- Put labels in prose, not in shell wrappers such as `echo "===" && ...`.

## Invocation

`/peach-check [run-id]`

- Without `run-id`: analyze the latest completed run.
- With `run-id`: analyze that specific run.

## Workflow

### 1. Resolve the run

If a run id was provided, use it directly.

Otherwise fetch the latest completed run of `main-analysis.yml` on `js-ts-css-html`:

```bash
gh run list \
  --repo SonarSource/peachee-js \
  --workflow main-analysis.yml \
  --branch js-ts-css-html \
  --limit 5 \
  --json databaseId,conclusion,createdAt,status \
  --jq '[.[] | select(.status == "completed")] | first | {databaseId, conclusion, createdAt}'
```

Record:

- `RUN_ID`
- run timestamp
- overall conclusion

If the chosen run has `conclusion == "cancelled"`, stop and report that the run is incomplete and
not usable for release triage. Recommend a rerun and do not classify jobs from that run.

### 2. Collect project jobs

Use the helper script to fetch the Peach run jobs and materialize the working sets consumed by the
rest of the workflow:

```bash
node .claude/skills/peach-check/peach-run-jobs.js RUN_ID target
```

The script calls `gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100"`
from Node.js, falls back to explicit `?page=N` fetches if the paginated response comes back short,
and writes these files:

- `target/jobs-merged.json`
- `target/analyzed-jobs.json`
- `target/exclusion-counts.json`
- `target/failed-jobs.json`
- `target/project-jobs.json`

`target/jobs-merged.json` includes `expected_total`, `total_jobs`, `failed_jobs`, and
`counts_match`. If the script still cannot reconcile `expected_total` with `total_jobs` after the
explicit page fallback, it exits non-zero. Stop there and report the mismatch instead of
classifying partial data.

`target/analyzed-jobs.json` excludes workflow-only jobs such as `prepare-project-matrix` and
`diff-validation-aggregated`.

`target/exclusion-counts.json` records:

- `excluded_workflow_jobs`
- `excluded_project_jobs`

If you intentionally exclude any real project scans beyond those two workflow jobs, replace
`excluded_project_jobs: 0` with the count from that additional exclusion filter and mention why.

For excluded jobs:

- do not count them as analyzed failures
- do not classify them
- do not emit them as findings
- mention them at most once as excluded-by-design context
- record `excluded_workflow_jobs` for excluded non-project workflow jobs such as
  `prepare-project-matrix` and `diff-validation-aggregated`
- record `excluded_project_jobs` separately so the summary makes it explicit how many actual
  project scans were excluded; this is normally `0` unless you intentionally exclude a real project scan

Use `target/failed-jobs.json` for failure triage and `target/project-jobs.json` for the
analysis-consistency check.

For each remaining failed job, record:

- job id
- job name
- completion time
- job URL
- `failing_step_name`
- `owning_phase` as `pre-scan`, `analyze`, or `post-scan`

If job metadata is incomplete, fetch the job directly:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID"
```

When multiple steps are failed, use the earliest failed step that actually ran as the owner.
Treat later cleanup or report failures as downstream noise unless they are the only failed steps.

If the failing step name contains `Diff Val` or `diff-val`, classify the job immediately as
`IGNORE`. These monitoring failures are not SonarJS release blockers.

### 3. Run the analysis-consistency check

Before any early-safe exit, use the canonical repo-local helper script to verify that each
successful project both:

- produced a fresh Peach analysis during this run window
- looks materially consistent with recent history, so a green GitHub job does not hide a
  suspicious downward shift in the analyzed state

The helper uses recent SonarQube history as the baseline:

```bash
node .claude/skills/peach-check/peach-issue-history.js \
  target/project-jobs.json \
  "${PEACHEE_ROOT}" \
  target/peach-issue-history.json
```

The helper script reads:

- `PEACH_KEY` for Peach authentication
- `PEACH_ISSUE_DROP_THRESHOLD_PCT` with default `5`
- `PEACH_ISSUE_DROP_MIN_ABS` with default `20`
- `PEACH_ISSUE_HISTORY_CONCURRENCY` with default `8`

Do not call `mc peach issue-history` from this skill anymore.

Interpret the helper statuses like this:

- `OK` → the project has a fresh analysis in the run window and its current metric is materially
  consistent with the recent baseline
- `DROP` → record one `NEEDS-MANUAL-REVIEW` finding per flagged project; describe it as a
  suspicious downward variation versus recent history
- `INSUFFICIENT_HISTORY` → mention only in the summary; there is not enough baseline to judge
  consistency, but this alone does not block a `SAFE` verdict
- `STALE` → treat as `NEEDS-MANUAL-REVIEW`; describe it as "no fresh Peach analysis observed
  during this run window", not just `STALE`
- `UNRESOLVED_PROJECT` for excluded workflow jobs such as `prepare-project-matrix` → ignore it
- other `UNRESOLVED_PROJECT` rows → treat as `NEEDS-MANUAL-REVIEW`; describe them as "could not
  match successful job to Peach project", so the consistency check is incomplete
- `ERROR` → treat as `NEEDS-MANUAL-REVIEW`; describe it as "analysis-consistency check failed for
  this project"

Use this query to isolate the history rows that block the clean early exit:

```bash
jq '
  [.rows[] | select(
    .status != "OK" and
    .status != "INSUFFICIENT_HISTORY" and
    (
      .status != "UNRESOLVED_PROJECT" or
      (
        .source_job_name != "prepare-project-matrix" and
        .source_job_name != "diff-validation-aggregated"
      )
    )
  )]
' target/peach-issue-history.json
```

Each `DROP` finding should include:

- SonarQube project key
- latest analysis date
- current metric value
- baseline value
- absolute drop
- percentage drop

Treat `threshold-abs` as a small-project noise floor, not an alternative trigger. Flag `DROP`
only when the measured drop clears both gates:

- `drop_abs >= threshold-abs`
- `drop_pct >= threshold_pct`

Equivalent single-condition restatement after converting the percentage gate into absolute units:

- `drop_abs >= max(threshold-abs, baseline * threshold_pct / 100)`

That `max(...)` form is the same two-gate rule above, not an OR trigger.

### 4. Early exit if no failures and the analysis state looks consistent

This is the normal green path. If `target/failed-jobs.json` reports `0` failed jobs and the
problematic-history query above returns `[]`, stop here: Sections 5 through 9 do not apply.
Report the run as safe, include the exclusion counts plus the consistency summary, and stop.

If any project is `DROP`, `STALE`, non-excluded `UNRESOLVED_PROJECT`, or `ERROR`, do not call the
run safe even if the GitHub workflow has no failed project jobs.

If one or more failed jobs remain after exclusions, continue to Section 5.

### 5. Read the classification guide

Read `docs/peach-main-analysis.md` once before classifying the jobs that made it past the early
exit. Use the guide's flowchart and failure categories as the source of truth.

### 6. Watch for mass failure

If at least 80% of analyzed jobs failed after exclusions, treat it as a probable shared root cause.
Do not fully triage every job first.

Instead:

1. Sample five representative jobs across the run.
2. Run Phase 2 classification on those samples.
3. If any sampled job is `CRITICAL`, the mass verdict is `CRITICAL`.
4. Otherwise apply the shared verdict to the whole event.
5. In the summary, note the mass event and cite only the sampled jobs as evidence.

Mass-failure verdict rules, in this order:

- `CRITICAL` if the shared stack trace originates in `org.sonar.plugins.javascript`
- `IGNORE` if the shared error is a Peach infrastructure failure with no SonarJS involvement
- `NEEDS-MANUAL-REVIEW` otherwise

### 7. Triage logs in phases

Only download logs for jobs that still need log-based classification.

If any failed jobs remain after the early-exit check, create the output directory:

```bash
mkdir -p target/peach-logs
```

#### Phase 1 — Download log and filter failure signals

Download the log to disk:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs" > target/peach-logs/JOB_ID.log
```

Then filter for high-signal markers:

```bash
sed --sandbox -n '
/\[36;1m/b
/Process completed with exit code/p
/EXECUTION FAILURE/p
/OutOfMemoryError/p
/502 Bad Gateway/p
/503 Service Unavailable/p
/Diff Val/p
/diff-val/p
/Fail to download plugin \[javascript\]/p
/api\/v2\/analysis\/engine/p
/Artifact has expired/p
/All 3 attempts failed/p
/ERR_PNPM/p
/ERESOLVE/p
/ETARGET/p
/notarget/p
/Invalid value of sonar/p
/does not exist for/p
/SocketTimeoutException/p
/ReportPublisher\.upload/p
' target/peach-logs/JOB_ID.log
```

Important rules:

- Do not trust the first `Process completed with exit code ...` line by default.
- Nested commands can emit intermediate failures that the workflow later survives.
- Trust step metadata first, then use the final failing log section to determine ownership.
- If Phase 1 shows scanner exit code 3 with `EXECUTION FAILURE`, continue to Phase 2. Phase 1
  alone cannot rule SonarJS in or out.

Many jobs can be classified immediately from Phase 1:

- project misconfiguration
- dependency install failure
- Peach unavailable
- artifact expired
- clone or checkout failures
- other pre-scan network failures

If checkout shows repository access loss, call that out explicitly instead of leaving it as a
generic auth failure.

#### Phase 2 — Sensor and stack trace filter

Run this only for jobs where Phase 1 showed scanner failure or the owning phase is ambiguous:

```bash
sed --sandbox -n '
/\[36;1m/b
/Sensor /p
/EXECUTION FAILURE/p
/Node\.js process running out of memory/p
/sonar\.javascript\.node\.maxspace/p
/sonar\.javascript\.node\.debugMemory/p
/OutOfMemoryError/p
/ReportPublisher\.upload/p
/api\/ce\/submit/p
/SocketTimeoutException/p
/Process completed with exit code/p
/org\.sonar\.plugins\.javascript/p
' target/peach-logs/JOB_ID.log
```

Apply the last-sensor-wins rule from the guide:

- the last sensor that started before the error owns the crash
- if JavaScript analysis finished and a later non-SonarJS sensor failed, do not blame SonarJS
- if the last active sensor is a SonarJS sensor and the log shows SonarJS frames or explicit
  Node heap exhaustion, classify it as `CRITICAL`
- if `ReportPublisher.upload` or `/api/ce/submit` fails after JS analysis completed, classify it
  as `post-scan` and `IGNORE` for SonarJS ownership

#### Phase 3 — Full log

If the failure is still ambiguous, read the full saved log and classify manually.

### 8. Classify each job

Classify each failed job as one of:

- `CRITICAL`
- `IGNORE`
- `NEEDS-MANUAL-REVIEW`

Prefer direct classification from logs. Use parallel subagents only when a job remains ambiguous
after Phase 2 and the runtime allows delegation.

If a subagent returns no structured assessment, record:

- verdict: `NEEDS-MANUAL-REVIEW`
- evidence: `Agent returned no output`

### 9. Check for clustered failures

If two or more jobs share the same category, check whether they failed within a five-minute
window. Use timestamps from log lines rather than `completedAt` from the paginated jobs API,
because `completedAt` may be `null`.

If clustered, add a note that the jobs likely came from a single infrastructure event.

### 10. Print summary

Group findings by shared cause, not one row per job.
Translate raw helper statuses such as `STALE` into plain language in the findings; reserve the raw
status names for the compact summary counts.

Do not emit `prepare-project-matrix` or `diff-validation-aggregated` as findings. Add a single
exclusion line that names the excluded workflow jobs and prints both exclusion counts, for example
`Excluded by design: prepare-project-matrix, diff-validation-aggregated (workflow jobs excluded: 2, project jobs excluded: 0)`.

Use this structure:

```text
## Peach Main Analysis — Run RUN_ID (DATE)

Excluded by design: prepare-project-matrix, diff-validation-aggregated (workflow jobs excluded: WORKFLOW_EXCLUDED, project jobs excluded: PROJECT_EXCLUDED)

### IGNORE — Peach report upload timeout
- closure-library — `ReportPublisher.upload` to `/api/ce/submit` timed out after JS analysis completed
- nx — `ReportPublisher.upload` to `/api/ce/submit` timed out after JS analysis completed

### NEEDS-MANUAL-REVIEW — Suspicious issue count drop
- js:FreeCodeCamp — `violations` dropped from median baseline 4150 to 3821 (-7.9%, -329)

### Summary
- CRITICAL: N jobs
- NEEDS-MANUAL-REVIEW: N items
- IGNORE: N jobs
- Analysis-consistency check: OK=N, DROP=N, INSUFFICIENT_HISTORY=N, STALE=N, UNRESOLVED_PROJECT=N, ERROR=N

Release recommendation: SAFE | NOT SAFE | REVIEW NEEDED
```

Release recommendation rules:

- `SAFE` when there are zero `CRITICAL` and zero `NEEDS-MANUAL-REVIEW` items
- `NOT SAFE` when there is one or more `CRITICAL` jobs
- `REVIEW NEEDED` when there are zero `CRITICAL` but one or more `NEEDS-MANUAL-REVIEW` items

If every failed job is either Diff Val monitoring or another `IGNORE` category, the run is still
`SAFE` only when the analysis-consistency check is also clean.

### 11. Update docs when needed

If you identify a new failure pattern during the session, update
`docs/peach-main-analysis.md` so the guide stays current for future runs.
