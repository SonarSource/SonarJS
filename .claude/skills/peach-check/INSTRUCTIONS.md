# Peach Main Analysis Check

Canonical instructions for the `peach-check` skill live in this file.

Use this skill as a daily Peach Main Analysis sanity check, when the user asks to check the latest
Peach run, triage Peach Main Analysis failures, or decide whether Peach blocks a SonarJS release.

## Overview

- Repository under analysis: `SonarSource/peachee-js`
- Workflow file: `main-analysis.yml`
- Branch: `js-ts-css-html`
- Classification guide (failure path only): `docs/peach-main-analysis.md`
- Canonical run-jobs helper: `.claude/skills/peach-check/peach-run-jobs.js`
- Canonical issue-history helper: `.claude/skills/peach-check/peach-issue-history.js`
- Canonical DROP-forensics helper: `.claude/skills/peach-check/peach-drop-forensics.js`

This skill fetches the target run, collects failed jobs, runs an analysis-consistency check across
successful project scans to verify that the current Peach state is materially consistent with
recent history, classifies the findings with the guide, and prints a summary focused on SonarJS
ownership.

Do not open `docs/peach-main-analysis.md` unless `failed-jobs.total_jobs > 0` or
`clean_for_early_exit == false`.

## Prerequisites

- Run from the SonarJS repository.
- Verify GitHub auth first with `gh auth status`.
- Ensure the current GitHub identity can access `SonarSource/peachee-js`.
- Ensure `PEACH_KEY` is set.
- Verify it without printing the secret, for example:

```bash
test -n "${PEACH_KEY:-}"
```

  A zero exit status means `PEACH_KEY` is available.
- Do not `echo` or otherwise print `PEACH_KEY`.
- Know the path to a local `peachee-js` checkout. If `PEACHEE_ROOT` is set, use it. Otherwise
  pass the checkout path explicitly to the helper scripts.
- If `PEACHEE_ROOT` is unset and the checkout path is not obvious, locate it before continuing,
  for example:

```bash
find ~ -maxdepth 4 -type d -name peachee-js
```

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

### Green path

This is the common case:

1. Resolve the run.
2. Create a run-scoped output directory.
3. Collect project jobs.
4. Run the analysis-consistency helper.
5. If `OUTPUT_DIR/failed-jobs.json.total_jobs` is `0` and
   `OUTPUT_DIR/peach-issue-history.json.clean_for_early_exit` is `true`, print the `SAFE` summary
   and stop.
6. Only continue to DROP forensics or log triage when step 5 fails.

Do not open `docs/peach-main-analysis.md` on the green path unless step 5 fails.

Common green-path command sequence:

```bash
gh run list \
  --repo SonarSource/peachee-js \
  --workflow main-analysis.yml \
  --branch js-ts-css-html \
  --limit 5 \
  --json databaseId,conclusion,createdAt,status \
  --jq '[.[] | select(.status == "completed")] | first | {databaseId, conclusion, createdAt}'

mkdir -p OUTPUT_DIR

node .claude/skills/peach-check/peach-run-jobs.js RUN_ID OUTPUT_DIR

jq '{expected_total, total_jobs, failed_jobs, counts_match}' OUTPUT_DIR/jobs-merged.json

jq '{excluded_workflow_jobs, excluded_project_jobs}' OUTPUT_DIR/exclusion-counts.json

jq '{total_jobs}' OUTPUT_DIR/failed-jobs.json

jq '{total_jobs}' OUTPUT_DIR/project-jobs.json

rm -f OUTPUT_DIR/peach-issue-history.json

node .claude/skills/peach-check/peach-issue-history.js \
  OUTPUT_DIR/project-jobs.json \
  PEACHEE_ROOT_OR_PATH \
  OUTPUT_DIR/peach-issue-history.json

jq '{analysis_window_start, analysis_window_end, blocking_rows_count, clean_for_early_exit, summary}' OUTPUT_DIR/peach-issue-history.json
```

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
- `OUTPUT_DIR = target/peach-check/RUN_ID`

If the chosen run has `conclusion == "cancelled"`, stop and report that the run is incomplete and
not usable for release triage. Recommend a rerun and do not classify jobs from that run.

A workflow conclusion of `success` is not by itself a `SAFE` release verdict. Section 3 still
needs to confirm that the successful jobs produced fresh, materially consistent Peach analyses.

### 2. Collect project jobs

Use the helper script to fetch the Peach run jobs and materialize the working sets consumed by the
rest of the workflow:

```bash
mkdir -p OUTPUT_DIR
```

