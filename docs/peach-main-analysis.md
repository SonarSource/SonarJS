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

## SonarJS Sensor Names

The SonarJS plugin registers exactly these sensors. A crash is only a SonarJS concern if the
log shows one of these names in the failing sensor context:

- `JavaScript/TypeScript/CSS analysis` — the main analysis sensor (WebSensor)
- `JavaScript/TypeScript Coverage` — LCOV coverage import
- `Import of TSLint issues` — TSLint report import
- `Import of stylelint issues` — stylelint report import

Any other sensor name (e.g. `Sensor Declarative Rule Engine for Shell`, `Java sensor`,
`Security SonarQube`) belongs to a **different plugin** and is not a SonarJS issue.

### Decision Flowchart

```
1. At which step did the job fail?
   ├─ Pre-scan step (checkout, vault secrets, dependency install) → IGNORE
   ├─ During sonar-scanner execution → go to step 2
   └─ Unclear / no recognizable step → NEEDS-MANUAL-REVIEW

2. What is the scanner exit code?
   ├─ Exit code 3 → read the error message:
   │   ├─ "The folder X does not exist" or "Invalid value of sonar.X" → IGNORE (project misconfiguration)
   │   └─ Java stack trace present → go to step 3
   ├─ Exit code 137 → CRITICAL (out-of-memory, escalate)
   └─ Other exit code → NEEDS-MANUAL-REVIEW

3. Which component crashed?
   ├─ Stack trace is in `ReportPublisher.upload` → IGNORE (Peach server / report upload timeout)
   ├─ Stack trace contains `org.sonar.plugins.javascript` frames but no sensor name → CRITICAL (SonarJS plugin initialization failure)
   ├─ Sensor name is one of the SonarJS sensors listed above → CRITICAL (SonarJS analyzer crash)
   └─ Sensor name is something else (DRE Shell, Java, Security...) → IGNORE (different plugin, not our problem)
```

## Failure Categories

### CRITICAL: SonarJS Plugin Failure

**Verdict:** CRITICAL — must be investigated before any release.

**How to identify:**
- Failure occurs during the SonarScanner execution step (not during install/checkout)
- Scanner exits with code 3
- Java stack trace present in the logs, with frames in `org.sonar.plugins.javascript`
- This includes both sensor-level crashes and plugin initialization failures (where no sensor
  name appears because the plugin failed to load before any sensor ran)
- When this is the root cause of a mass failure, it takes priority over any infrastructure
  explanation

**Detection patterns:**
- Phase 1: `/EXECUTION FAILURE/`, `/Process completed with exit code/` — exit code 3 with no misconfiguration signal escalates to Phase 2
- Phase 2: `/org\.sonar\.plugins\.javascript/` — any match → CRITICAL; `/Sensor /` — confirm the failing sensor is a SonarJS sensor

**Example log excerpt (sensor crash):**
```
Sensor JavaScript/TypeScript/CSS analysis [javascript]
...
ERROR Error during SonarScanner Engine execution
java.lang.IllegalStateException: Analysis failed
  at org.sonar.plugins.javascript.analysis.WebSensor.execute(WebSensor.java:...)
  ...
EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

**Example log excerpt (plugin initialization failure — can cause mass failure):**
```
java.lang.IllegalStateException: Unable to load components interface org.sonar.api.batch.sensor.Sensor
  at org.sonar.plugins.javascript.analysis.JsTsChecks.<init>(JsTsChecks.java:...)
  ...
EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

**Action:** File a bug or investigate the SonarJS analyzer code. Do not release until resolved.

---

### CRITICAL: Out-of-Memory / Runner Killed

**Verdict:** CRITICAL — escalate for investigation.

**How to identify:**
- Process exits with code 137 (SIGKILL from OOM killer)
- No Java stack trace
- Failure occurs during the scan step

**Detection patterns:**
- Phase 1: `/OutOfMemoryError/`, `/Process completed with exit code/` — exit code 137

**Example log excerpt:**
```
##[error]Process completed with exit code 137.
```

**Action:** Investigate whether the analyzer has a memory regression. Do not release until confirmed safe.

---

### IGNORE: Third-Party Sensor Crash

**Verdict:** IGNORE — a different SonarSource plugin crashed, not the SonarJS analyzer.

