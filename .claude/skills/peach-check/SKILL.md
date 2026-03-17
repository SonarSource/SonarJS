---
name: peach-check
description: Use before a SonarJS release or when the nightly Peach Main Analysis workflow shows
  failures that need triage. Classifies each failure as a critical analyzer bug or a safe-to-ignore
  infrastructure problem.
---

# Peach Main Analysis Check

## Overview

This skill fetches the latest Peach Main Analysis GitHub Actions run, classifies each failed job,
and produces a summary. It is self-contained: all instructions are in this file and in
`docs/peach-main-analysis.md`.

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
`completedAt` (may be `null` — see Step 6 for handling).

**Step 3 — Early exit if no failures**

If there are no failed jobs, print:

```
✓ All jobs passed in run RUN_ID (DATE). Safe to proceed with release.
```

Then stop.

**Step 4 — Read the classification guide and download all logs**

Read `docs/peach-main-analysis.md` once to load the failure categories and decision flowchart.

Then, in a SINGLE message, download all job logs in parallel:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs" \
  | grep -A 15 "ERROR\|exit code\|EXECUTION FAILURE\|IllegalStateException\|SocketTimeoutException\|All 3 attempts\|does not exist\|OUTDATED_LOCKFILE\|ERESOLVE"
```

Run one command per failed job, all concurrently.

> **Fallback:** If `gh api` is blocked by permission restrictions, try fetching logs via
> `gh run view --log --job JOB_ID --repo SonarSource/peachee-js` instead.

**Step 5 — Classify each job**

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

**Step 6 — Print summary**

**Cluster check:** If 2 or more jobs share the same category, check whether they failed within a
5-minute window. Use `completedAt` timestamps if available; otherwise extract the timestamp prefix
from log lines (format: `2026-MM-DDTHH:MM:SS.`). If clustered, add a note beneath the table:
> ⚠️ N jobs failed with the same pattern within a 5-minute window — likely caused by a single infrastructure event.

Sort rows by verdict: CRITICAL first, then NEEDS-MANUAL-REVIEW, then IGNORE.
Place the Category column first:

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
```

The release recommendation is:
- **SAFE** — zero CRITICAL or NEEDS-MANUAL-REVIEW jobs
- **NOT SAFE** — one or more CRITICAL jobs
- **REVIEW NEEDED** — zero CRITICAL but one or more NEEDS-MANUAL-REVIEW jobs

**Step 7 — Update docs if a new failure pattern was found**

If any job was classified as NEEDS-MANUAL-REVIEW and you identified its root cause during this
session, update `docs/peach-main-analysis.md` with a new category entry. This keeps the
classification guide current for future runs.