```bash
node .claude/skills/peach-check/peach-run-jobs.js RUN_ID OUTPUT_DIR
```

The helper is usually silent on success. Inspect the JSON files it writes rather than waiting for
stdout.

The script calls `gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100"`
from Node.js, falls back to explicit `?page=N` fetches if the paginated response comes back short,
and writes these files:

- `OUTPUT_DIR/jobs-merged.json`
- `OUTPUT_DIR/analyzed-jobs.json`
- `OUTPUT_DIR/exclusion-counts.json`
- `OUTPUT_DIR/failed-jobs.json`
- `OUTPUT_DIR/project-jobs.json`

Use these low-noise checks right away instead of opening the full JSON blobs:

```bash
jq '{expected_total, total_jobs, failed_jobs, counts_match}' OUTPUT_DIR/jobs-merged.json
```

```bash
jq '{excluded_workflow_jobs, excluded_project_jobs}' OUTPUT_DIR/exclusion-counts.json
```

```bash
jq '{total_jobs}' OUTPUT_DIR/failed-jobs.json
```

```bash
jq '{total_jobs}' OUTPUT_DIR/project-jobs.json
```

Count invariant:

`jobs-merged.total_jobs == project-jobs.total_jobs + failed-jobs.total_jobs + excluded_workflow_jobs + excluded_project_jobs`

Use that identity as a quick sanity check before moving on. For example, a clean run can look like
`247 = 245 + 0 + 2 + 0`.

JSON shapes:

- `OUTPUT_DIR/jobs-merged.json` → `{ expected_total, total_jobs, failed_jobs, counts_match, jobs }`
- `OUTPUT_DIR/failed-jobs.json` → `{ total_jobs, jobs }` for failed analyzed jobs
- `OUTPUT_DIR/project-jobs.json` → `{ total_jobs, jobs }` for successful analyzed jobs

`jobs` entries are raw GitHub Actions job objects from the jobs API. Expect fields such as `id`,
`name`, `html_url`, `head_sha`, and `steps` when GitHub includes them in the payload.

If `OUTPUT_DIR/jobs-merged.json` still cannot reconcile `expected_total` with `total_jobs` after the
explicit page fallback, the helper exits non-zero. Stop there and report the mismatch instead of
classifying partial data.

`OUTPUT_DIR/analyzed-jobs.json` excludes workflow-only jobs such as `prepare-project-matrix` and
`diff-validation-aggregated`.

`OUTPUT_DIR/exclusion-counts.json` records:

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

Use `OUTPUT_DIR/failed-jobs.json` for failure triage and `OUTPUT_DIR/project-jobs.json` for the
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

The helper reconstructs recent unresolved-issue counts from Peach analyses plus
`api/issues/search`, filtered to the SonarJS-owned languages:

- `js`
- `ts`
- `css`
- `web` (HTML)
- `yaml`

Use the repo-local helper:

```bash
rm -f OUTPUT_DIR/peach-issue-history.json
```

Remove any stale output first so an old JSON file is not mistaken for fresh helper output while the
new helper run is still in progress.

```bash
node .claude/skills/peach-check/peach-issue-history.js \
  OUTPUT_DIR/project-jobs.json \
  PEACHEE_ROOT_OR_PATH \
  OUTPUT_DIR/peach-issue-history.json
```

Use `${PEACHEE_ROOT}` when it is set, otherwise pass the explicit checkout path.

The helper writes two short stderr progress lines and can take tens of seconds across the full
project matrix, with little or no intermediate output while it runs. Repeated blank polls while
waiting are normal and do not by themselves indicate a hang. Judge completion from the `node`
process exit plus the final `peach-issue-history: wrote ...` line, then inspect the JSON file
instead of relying on progress-line frequency.

Use this low-noise check after the helper finishes:

```bash
jq '{analysis_window_start, analysis_window_end, blocking_rows_count, clean_for_early_exit, summary}' OUTPUT_DIR/peach-issue-history.json
```

The helper script reads:

- `PEACH_KEY` for Peach authentication
- `PEACH_ISSUE_DROP_THRESHOLD_PCT` with default `5`
- `PEACH_ISSUE_DROP_MIN_ABS` with default `20`
- `PEACH_ISSUE_HISTORY_CONCURRENCY` with default `8`

Do not use the whole-project `violations` history from `api/measures/search_history` for this
check anymore. That metric cannot be filtered by language and can hide false drops caused by
non-SonarJS analyzers.

Do not call `mc peach issue-history` from this skill anymore.

