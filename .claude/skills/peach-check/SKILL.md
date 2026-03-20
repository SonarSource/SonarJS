---
name: peach-check
description: Use before a SonarJS release or when the nightly Peach Main Analysis workflow shows
  failures that need triage. Classifies each failure as a critical analyzer bug or a safe-to-ignore
  infrastructure problem.
allowed-tools: Bash(gh run list:*), Bash(gh api:*), Read, Agent
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
  --json databaseId,conclusion,createdAt,status
```

Pick the most recent run with `status == "completed"` (meaning finished running, not necessarily passed — a completed run can have failed jobs, which is what we're looking for). Record its `databaseId` as `RUN_ID`.

**Step 2 — Collect all failed jobs**

The run has ~250 jobs across 3 pages. Fetch all three pages and collect jobs where
`conclusion == "failure"`:

```bash
gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100&page=1"
gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100&page=2"
gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100&page=3"
```

For each page, collect jobs where `conclusion == "failure"`. Record each job's `name`, `id`, and
`completedAt` (may be `null` — see Step 7 for handling).

**Step 3 — Early exit if no failures**

If there are no failed jobs, print:

```
✓ All jobs passed in run RUN_ID (DATE). Safe to proceed with release.
```

Then stop.

**Step 4 — Mass failure detection**

If **≥80% of jobs failed** (e.g. 200+ out of 253), this indicates a single shared root cause.
Do not triage every job individually.

Instead:
1. Sample 5 representative jobs (spread across pages 1–3)
2. Run Phase 2 grep on each (see below) to identify the dominant pattern, including sensor and stack trace origin
3. Determine the verdict for the dominant pattern using the rules below
4. Apply that verdict to all failed jobs
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

Read `docs/peach-main-analysis.md` once to load the failure categories and decision flowchart.

Then triage each failed job using a graduated approach. Work through phases as needed — stop as
soon as a job can be classified. Run all jobs in parallel within each phase.

**Phase 1 — Filter for failure signals (always, all jobs in parallel)**

Fetch the log and filter for key failure signals. Do NOT use `tail -40` — cleanup steps often run
after the scan step fails (e.g. always-run SHA extraction), pushing the exit code out of the
tail window. A multi-line `sed -n` script is more reliable and easier to maintain than one long
regular expression:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs" \
  | sed -n '
/Process completed with exit code/p
/EXECUTION FAILURE/p
/OutOfMemoryError/p
/502 Bad Gateway/p
/503/p
/Artifact has expired/p
/All 3 attempts failed/p
/ERR_PNPM/p
/ERESOLVE/p
/Invalid value of sonar/p
/does not exist for/p
'
```

Use the decision flowchart and failure categories from `docs/peach-main-analysis.md` to classify
the filtered output. If the filtered lines show exit code 3 (EXECUTION FAILURE from the
SonarQube scanner), always continue to Phase 2 — Phase 1 does not surface Java stack traces,
so the SonarJS plugin involvement cannot be ruled out from Phase 1 alone.

**Phase 2 — Sensor and stack trace filter (for exit code 3 failures)**

When Phase 1 shows exit code 3, run this to find the last sensor that ran and surface any
SonarJS plugin stack trace:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs" \
  | sed -n '
/Sensor /p
/EXECUTION FAILURE/p
/OutOfMemoryError/p
/Process completed with exit code/p
/org\.sonar\.plugins\.javascript/p
'
```

This surfaces both the last sensor that ran and any `org.sonar.plugins.javascript` frames in the
stack trace. Apply the classification rules in `docs/peach-main-analysis.md` and run this only
for jobs that need it, all concurrently.

**Phase 3 — Full log (only when Phase 2 is still ambiguous)**

If the failure still cannot be classified (unrecognised stack trace, unexpected exit code), fetch
the full log and inspect it. This should be rare.

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs"
```

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

Sort rows by verdict: CRITICAL first, then NEEDS-MANUAL-REVIEW, then IGNORE.
Place the Category column first. After the verdict counts and release recommendation, list any
general notes collected during log analysis (for example clustered failures or mass-failure
observations):

```
## Peach Main Analysis — Run RUN_ID (DATE)

| Category                  | Job         | Verdict               | Evidence                                     |
|---------------------------|-------------|-----------------------|----------------------------------------------|
| Analyzer crash            | gutenberg   | 🔴 CRITICAL           | IllegalArgumentException: invalid line offset |
| Dep install failure       | builderbot  | ✅ IGNORE             | ERR_PNPM_OUTDATED_LOCKFILE                   |
| Dep install failure       | hono        | ✅ IGNORE             | ETARGET: No matching version for @hono/...   |

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

**Step 9 — Update docs if a new failure pattern was found**

If any job was classified as NEEDS-MANUAL-REVIEW and you identified its root cause during this
session, update `docs/peach-main-analysis.md` with a new category entry. This keeps the
classification guide current for future runs.
