# Peach Check Skill — Design

**Date:** 2026-03-11

## Overview

Create a `/peach-check` skill for the SonarJS project that automates analysis of the latest
Peach Main Analysis GitHub Actions run. The skill fetches failed jobs, classifies each failure
as a critical analyzer problem or a safe-to-ignore infrastructure/project issue, and produces
a summary table.

This check is particularly important before considering a release of the SonarJS analyzer.

## Context

The Peach Main Analysis is a scheduled GitHub Actions workflow (`main-analysis.yml`) in the
`SonarSource/peachee-js` repository on branch `js-ts-css-html`. It runs ~250 matrix jobs,
each scanning a different open-source JS/TS project against a SonarQube instance (Peach)
using the latest SonarJS analyzer build.

## Files to Create

1. **`docs/peach-main-analysis.md`** — knowledge base document with failure classification
   guide (human reference + AI agent reference)
2. **`.claude/skills/peach-check/SKILL.md`** — the skill definition

## Architecture

### Two-phase parallel approach

**Phase 1 — Orchestrator agent**
- Fetch the most recent completed run of `main-analysis.yml` on `js-ts-css-html`
- Paginate all jobs (3 pages × 100) from `SonarSource/peachee-js`, filter `conclusion == "failure"`
- If no failures: print "All jobs passed ✓" and exit
- For each failed job: create a `TaskCreate` entry (`Assess peach failure: <job-name>`)
- Launch one `Agent` tool call per failed job in parallel (single message, multiple tool uses)

**Phase 2 — Per-job assessment agent** (one per failure, all run concurrently)
- Download job logs via `gh api repos/SonarSource/peachee-js/actions/jobs/<id>/logs`
- Read `docs/peach-main-analysis.md` for the classification guide
- Classify using the decision flowchart
- Mark task complete with structured assessment:
  - **Job**: name
  - **Verdict**: CRITICAL / IGNORE / NEEDS-MANUAL-REVIEW
  - **Category**: e.g. "Analyzer crash"
  - **Evidence**: key log lines

**Final output**
Summary table printed to the user:
```
| Job        | Verdict  | Category            | Evidence                              |
|------------|----------|---------------------|---------------------------------------|
| gutenberg  | CRITICAL | Analyzer crash      | IllegalArgumentException: invalid ... |
| builderbot | IGNORE   | Dep install failure | ERR_PNPM_OUTDATED_LOCKFILE            |
```

## Knowledge Base: Failure Categories

| Category | How to identify | Verdict |
|---|---|---|
| Analyzer crash | Scanner exits with code 3; Java stack trace with `DRE analysis failed`, `IllegalArgumentException`, `IllegalStateException`; failure during scan step | CRITICAL |
| OOM / runner killed | Exit code 137; process killed with no stack trace during scan | CRITICAL (escalate) |
| Dependency install failure | Fails during install step; `ERR_PNPM_OUTDATED_LOCKFILE`, `ETARGET: No matching version found` | IGNORE |
| Vault / CI infrastructure | Fails during "Get Vault Secrets" step; no scan output | IGNORE |
| Git clone / network timeout | "All 3 attempts failed: TIMEOUT after 15 minutes" in clone step | IGNORE |
| Unknown | Doesn't match any category above | NEEDS-MANUAL-REVIEW |

## Decision Flowchart

1. At which step did the job fail?
   - Pre-scan (checkout, vault, install) → **IGNORE** (note the category)
   - During scan (sonar-scanner execution) → continue to step 2
   - Unknown / no clear step → **NEEDS-MANUAL-REVIEW**
2. What is the scanner exit code?
   - Exit code 3 → **CRITICAL** (analyzer crash)
   - Exit code 137 → **CRITICAL** (OOM)
   - Other → inspect stack trace; if Java exception from SonarJS code → **CRITICAL**, else **NEEDS-MANUAL-REVIEW**

## Skill Invocation

```
/peach-check [run-id]
```

- Without `run-id`: analyses the latest completed run
- With `run-id`: analyses a specific run (useful for retrospective checks)

## No External Skill Dependencies

The skill is self-contained. Parallel dispatch is described inline (launch all per-job agents
concurrently using the `Agent` tool in a single message) — no dependency on
`dispatching-parallel-agents` or any other external skill.