Interpret the helper statuses like this:

- `OK` → the project has a fresh analysis in the run window and its current SonarJS-language issue
  count is materially consistent with the recent baseline
- `DROP` → investigate with the DROP-forensics workflow below before writing the finding; keep it
  as `NEEDS-MANUAL-REVIEW` unless the forensics clearly downgrades it to expected project-scope
  churn
- `INSUFFICIENT_HISTORY` → mention only in the summary; there is not enough baseline to judge
  consistency, but this alone does not block a `SAFE` verdict
- `STALE` → treat as `NEEDS-MANUAL-REVIEW`; describe it as "no fresh Peach analysis observed
  during this run window", not just `STALE`
- `UNRESOLVED_PROJECT` for excluded workflow jobs such as `prepare-project-matrix` → ignore it
- other `UNRESOLVED_PROJECT` rows → treat as `NEEDS-MANUAL-REVIEW`; describe them as "could not
  match successful job to Peach project", so the consistency check is incomplete
- `ERROR` → treat as `NEEDS-MANUAL-REVIEW`; describe it as "analysis-consistency check failed for
  this project"

The helper also writes these top-level fields so the skill does not need ad hoc `jq` logic for
the clean green path:

- `blocking_rows_count`
- `clean_for_early_exit`
- `generated_at`
- `source_run_id`
- `source_head_sha`
- `source_jobs_total`
- `source_job_completed_at_min`
- `source_job_completed_at_max`

`OUTPUT_DIR/peach-issue-history.json.summary` always includes `OK`, `DROP`,
`INSUFFICIENT_HISTORY`, `STALE`, `UNRESOLVED_PROJECT`, and `ERROR`, even when a count is `0`.

Each `DROP` finding should include:

- SonarQube project key
- latest analysis date
- current SonarJS-language issue count
- baseline value
- absolute drop
- percentage drop

Each history row also carries the project-scope metadata needed for DROP triage:

- `project_dir`
- `has_sonar_tests`
- `sonar_sources`
- `sonar_tests`

The top-level report now uses `analysis_window_start` and `analysis_window_end` for the helper's
freshness bounds. Prefer those names over the old `analysis_after` / `analysis_before` wording.

Do not use `analysis_window_start` or `analysis_window_end` to identify the GitHub Actions run in
the report title. The report title should use the run timestamp recorded in Section 1 because that
timestamp answers "which run did we inspect?" The analysis-window fields answer a different
question: "which Peach analyses counted as fresh for the consistency check?" If you want to show
the freshness bounds, print them as separate supporting metadata instead of replacing the run
timestamp.

Treat `threshold-abs` as a small-project noise floor, not an alternative trigger. Flag `DROP`
only when the measured drop clears both gates:

- `drop_abs >= threshold-abs`
- `drop_pct >= threshold_pct`

Equivalent single-condition restatement after converting the percentage gate into absolute units:

- `drop_abs >= max(threshold-abs, baseline * threshold_pct / 100)`

That `max(...)` form is the same two-gate rule above, not an OR trigger.

#### DROP forensics

When a project is `DROP`, inspect the merged SARIF diff before deciding whether the drop looks
like a real analyzer regression or a project-scope change.

1. Download the current run's aggregated SARIF artifact:

```bash
mkdir -p OUTPUT_DIR/peach-drop-forensics/current
```

```bash
gh run download RUN_ID \
  --repo SonarSource/peachee-js \
  --name 0-aggregated-sarif \
  --dir OUTPUT_DIR/peach-drop-forensics/current
```

2. If the current merged SARIF has no results for the dropped project, backtrack to the previous
   completed run and download its `0-aggregated-sarif` too:

```bash
mkdir -p OUTPUT_DIR/peach-drop-forensics/previous
```

```bash
gh run download PREVIOUS_RUN_ID \
  --repo SonarSource/peachee-js \
  --name 0-aggregated-sarif \
  --dir OUTPUT_DIR/peach-drop-forensics/previous
```

Pass SARIF paths newest first; the helper will automatically pick the first candidate that
contains results for the project.

3. Run the helper with the project key, source job name, `PEACHEE_ROOT_OR_PATH`, an output path,
   and the extracted `.sarif` files you want to inspect:

```bash
node .claude/skills/peach-check/peach-drop-forensics.js \
  PROJECT_KEY \
  SOURCE_JOB_NAME \
  PEACHEE_ROOT_OR_PATH \
  OUTPUT_DIR/peach-drop-forensics/PROJECT_KEY.json \
  CURRENT_MERGED_SARIF_PATH \
  [PREVIOUS_MERGED_SARIF_PATH ...]
```

