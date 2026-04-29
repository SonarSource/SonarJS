---
name: peach-check
description: Use before a SonarJS release or when the Peach Main Analysis workflow on SonarSource/peachee-js shows failures that need triage. Classify each failed Peach job as a SonarJS-critical analyzer bug, an ignore-worthy infrastructure or project failure, or a manual-review case using docs/peach-main-analysis.md.
---

# Peach Main Analysis Check

Use this skill when the user asks to check the latest Peach run, triage Peach Main Analysis
failures, or decide whether Peach blocks a SonarJS release.

## Overview

- Repository under analysis: `SonarSource/peachee-js`
- Workflow file: `main-analysis.yml`
- Branch: `js-ts-css-html`
- Classification guide: `docs/peach-main-analysis.md`

This skill fetches the target run, collects failed jobs, classifies them with the guide, and
prints a summary focused on SonarJS ownership.

## Prerequisites

- Run from the SonarJS repository.
- Verify GitHub auth first with `gh auth status`.
- Ensure the current GitHub identity can access `SonarSource/peachee-js`.
- Save failed-job logs under `target/peach-logs/`.
- Parallelize independent job triage work, but do not chain shell commands.

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

### 2. Collect failed jobs

First create the output directory:

```bash
mkdir -p target/peach-logs
```

Then fetch the paginated run jobs. Do not use `gh run view --json jobs` for Peach Main Analysis
because the matrix is large.

```bash
gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100" --paginate > target/jobs.json
```

Merge the paginated responses before querying them:

```bash
jq -s '
  {
    total_jobs: (map(.jobs | length) | add),
    failed_jobs: (map([.jobs[] | select(.conclusion == "failure")] | length) | add),
    jobs: (map(.jobs) | add)
  }
' target/jobs.json
```

Immediately exclude `diff-validation-aggregated` from the analyzed failure set:

- do not count it as an analyzed failure
- do not classify it
- do not emit it as a finding
- mention it at most once as excluded-by-design context

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

### 3. Early exit if no failures

If there are no failed jobs after exclusions, report the run as safe and stop.

### 4. Watch for mass failure

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

### 5. Read the classification guide

Read `docs/peach-main-analysis.md` once before classifying jobs. Use the guide's flowchart and
failure categories as the source of truth.

### 6. Triage logs in phases

Only download logs for jobs that still need log-based classification.

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

### 7. Classify each job

Classify each failed job as one of:

- `CRITICAL`
- `IGNORE`
- `NEEDS-MANUAL-REVIEW`

Prefer direct classification from logs. Use parallel subagents only when a job remains ambiguous
after Phase 2.

If a subagent returns no structured assessment, record:

- verdict: `NEEDS-MANUAL-REVIEW`
- evidence: `Agent returned no output`

### 8. Check for clustered failures

If two or more jobs share the same category, check whether they failed within a five-minute
window. Use timestamps from log lines rather than `completedAt` from the paginated jobs API,
because `completedAt` may be `null`.

If clustered, add a note that the jobs likely came from a single infrastructure event.

### 9. Print summary

Group findings by shared cause, not one row per job.

Do not emit `diff-validation-aggregated` as a finding. At most, add a note such as
`Excluded by design: diff-validation-aggregated`.

Use this structure:

```text
## Peach Main Analysis — Run RUN_ID (DATE)

Excluded by design: diff-validation-aggregated

### IGNORE — Peach report upload timeout
- closure-library — `ReportPublisher.upload` to `/api/ce/submit` timed out after JS analysis completed
- nx — `ReportPublisher.upload` to `/api/ce/submit` timed out after JS analysis completed

### Summary
- CRITICAL: N jobs
- NEEDS-MANUAL-REVIEW: N jobs
- IGNORE: N jobs

Release recommendation: SAFE | NOT SAFE | REVIEW NEEDED
```

Release recommendation rules:

- `SAFE` when there are zero `CRITICAL` and zero `NEEDS-MANUAL-REVIEW` jobs
- `NOT SAFE` when there is one or more `CRITICAL` jobs
- `REVIEW NEEDED` when there are zero `CRITICAL` but one or more `NEEDS-MANUAL-REVIEW` jobs

If every failed job is either Diff Val monitoring or another `IGNORE` category, the run is still
`SAFE`.

### 10. Update docs when needed

If you identify a new failure pattern during the session, update
`docs/peach-main-analysis.md` so the guide stays current for future runs.
