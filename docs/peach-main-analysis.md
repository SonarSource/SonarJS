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
   ├─ Exit code 3 → read the error message:
   │   ├─ Java stack trace (IllegalArgumentException, IllegalStateException, DRE) → CRITICAL (analyzer crash)
   │   └─ "The folder X does not exist" or "Invalid value of sonar.X" → IGNORE (project misconfiguration)
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

### IGNORE: Project Misconfiguration

**Verdict:** IGNORE — the analyzed project's sonar-project.properties is misconfigured, unrelated to SonarJS.

**How to identify:**
- Failure occurs during the SonarScanner execution step
- Scanner exits with code 3 (same as an analyzer crash — read the error message carefully)
- Error message contains phrases like:
  - `The folder 'X' does not exist for 'Y'`
  - `Invalid value of sonar.tests` or `Invalid value of sonar.sources`
  - `is not a valid` combined with a project path or configuration property

**Example log excerpt:**
```
03:01:00.715 ERROR Invalid value of sonar.tests for js:open-swe
03:01:00.744 ERROR The folder 'apps' does not exist for 'js:open-swe' (base directory = ...)
03:01:01.077 INFO  EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

**Action:** None. The analyzed project's sonar-project.properties references a path that no longer exists. Not a SonarJS issue.

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
