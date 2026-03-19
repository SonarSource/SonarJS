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

**Step 3b — Mass failure detection**

If **≥80% of jobs failed** (e.g. 200+ out of 253), this almost always indicates a single
infrastructure event, not individual analyzer bugs. Do not triage every job individually.

Instead:
1. Sample 5 representative jobs (spread across pages 1–3)
2. Run Phase 1 grep on each (see below) to identify the dominant pattern
3. If all 5 share the same IGNORE category, apply that verdict to all failed jobs
4. In the summary, note the mass event and list only the sampled jobs as evidence

Common mass-failure causes (all IGNORE):
- Peach server down: `HTTP 502 Bad Gateway` at `peach.sonarsource.com/api/server/version`
- Artifact expired: `Artifact has expired (HTTP 410)` during JAR download

**Step 4 — Read the classification guide and triage all logs**

Read `docs/peach-main-analysis.md` once to load the failure categories and decision flowchart.

Then triage each failed job using a graduated approach. Work through phases as needed — stop as
soon as a job can be classified. Run all jobs in parallel within each phase.

**Phase 1 — Grep for failure signals (always, all jobs in parallel)**

Fetch the log and grep for key failure signals. Do NOT use `tail -40` — cleanup steps often run
after the scan step fails (e.g. always-run SHA extraction), pushing the exit code out of the
tail window. Grep is more reliable:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs" \
  | grep -E "##\[error\]Process completed with exit code|EXECUTION FAILURE|OutOfMemoryError|502 Bad Gateway|503|Artifact has expired|All 3 attempts failed|ERR_PNPM|ERESOLVE|Invalid value of sonar|does not exist for"
```

Classify immediately from the grep output:
- `exit code 1` + `502 Bad Gateway` → Peach server unreachable → IGNORE
- `exit code 1` + `Artifact has expired` → Artifact expired → IGNORE
- `exit code 1` + `All 3 attempts failed` → Git clone timeout → IGNORE
- `exit code 1` + `ERR_PNPM` / `ERESOLVE` / dep install error → Dep install failure → IGNORE
- `exit code 1` (vault/infra, no other signal) → Vault / CI infra failure → IGNORE
- `exit code 3` + `Invalid value of sonar` / `does not exist` → Project misconfiguration → IGNORE
- `exit code 137` → Out-of-memory kill → CRITICAL
- `exit code 3` + Java stack trace → proceed to Phase 2 (identify which sensor crashed)

**Phase 2 — Sensor context grep (only for exit code 3 + Java stack trace)**

When Phase 1 shows exit code 3 with a Java stack trace but the active sensor name is not visible
in the grep output, add `Sensor ` to the grep to find the last sensor that ran:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs" \
  | grep -E "Sensor |EXECUTION FAILURE|OutOfMemoryError|##\[error\]"
```

This gives both the last sensor that ran and the failure signal. Run only for jobs that need it,
all concurrently.

**Phase 3 — Full log (only when Phase 2 is still ambiguous)**

If the failure still cannot be classified (unrecognised stack trace, unexpected exit code), fetch
the full log and inspect it. This should be rare.

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs"
```

> **Fallback:** If `gh api` is blocked by permission restrictions, use
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
