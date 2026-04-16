---
name: peach-check
description: Use before a SonarJS release or when the nightly Peach Main Analysis workflow shows
  failures that need triage. Classifies each failure as a critical analyzer bug or a safe-to-ignore
  infrastructure problem.
allowed-tools: Bash(gh run list:*), Bash(gh api:*), Bash(mkdir:*), Bash(jq:*), Bash(sed --sandbox:*), Read, Agent
---

# Peach Main Analysis Check

## Overview

This skill fetches the latest Peach Main Analysis GitHub Actions run, classifies each failed job,
and produces a summary. It is self-contained: all instructions are in this file and in
`docs/peach-main-analysis.md`.

## Prerequisites

Before running this skill, ensure:

- `gh` is installed and authenticated (`gh auth status`)
- the current GitHub identity has access to `SonarSource/peachee-js`
- the environment permits outbound GitHub API requests
- parallel `gh api` calls are allowed, since failed jobs should be triaged concurrently

## Command discipline

**Never chain commands** with `&&`, `;`, or `|`. Each command in this skill must be issued as a
separate Bash call. Chaining bypasses the per-tool permission prompts that allow the user to
review each action individually.

A common violation is labelling output by prepending `echo "=== name ===" &&` to a command. Do
not do this. Job names belong in your prose response, not in the Bash call. Write the label as
plain text, then issue the command on its own.

**Parallel execution is separate from chaining.** Issuing multiple independent Bash calls in
the same response message is the correct way to run jobs concurrently — it does not violate the
no-chaining rule. The no-chaining rule is about what goes *inside* a single Bash call; parallel
execution is about how many Bash calls appear in a single response. Both rules apply together:
separate calls, issued at the same time.

## Invocation

```
/peach-check [run-id]
```

- Without `run-id`: analyses the most recent completed run
- With `run-id`: analyses a specific run (e.g. `/peach-check 22934517734`)

## Execution

**Step 1 — Find the run to analyse**

If the user provided a `run-id`, use it directly.

Otherwise, fetch the most recent completed run of `main-analysis.yml` on `js-ts-css-html`:

```bash
gh run list \
  --repo SonarSource/peachee-js \
  --workflow main-analysis.yml \
  --branch js-ts-css-html \
  --limit 5 \
  --json databaseId,conclusion,createdAt,status \
  --jq '[.[] | select(.status == "completed")] | first | {databaseId, conclusion, createdAt}'
```