Use `${PEACHEE_ROOT}` when it is set, otherwise pass the explicit checkout path.

The helper reports:

- `selected_sarif_path`
- `counts_by_baseline_state`
- `test_like_counts_by_baseline_state`
- `non_test_like_counts_by_baseline_state`
- `top_rules_by_baseline_state`
- `top_paths_by_baseline_state`
- `project_metadata`
- `diagnosis`

Interpret the diagnosis like this:

- `LIKELY_TEST_SCOPE_RECLASSIFICATION` → the project does not define `sonar.tests`, all observed
  removals are on test-like paths, and any additions are absent or limited to test-only rules.
  Keep the item as `NEEDS-MANUAL-REVIEW`, but explain that the drop is likely caused by test-file
  fallback/reclassification rather than broad issue disappearance in production code.
- `NO_PROJECT_DIFFS` on the current run → do not stop there; inspect the previous completed run's
  merged SARIF because the actual drop may have been introduced earlier and the latest diff can be
  `NO DIFFERENCE`.
- `PROJECT_NOT_FOUND_IN_SARIF` → mention that differential validation did not capture this project,
  so the drop remains unexplained.
- `UNCLASSIFIED_DROP` → keep the generic suspicious-drop wording and summarize the dominant rules
  and paths from the helper output.

When the helper points to test-scope reclassification, explicitly mention whether
`has_sonar_tests` is `false` and cite the affected test-like paths. Do not invent
generated-source explanations unless the evidence actually shows generated-code-only paths.

### 4. Early exit if no failures and the analysis state looks consistent

This is the normal green path. If `OUTPUT_DIR/failed-jobs.json.total_jobs` is `0` and
`OUTPUT_DIR/peach-issue-history.json.clean_for_early_exit` is `true`, stop here: the failure-path
sections below do not apply. Report the run as safe, include the exclusion counts plus the
consistency summary, and stop.

If any project is `DROP`, `STALE`, non-excluded `UNRESOLVED_PROJECT`, or `ERROR`, do not call the
run safe even if the GitHub workflow has no failed project jobs.

If one or more failed jobs remain after exclusions, continue to Section 5.

### Failure path only

Sections 5 through 10 apply only when the Section 4 early exit does not apply.

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
mkdir -p OUTPUT_DIR/peach-logs
```

#### Phase 1 — Download log and filter failure signals

Download the log to disk:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs" > OUTPUT_DIR/peach-logs/JOB_ID.log
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
' OUTPUT_DIR/peach-logs/JOB_ID.log
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
' OUTPUT_DIR/peach-logs/JOB_ID.log
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

Use the exact UTC `createdAt` timestamp recorded in Section 1 in the report title, for example
`2026-06-01T03:10:36Z`, not a local date label.

Do not emit `prepare-project-matrix` or `diff-validation-aggregated` as findings. Add a single
exclusion line that names the excluded workflow jobs and prints both exclusion counts, for example
`Excluded by design: prepare-project-matrix, diff-validation-aggregated (workflow jobs excluded: 2, project jobs excluded: 0)`.

Use one of these structures:

Clean run example:

```text
## Peach Main Analysis — Run RUN_ID (RUN_CREATED_AT_UTC)

Excluded by design: prepare-project-matrix, diff-validation-aggregated (workflow jobs excluded: 2, project jobs excluded: 0)

### Summary
- CRITICAL: 0 jobs
- NEEDS-MANUAL-REVIEW: 0 items
- IGNORE: 0 jobs
- Analysis-consistency check: OK=245, DROP=0, INSUFFICIENT_HISTORY=0, STALE=0, UNRESOLVED_PROJECT=0, ERROR=0

Release recommendation: SAFE
```

Failure-oriented example:

```text
## Peach Main Analysis — Run RUN_ID (RUN_CREATED_AT_UTC)

Excluded by design: prepare-project-matrix, diff-validation-aggregated (workflow jobs excluded: WORKFLOW_EXCLUDED, project jobs excluded: PROJECT_EXCLUDED)

### IGNORE — Peach report upload timeout
- closure-library — `ReportPublisher.upload` to `/api/ce/submit` timed out after JS analysis completed
- nx — `ReportPublisher.upload` to `/api/ce/submit` timed out after JS analysis completed

### NEEDS-MANUAL-REVIEW — Suspicious issue count drop
- js:FreeCodeCamp — SonarJS-language issue count dropped from median baseline 4150 to 3821 (-7.9%, -329)

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
