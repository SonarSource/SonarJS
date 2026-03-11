---
name: peach-check
description: Fetch the latest Peach Main Analysis run from SonarSource/peachee-js, classify all
  failed jobs as critical analyzer issues or safe-to-ignore infrastructure problems, and print a
  summary table. Use before a SonarJS release to verify analyzer stability.
disable-model-invocation: true
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

You are the **orchestrator**. Follow these phases exactly.

---

### Phase 1: Fetch failed jobs

**Step 1.1 — Find the run to analyse**

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

**Step 1.2 — Collect all failed jobs**

The run has ~250 jobs across 3 pages. Fetch all three pages and collect jobs where
`conclusion == "failure"`:

```bash
gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100&page=1"
gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100&page=2"
gh api "repos/SonarSource/peachee-js/actions/runs/RUN_ID/jobs?per_page=100&page=3"
```

For each page, collect jobs where `conclusion == "failure"`. Record each job's `name` and `id`.

**Step 1.3 — Early exit if no failures**

If there are no failed jobs, print:

```
✓ All jobs passed in run RUN_ID (DATE). Safe to proceed with release.
```

Then stop.

**Step 1.4 — Create tasks for each failure**

For each failed job, create a task:

```
TaskCreate subject: "Assess peach failure: JOB_NAME"
description: "Classify the failure of job JOB_NAME (id: JOB_ID) in Peach Main Analysis run RUN_ID.
Download the logs and classify using docs/peach-main-analysis.md."
```

**Step 1.5 — Launch parallel assessment agents**

Before launching agents, download the logs for ALL failed jobs:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs"
```

Run this for each failed job. Store the output (trim to the most relevant ~100 lines if very long — keep lines containing ERROR, exit code, exception names, step group headers). You will pass these logs inline to each agent.

Then update each agent prompt to include the logs inline. The per-job agent prompt becomes (fill in JOB_NAME, JOB_ID, TASK_ID, LOG_CONTENT):

In a SINGLE message, launch one Agent tool call per failed job. All agents run concurrently.
Each agent receives this prompt (fill in JOB_NAME, JOB_ID, TASK_ID, LOG_CONTENT):

```
You are assessing a failed job in the Peach Main Analysis workflow.

Job: JOB_NAME
Job ID: JOB_ID
Task ID: TASK_ID (mark this task complete when done)

Your steps:
0. Working directory: /home/francois/git/worktree/SonarJS/fix-peach-check-skill (or the current SonarJS worktree — check that `docs/peach-main-analysis.md` exists before reading)
1. Read docs/peach-main-analysis.md to understand failure categories and the decision flowchart
2. The job logs are provided below between the <job-logs> tags. Read them carefully.

<job-logs>
LOG_CONTENT
</job-logs>

3. Classify the failure using the decision flowchart in docs/peach-main-analysis.md
4. Mark the task TASK_ID as complete
5. Return a structured assessment:

   Job: JOB_NAME
   Verdict: CRITICAL | IGNORE | NEEDS-MANUAL-REVIEW
   Category: <category name from docs/peach-main-analysis.md>
   Evidence: <the key log line(s) that led to this verdict, max 2 lines>

Do not do anything else. Just classify and return the assessment.
```

**Step 1.6 — Collect results and print summary**

Wait for all agents to return. If any agent returned no structured assessment, record that job as `NEEDS-MANUAL-REVIEW` with evidence `Agent returned no output`. Then print the summary table:

```
## Peach Main Analysis — Run RUN_ID (DATE)

| Job         | Verdict               | Category                  | Evidence                                     |
|-------------|-----------------------|---------------------------|----------------------------------------------|
| gutenberg   | 🔴 CRITICAL           | Analyzer crash            | IllegalArgumentException: invalid line offset |
| builderbot  | ✅ IGNORE             | Dep install failure       | ERR_PNPM_OUTDATED_LOCKFILE                   |
| hono        | ✅ IGNORE             | Dep install failure       | ETARGET: No matching version for @hono/...   |

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
