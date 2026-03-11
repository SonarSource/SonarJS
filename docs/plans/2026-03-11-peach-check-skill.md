# Peach Check Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `/peach-check` skill that fetches the latest Peach Main Analysis run, classifies each failed job as a critical analyzer problem or a safe-to-ignore issue, and prints a summary table.

**Architecture:** Two deliverables — a knowledge base document (`docs/peach-main-analysis.md`) that explains failure categories, and a skill file (`.claude/skills/peach-check/SKILL.md`) that orchestrates fetching failures and launching parallel per-job assessment agents. The skill is self-contained with no external skill dependencies.

**Tech Stack:** GitHub CLI (`gh`), GitHub Actions REST API, Claude `Agent` tool for parallel dispatch.

---

### Task 1: Create the knowledge base document

**Files:**
- Create: `docs/peach-main-analysis.md`

This document is both a human reference guide and the AI's classification reference. It must be
thorough enough that an agent reading it can classify any failure without further context.

**Step 1: Create the document**

Create `docs/peach-main-analysis.md` with the following content:

````markdown
# Peach Main Analysis

The **Peach Main Analysis** is a scheduled GitHub Actions workflow (`main-analysis.yml`) in the
`SonarSource/peachee-js` repository, branch `js-ts-css-html`. It runs nightly, using a matrix
to scan ~250 open-source JavaScript/TypeScript projects against a SonarQube instance (Peach)
using the latest SonarJS analyzer build.

## Why It Matters

Failures in this workflow may indicate bugs in the SonarJS analyzer. Reviewing the results
before a release is essential to ensure the analyzer is stable.

## Failure Classification

Not all failures indicate an analyzer problem. The workflow involves several phases before the
actual scan, and failures in early phases are unrelated to the SonarJS analyzer.

### Decision Flowchart

```
1. At which step did the job fail?
   ├─ Pre-scan step (checkout, vault secrets, dependency install) → IGNORE
   ├─ During sonar-scanner execution → go to step 2
   └─ Unclear / no recognizable step → NEEDS-MANUAL-REVIEW

2. What is the scanner exit code?
   ├─ Exit code 3 → CRITICAL (analyzer crash)
   ├─ Exit code 137 → CRITICAL (out-of-memory, escalate)
   └─ Other exit code → inspect stack trace:
       ├─ Java exception originating from SonarJS/scanner code → CRITICAL
       └─ Other → NEEDS-MANUAL-REVIEW
```

## Failure Categories

### CRITICAL: Analyzer Crash

**Verdict:** CRITICAL — must be investigated before any release.

**How to identify:**
- Failure occurs during the SonarScanner execution step (not during install/checkout)
- Scanner exits with code 3
- Java stack trace present in logs containing one or more of:
  - `DRE analysis failed`
  - `java.lang.IllegalArgumentException`
  - `java.lang.IllegalStateException`
  - `Failed to save issue`
  - `EXECUTION FAILURE` followed by a Java exception

**Example log excerpt:**
```
03:04:07 ERROR Error during SonarScanner Engine execution
java.lang.IllegalStateException: DRE analysis failed
  at com.A.A.D.H.execute(Unknown Source)
  ...
Caused by: java.lang.IllegalStateException: Failed to save issue
Caused by: java.lang.IllegalArgumentException: 19 is not a valid line offset for pointer.
  File packages/react-native-editor/bin/test-e2e-setup.sh has 18 character(s) at line 21
...
03:04:08 INFO  EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

**Action:** File a bug or investigate the analyzer code. Do not release until resolved.

---

### CRITICAL: Out-of-Memory / Runner Killed

**Verdict:** CRITICAL — escalate for investigation.

**How to identify:**
- Process exits with code 137 (SIGKILL from OOM killer)
- No Java stack trace
- Failure occurs during the scan step

**Example log excerpt:**
```
##[error]Process completed with exit code 137.
```

**Action:** Investigate whether the analyzer has a memory regression. Do not release until confirmed safe.

---

### IGNORE: Dependency Install Failure

**Verdict:** IGNORE — the analyzed project's dependencies are broken, unrelated to SonarJS.

**How to identify:**
- Failure occurs during the dependency install step (npm/pnpm/yarn install)
- Error messages such as:
  - `ERR_PNPM_OUTDATED_LOCKFILE` — pnpm lockfile out of sync with package.json
  - `npm error notarget No matching version found for <package>` — package version doesn't exist
  - `ERESOLVE unable to resolve dependency tree` — npm peer dependency conflict
  - `Cannot find module` — missing dependency

**Example log excerpt:**
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml
is not up to date with packages/provider-telegram/package.json
##[error]Process completed with exit code 1.
```