**How to identify:**
- Failure occurs during the SonarScanner execution step
- Scanner exits with code 3 and a Java stack trace is present
- The failing sensor name is **not** one of the SonarJS sensors listed above
- Common non-SonarJS sensor names seen on Peach:
  - `Sensor Declarative Rule Engine for Shell` — belongs to **sonar-iac**
  - `Sensor Declarative Rule Engine for Terraform` — belongs to **sonar-iac**
  - `Sensor Declarative Rule Engine for CloudFormation` — belongs to **sonar-iac**
  - `Java sensor` — belongs to **sonar-java**
  - Any `Security` sensor — belongs to SonarSource security plugins

**Detection patterns:**
- Phase 1: `/EXECUTION FAILURE/`, `/Process completed with exit code/` — exit code 3 with no misconfiguration signal escalates to Phase 2
- Phase 2: `/Sensor /` — last sensor name is not a SonarJS sensor; `/org\.sonar\.plugins\.javascript/` absent → IGNORE

**Example log excerpt (gutenberg, 2026-03-11):**
```
java.lang.IllegalStateException: DRE analysis failed
  at com.A.A.D.H.execute(Unknown Source)       ← sonar-iac obfuscated class, not SonarJS
  ...
Caused by: java.lang.IllegalArgumentException: 19 is not a valid line offset for pointer.
  File packages/react-native-editor/bin/test-e2e-setup.sh has 18 character(s) at line 21
EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

The class `com.A.A.D.H` is from the sonar-iac plugin (obfuscated). No `org.sonar.plugins.javascript` frame is present — this is not a SonarJS crash.

**Action:** None for the SonarJS team. Optionally notify the team responsible for the failing sensor (e.g. sonar-iac team for DRE Shell failures).

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

**Detection patterns:**
- Phase 1: `/Invalid value of sonar/`, `/does not exist for/`, `/Process completed with exit code/` — exit code 3 with a misconfiguration signal → classify immediately, no Phase 2 needed

**Example log excerpt:**
```
03:01:00.715 ERROR Invalid value of sonar.tests for js:open-swe
03:01:00.744 ERROR The folder 'apps' does not exist for 'js:open-swe' (base directory = ...)
03:01:01.077 INFO  EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

**Action:** None. The analyzed project's sonar-project.properties references a path that no longer exists. Not a SonarJS issue.

---

### IGNORE: Peach Server / Report Upload Timeout

**Verdict:** IGNORE — the Peach server timed out while receiving the analysis report; the analysis itself completed successfully.

**How to identify:**
- Failure occurs after the SonarScanner execution step (analysis finished, report generated)
- Scanner exits with code 3
- Java stack trace originates in `ReportPublisher.upload`, not in any sensor
- Root cause is `java.net.SocketTimeoutException: timeout` during an HTTP POST to `peach.sonarsource.com/api/ce/submit`

**Detection patterns:**
- Phase 1: `/EXECUTION FAILURE/`, `/Process completed with exit code/` — exit code 3 with no misconfiguration signal escalates to Phase 2
- Phase 2: `/org\.sonar\.plugins\.javascript/` absent; `/Sensor /` present (analysis ran) but no SonarJS frame → escalate to Phase 3 to confirm `ReportPublisher.upload` in stack trace

**Example log excerpt (fossflow, 2026-03-13):**
```
java.lang.IllegalStateException: Failed to upload report: Fail to request url:
  https://peach.sonarsource.com/api/ce/submit?projectKey=js%3AFossFLOW...
	at org.sonar.scanner.report.ReportPublisher.upload(ReportPublisher.java:243)
Caused by: java.net.SocketTimeoutException: timeout
	at okhttp3.internal.http2.Http2Stream$StreamTimeout.newTimeoutException(Http2Stream.kt:731)
##[error]Process completed with exit code 3.
```

Multiple jobs failing this way within the same ~2-minute window is a strong indicator that the Peach server was temporarily unavailable or overloaded.

**Action:** None for the SonarJS team. Re-run the workflow if needed; the failures are unrelated to the analyzer.

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

**Detection patterns:**
- Phase 1: `/ERR_PNPM/`, `/ERESOLVE/`, `/ETARGET/`, `/notarget/`, `/Process completed with exit code/` — exit code 1

**Example log excerpt (pnpm lockfile mismatch):**
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml
is not up to date with packages/provider-telegram/package.json
##[error]Process completed with exit code 1.
```

**Example log excerpt (npm version not found — graphql, 2026-03-22):**
```
npm error code ETARGET
npm error notarget No matching version found for eslint@10.1.0.
npm error notarget In most cases you or one of your dependencies are requesting
npm error notarget a package version that doesn't exist.
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

**Detection patterns:**
- Phase 1: `/Process completed with exit code/` — exit code 1; no other Phase 1 pattern matches; "Get Vault Secrets" group visible in surrounding log lines confirms the step

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