This prints the `databaseId`, `conclusion`, and `createdAt` of the most recent completed run (meaning finished running, not necessarily passed — a completed run can have failed jobs, which is what we're looking for). Record `databaseId` as `RUN_ID`.

**Step 1b — Stop if the run was cancelled**

If the run `conclusion` is `"cancelled"`, the run did not finish normally and is not usable for
release triage. Print:

```
⚠️ Run RUN_ID (DATE) was cancelled before completion.
Rerun recommended for all failed/cancelled jobs. Check back once the rerun completes.
```

Then stop — do not attempt to triage the incomplete results.

**Step 2 — Collect all failed jobs**

The run has ~250 jobs across 3 pages. Fetch the run jobs with the Actions API and extract failed
jobs from the merged result. Do not use `gh run view --json jobs` for Peach Main Analysis because
the matrix is large.

```bash
gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100" --paginate > jobs.json
```

Then slurp the paginated output with `jq -s` before querying it:

```bash
jq -s '
  {
    total_jobs: (map(.jobs | length) | add),
    failed_jobs: (map([.jobs[] | select(.conclusion == "failure")] | length) | add),
    jobs: (map(.jobs) | add)
  }
' jobs.json
```

Important: `gh api --paginate` emits one JSON object per page. Always slurp with `jq -s` or merge
pages explicitly before querying `.jobs`.

Before counting, sampling, or triaging, fetch metadata for every failed job.

Exclude the job named `diff-validation-aggregated` from the analyzed job set immediately:

- do not include it in analyzed failure counts
- do not include it in the mass-failure ratio
- do not classify it
- do not emit it as an ignored finding
- mention it at most once as an excluded-by-design workflow job if that context is useful

For each remaining failed job, record:

- job id
- job name
- completion time
- job URL
- `failing_step_name`
- `owning_phase` (`pre-scan`, `analyze`, or `post-scan`)

If the job metadata shows multiple failed steps, use the earliest failed step that actually ran as
the phase owner. Treat later failed report/cleanup steps as downstream noise unless they are the
only failed steps.

Important: the literal GitHub step name is not always the failure phase owner. A job can show only
`Analyze project: failure` in step metadata but still be a `post-scan` failure when the
JavaScript sensor already completed and the stack trace later shows `ReportPublisher.upload`,
`/api/ce/submit`, or another report-submission failure.

Before deeper triage, check whether the failure belongs to Diff Val monitoring rather than the
analysis itself:

- If the failing step name contains `Diff Val` or `diff-val`, classify the job immediately as
  `IGNORE`.
- These jobs are monitoring / post-processing only. They are not release blockers for SonarJS.
- Per-project Diff Val failures stay in scope as `IGNORE` findings.
- The final `diff-validation-aggregated` job is out of scope and already excluded entirely.

**Step 3 — Early exit if no failures**

If there are no failed jobs left after exclusions, print:

```
✓ All jobs passed in run RUN_ID (DATE). Safe to proceed with release.
```

Then stop.

**Step 4 — Mass failure detection**

If **≥80% of analyzed jobs failed** after exclusions, this indicates a single shared root cause.
Do not triage every job individually.

Instead:
1. Sample 5 representative jobs (spread across pages 1–3)
2. Run Phase 2 grep on each (see below) to classify each sampled job individually, including sensor and stack trace origin
3. If **any** sampled job is CRITICAL, the mass verdict is CRITICAL — CRITICAL takes priority regardless of how many other jobs match an IGNORE pattern
4. Otherwise, apply the shared pattern's verdict to all failed jobs
5. In the summary, note the mass event and list only the sampled jobs as evidence

**Mass failure verdict rules — check in this order:**

- **CRITICAL** if the shared stack trace originates in `org.sonar.plugins.javascript` — the
  SonarJS plugin itself is broken (e.g. fails to initialize, crashes during analysis). This
  takes priority over any infrastructure explanation: if the SonarJS plugin is at fault, it
  must be fixed before release regardless of how many jobs are affected.

- **IGNORE** if the shared error is a Peach infrastructure failure with no SonarJS involvement:
  - Peach server down: `HTTP 502 Bad Gateway` at `peach.sonarsource.com/api/server/version`
  - Artifact expired: `Artifact has expired (HTTP 410)` during JAR download — **only when
    exit code 1 is the sole failure**. If exit code 3 also appears, the analysis still ran
    after the download failure; treat exit code 3 as a separate failure and check it for
    SonarJS involvement before concluding IGNORE.

- **NEEDS-MANUAL-REVIEW** if the pattern does not match either of the above.

**Step 5 — Read the classification guide and triage all logs**

Read `docs/peach-main-analysis.md` (at the repository root) once to load the failure categories and decision flowchart.

Create the work directory where logs will be stored for inspection:

```bash
mkdir -p target/peach-logs
```

Use the metadata already collected in Step 2 to determine `failing_step_name` and `owning_phase`
before downloading logs. Only download logs for jobs that still need log-based classification.

If the metadata is missing or incomplete for a job, fetch it with:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID"
```

Use this to confirm whether the job failed in `Checkout project`, `Install dependencies`,
`Analyze project`, `Report analyzer version`, or another phase boundary.

When multiple steps are marked failed:
- If `Analyze project` was skipped, classify from the earlier failed pre-scan step.
- If an earlier step failed and later report/post steps also failed, attribute the job to the
  earliest real failure.
- Do not classify from `Report analyzer version` when the project was never analyzed.
- If `Analyze project` is the only failed GitHub step but the log shows
  `JavaScript/TypeScript/CSS analysis [javascript] (done)` before a later
  `ReportPublisher.upload` / `/api/ce/submit` failure, classify it as `post-scan`, not `analyze`.

Then triage each remaining failed job using a graduated approach. Work through phases as needed — stop as
soon as a job can be classified. Run all jobs in parallel within each phase.

If the failing step is a Diff Val / diff-val monitoring step (`Setup Diff Val`,
`Diff Val Snapshot generation`, `Diff Val aggregated snapshot generation`, or similar), classify
it immediately as `IGNORE` and stop triage for that job. The final
`diff-validation-aggregated` job should not reach this step because it is already excluded.

**Phase 1 — Download log and filter for failure signals (only for jobs not already classified from metadata)**

Download the log to disk, then filter for key failure signals. Saving to disk avoids re-downloading
in Phase 2 and leaves logs available for manual inspection after the run. Do NOT use `tail -40` —
cleanup steps often run after the scan step fails (e.g. always-run SHA extraction), pushing the
exit code out of the tail window. A multi-line `sed -n` script is more reliable and easier to
maintain than one long regular expression. `--sandbox` prevents sed from executing shell commands
via the `e` command, which is a risk when processing untrusted log content.

Write each job's name as plain text to identify the output, then issue each command as a
standalone Bash call with no prefix:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs" \
  > target/peach-logs/JOB_ID.log
sed --sandbox -n '
/\[36;1m/b
/Process completed with exit code/p
/EXECUTION FAILURE/p
/OutOfMemoryError/p
/502 Bad Gateway/p
/503 Service Unavailable/p
/Diff Val/p
/diff-val/p
/Artifact has expired/p
/All 3 attempts failed/p
/ERR_PNPM/p
/ERESOLVE/p
/ETARGET/p
/notarget/p
/Invalid value of sonar/p
/does not exist for/p
' target/peach-logs/JOB_ID.log
```

Do not treat the first `Process completed with exit code ...` line in the raw log as the owning
failure by default. Nested commands can emit intermediate non-fatal exit codes that the workflow
handles and then continues past. In particular, early `Artifact has expired (HTTP 410)` lines may
appear before the real later failure. Trust the job step metadata first, then use the final
failing section of the log to determine ownership.

Use the decision flowchart and failure categories from `docs/peach-main-analysis.md` to classify
the filtered output. If the filtered lines show exit code 3 (EXECUTION FAILURE from the
SonarQube scanner), always continue to Phase 2 — Phase 1 does not surface Java stack traces,
so the SonarJS plugin involvement cannot be ruled out from Phase 1 alone.

Many jobs can be classified immediately from Phase 1:

- project misconfiguration
- dependency install failure
- Peach unavailable
- artifact expired
- clone/network failures
- cancelled or incomplete run evidence

Also watch for checkout failures before analysis, for example:

- `fatal: could not read Username for 'https://github.com'`
- repeated checkout retries followed by `All 3 attempts failed`

These are pre-scan failures. If the upstream GitHub repository appears removed or inaccessible,
call that out explicitly rather than leaving it as a generic auth failure.

**Phase 2 — Sensor and stack trace filter (for exit code 3 failures)**

When Phase 1 shows exit code 3, run this to find the last sensor that ran and surface any
SonarJS plugin stack trace. The log is already on disk from Phase 1 — no re-download needed:

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

This surfaces both the last sensor that ran and any `org.sonar.plugins.javascript` frames in the
stack trace, plus Node-heap exhaustion hints and the post-scan report-upload timeout pattern.
Apply the classification rules in `docs/peach-main-analysis.md` and run this only for jobs that
need it, all concurrently.

**Phase 3 — Full log (only when Phase 2 is still ambiguous)**

If the failure still cannot be classified (unrecognised stack trace, unexpected exit code), read
the full log from disk using the `Read` tool on `target/peach-logs/JOB_ID.log`. This should be
rare.

**Step 6 — Classify each job**

Using the decision flowchart from the classification guide, classify each job directly from the
logs. Most failures are unambiguous (clone timeout, dep install failure, project misconfiguration)
and need no further help.

**Only launch parallel agents when** a job's logs are ambiguous — e.g. an unfamiliar stack trace
or an exit code that doesn't match any known category. Launch one Agent per ambiguous job,
all concurrently, passing the classification rules and log excerpt inline:

```
You are assessing a failed job in the Peach Main Analysis workflow.

Job: JOB_NAME
Classification rules: <classification-rules>CLASSIFICATION_RULES</classification-rules>
Job logs: <job-logs>LOGS</job-logs>

Classify and return:
   Job: JOB_NAME
   Verdict: CRITICAL | IGNORE | NEEDS-MANUAL-REVIEW
   Category: <category name>
   Evidence: <key log line(s), max 2>
```

If an agent returns no structured assessment, record that job as `NEEDS-MANUAL-REVIEW` with
evidence `Agent returned no output`.

**Step 7 — Check for clustered failures**

If 2 or more jobs share the same category, check whether they failed within a
5-minute window. Use `completedAt` timestamps if available; otherwise extract the timestamp prefix
from log lines (format: `2026-MM-DDTHH:MM:SS.`). If clustered, record a general note for the
summary, for example:
> ⚠️ N jobs failed with the same pattern within a 5-minute window — likely caused by a single infrastructure event.

**Step 8 — Print summary**

Findings should be grouped by shared cause, not emitted as a flat one-row-per-job list.
Within each cause group, list the affected jobs and short evidence.

Do not emit `diff-validation-aggregated` as a finding. At most, add a short note such as
`Excluded by design: diff-validation-aggregated`.

After the grouped findings, print verdict counts and the release recommendation. Then list any
general notes collected during log analysis (for example clustered failures or mass-failure
observations).

```
## Peach Main Analysis — Run RUN_ID (DATE)

Excluded by design: diff-validation-aggregated

### IGNORE — Peach report upload timeout
- closure-library — `ReportPublisher.upload` to `/api/ce/submit` timed out after JS analysis completed
- nx — `ReportPublisher.upload` to `/api/ce/submit` timed out after JS analysis completed

### IGNORE — Diff Val monitoring failure
- go-view — `Diff Val Snapshot generation`
- ioredis — `Diff Val Snapshot generation`

### Summary
- 🔴 CRITICAL: N jobs — investigate before release
- ⚠️  NEEDS-MANUAL-REVIEW: N jobs — manual check required
- ✅ IGNORE: N jobs — unrelated to SonarJS analyzer

**Release recommendation:** SAFE / NOT SAFE / REVIEW NEEDED

### Notes
- ⚠️ N jobs failed with the same pattern within a 5-minute window — likely caused by a single infrastructure event.
```

The release recommendation is:
- **SAFE** — zero CRITICAL or NEEDS-MANUAL-REVIEW jobs
- **NOT SAFE** — one or more CRITICAL jobs
- **REVIEW NEEDED** — zero CRITICAL but one or more NEEDS-MANUAL-REVIEW jobs

If every failed job is either a Diff Val monitoring failure or another `IGNORE` category, the
release recommendation is still **SAFE**.

**Step 9 — Update docs if a new failure pattern was found**

If any job was classified as NEEDS-MANUAL-REVIEW and you identified its root cause during this
session, update `docs/peach-main-analysis.md` (at the repository root) with a new category entry. This keeps the
classification guide current for future runs.