**Action:** None. The analyzed project needs to update its dependencies. Not a SonarJS issue.

---

### IGNORE: Vault / CI Infrastructure Failure

**Verdict:** IGNORE — a CI infrastructure issue, unrelated to SonarJS.

**How to identify:**
- Failure occurs during the "Get Vault Secrets" step (before any scan or install)
- No scan output present in the logs
- Vault timeout or authentication error

**Example log excerpt:**
```
##[group]Get Vault Secrets
##[endgroup]
##[error]Process completed with exit code 1.
```

**Action:** None. Retry the workflow or contact the infra team if persistent.

---

### IGNORE: Git Clone / Network Timeout

**Verdict:** IGNORE — a transient network failure, unrelated to SonarJS.

**How to identify:**
- Failure occurs during the repository clone step (before install or scan)
- Log contains: `All 3 attempts failed` or `TIMEOUT after 15 minutes`

**Example log excerpt:**
```
=== Attempt 1 of 3 ===
Cloning into 'workspace'...
Attempt 1 failed: TIMEOUT after 15 minutes
...
All 3 attempts failed
##[error]Process completed with exit code 1.
```

**Action:** None. Re-run the workflow if needed.

---

### NEEDS-MANUAL-REVIEW: Unknown Failure

**Verdict:** NEEDS-MANUAL-REVIEW — cannot be automatically classified.

**How to identify:**
- Does not match any of the above categories
- Exit code is not 1, 3, or 137 from a recognized step
- Stack trace present but unrecognizable origin

**Action:** A human must review the logs manually to determine if this is an analyzer issue.

---

## How to Run the Check

Use the `/peach-check` skill from within the SonarJS repository. It will automatically fetch
the latest run, classify all failures, and print a summary table.
````

**Step 2: Commit**

```bash
git add docs/peach-main-analysis.md
git commit -m "docs: add Peach Main Analysis failure classification guide"
```

---

### Task 2: Create the peach-check skill

**Files:**
- Create: `.claude/skills/peach-check/SKILL.md`

**Step 1: Create the skill directory and file**

Create `.claude/skills/peach-check/SKILL.md` with the following content:

````markdown
---
name: peach-check
description: Fetch the latest Peach Main Analysis run from SonarSource/peachee-js, classify all
  failed jobs as critical analyzer issues or safe-to-ignore infrastructure problems, and print a
  summary table. Use before a SonarJS release to verify analyzer stability.
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

Pick the most recent run with `status == "completed"`. Record its `databaseId` as `RUN_ID`.

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

In a SINGLE message, launch one Agent tool call per failed job. All agents run concurrently.
Each agent receives this prompt (fill in JOB_NAME, JOB_ID, TASK_ID):

```
You are assessing a failed job in the Peach Main Analysis workflow.

Job: JOB_NAME
Job ID: JOB_ID
Task ID: TASK_ID (mark this task complete when done)

Your steps:
1. Read docs/peach-main-analysis.md to understand failure categories and the decision flowchart
2. Download the job logs:
   gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs"
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

Wait for all agents to return. Then print the summary table:

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
````

**Step 2: Commit**

```bash
git add .claude/skills/peach-check/SKILL.md
git commit -m "feat: add peach-check skill for Peach Main Analysis triage"
```

---

### Task 3: Smoke-test the skill

**Step 1: Invoke the skill**

```
/peach-check
```

Verify it:
- Fetches the latest run
- Collects failed jobs
- Launches agents in parallel
- Returns a summary table with verdicts

**Step 2: Spot-check one CRITICAL verdict**

If a CRITICAL job is found, manually inspect its logs to confirm the verdict matches:

```bash
gh api "repos/SonarSource/peachee-js/actions/jobs/JOB_ID/logs" | grep -E "(ERROR|exit code|Exception)"
```

**Step 3: Commit any corrections**

If the knowledge base or skill needed corrections during smoke-testing, commit them:

```bash
git add docs/peach-main-analysis.md .claude/skills/peach-check/SKILL.md
git commit -m "fix: correct peach-check skill based on smoke test"
```