**Detection patterns:**
- Phase 1: `/All 3 attempts failed/`, `/Process completed with exit code/` — exit code 1

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

### IGNORE: Peach Server Unreachable (502/503)

**Verdict:** IGNORE — the Peach server was down or overloaded at scan start; the analyzer never ran.

**How to identify:**
- Failure occurs at the very start of the sonar-scanner execution step (server version query)
- Error message: `Failed to query server version: GET https://peach.sonarsource.com/api/server/version failed with HTTP 502 Bad Gateway`
- Scanner exits with code 1
- Typically affects **all or most jobs** in the same run (mass failure pattern)

**Detection patterns:**
- Phase 1: `/502 Bad Gateway/`, `/503 Service Unavailable/`, `/Process completed with exit code/` — exit code 1

**Example log excerpt:**
```
ERROR Failed to query server version: GET https://peach.sonarsource.com/api/server/version failed with HTTP 502 Bad Gateway
INFO  EXECUTION FAILURE
##[error]Process completed with exit code 1.
```

**Action:** None. Re-run the workflow later when the Peach server is back online.

---

### IGNORE: Artifact Expired

**Verdict:** IGNORE — the SonarJS JAR artifact used by the workflow has expired; the analyzer never ran.

**How to identify:**
- Failure occurs during the artifact download step (before any scan)
- Error message: `Artifact has expired (HTTP 410)`
- Scanner exits with code 1

**Detection patterns:**
- Phase 1: `/Artifact has expired/`, `/Process completed with exit code/` — exit code 1

**Example log excerpt:**
```
gh: Artifact has expired (HTTP 410)
##[error]Process completed with exit code 1.
```

**Action:** The workflow needs to be re-triggered with a fresh artifact build. Not a SonarJS analyzer bug.

---

### NEEDS-MANUAL-REVIEW: Unknown Failure

**Verdict:** NEEDS-MANUAL-REVIEW — cannot be automatically classified.

**How to identify:**
- Does not match any of the above categories
- Exit code is not 1, 3, or 137 from a recognized step
- Stack trace present but unrecognizable origin

**Detection patterns:**
- None of the Phase 1 or Phase 2 patterns produce a match that maps to a known category

**Action:** A human must review the logs manually to determine if this is an analyzer issue.

---

## Log Filtering Patterns

These are the canonical sed patterns used by the `/peach-check` skill to triage job logs.
Keeping them here ensures the skill stays in sync with the classification guide.

### Phase 1 — Failure signal detection

Identifies which step failed and what exit code was produced. Run on every failed job.

```bash
sed --sandbox -n '
/Process completed with exit code/p    # universal — exit code value drives the flowchart
/EXECUTION FAILURE/p                   # scanner ran and failed (exit code 3)
/OutOfMemoryError/p                    # OOM / Runner Killed
/502 Bad Gateway/p                     # Peach Server Unreachable (502)
/503 Service Unavailable/p             # Peach Server Unreachable (503)
/Artifact has expired/p                # Artifact Expired
/All 3 attempts failed/p               # Git Clone / Network Timeout
/ERR_PNPM/p                            # Dependency Install Failure (pnpm)
/ERESOLVE/p                            # Dependency Install Failure (npm peer conflict)
/ETARGET/p                             # Dependency Install Failure (npm version not found)
/notarget/p                            # Dependency Install Failure (npm version not found)
/Invalid value of sonar/p              # Project Misconfiguration
/does not exist for/p                  # Project Misconfiguration
' target/peach-logs/JOB_ID.log
```

If Phase 1 shows exit code 3 with `EXECUTION FAILURE` but none of the misconfiguration patterns,
escalate to Phase 2 — a Java stack trace may be present that Phase 1 does not surface.

### Phase 2 — Sensor and stack trace detection

Identifies which sensor was running and whether the SonarJS plugin is involved. Run only for
jobs where Phase 1 showed exit code 3 without a clear misconfiguration signal.

```bash
sed --sandbox -n '
/Sensor /p                             # last sensor name — is it a SonarJS sensor?
/EXECUTION FAILURE/p                   # scanner failure marker
/OutOfMemoryError/p                    # OOM inside scanner
/Process completed with exit code/p    # exit code confirmation
/org\.sonar\.plugins\.javascript/p     # SonarJS plugin frame in stack trace → CRITICAL
' target/peach-logs/JOB_ID.log
```

---

## How to Run the Check

Use the `/peach-check` skill from within the SonarJS repository. It will automatically fetch
the latest run, classify all failures, and print a summary table.
