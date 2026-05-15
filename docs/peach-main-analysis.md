# Peach Main Analysis

The **Peach Main Analysis** is a scheduled GitHub Actions workflow (`main-analysis.yml`) in the
`SonarSource/peachee-js` repository, branch `js-ts-css-html`. It runs nightly, using a matrix
to scan ~250 open-source JavaScript/TypeScript projects against a SonarQube instance (Peach)
using the latest SonarJS analyzer build.

## Why It Matters

Failures in this workflow may indicate bugs in the SonarJS analyzer. Reviewing the results
before a release is essential to ensure the analyzer is stable.

## Failure Classification

Not all failures indicate an analyzer problem. The workflow involves several phases before and
after the actual scan, and failures outside the scanner step are usually unrelated to the
SonarJS analyzer.

## SonarJS Sensor Names

The SonarJS plugin registers exactly these sensors. A crash is only a SonarJS concern if the
log shows one of these names in the failing sensor context:

- `JavaScript/TypeScript/CSS analysis` — the main analysis sensor (WebSensor)
- `JavaScript/TypeScript Coverage` — LCOV coverage import
- `Import of TSLint issues` — TSLint report import
- `Import of stylelint issues` — stylelint report import

Any other sensor name (e.g. `Sensor Declarative Rule Engine for Shell`, `Java sensor`,
`Security SonarQube`) belongs to a **different plugin** and is not a SonarJS issue.

### Last Sensor Wins

When classifying a scanner failure, use the **last sensor that started before the stack trace**
as the owner of the crash.

- If `Sensor JavaScript/TypeScript/CSS analysis [javascript]` is the last active sensor and the
  stack trace contains `org.sonar.plugins.javascript`, treat it as a SonarJS failure.
- If the JavaScript sensor finished successfully and a later non-SonarJS sensor started, the
  later sensor owns the failure even if JavaScript analysis ran earlier in the job.
- Do not blame SonarJS just because the log contains earlier JavaScript sensor lines. The
  failing sensor context matters, not the first sensor that appeared in the job.

Example:

```text
Sensor JavaScript/TypeScript/CSS analysis [javascript] (done)
Sensor JsSecuritySensorV2 [jasmin]
...
java.lang.OutOfMemoryError: Java heap space
```

This is **not** a SonarJS analyzer failure. The last active sensor is `JsSecuritySensorV2
[jasmin]`, so the failure belongs to Jasmin/security.

### Decision Flowchart

```
1. At which step did the job fail?
   ├─ Pre-scan step (checkout, vault secrets, clone, cache, dependency install) → IGNORE
   ├─ During `Analyze project` / sonar-scanner execution → go to step 2
   ├─ Job is `diff-validation-aggregated` → EXCLUDE from analyzed-job counts and findings
   ├─ `Diff Val` / `diff-val` monitoring step → IGNORE
   ├─ After analysis completed (report upload / Diff Val / artifact upload / pages publishing / other post-scan step) → usually IGNORE
   └─ Unclear / no recognizable step → NEEDS-MANUAL-REVIEW

Before classifying from the step name, check whether multiple steps are marked failed.
Use the earliest failed step that actually ran as the phase owner.
If `Analyze project` was skipped, do not classify from later `Report analyzer version` noise.
Also, do not assume that the GitHub Actions step name `Analyze project` means the owning phase is
`analyze`: if the JavaScript sensor already finished and the stack trace later shows
`ReportPublisher.upload` or `/api/ce/submit`, the real owner is `post-scan`.

2. Only now inspect the scanner exit code.
   ├─ Exit code 3 → read the error message:
   │   ├─ "The folder X does not exist" or "Invalid value of sonar.X" → IGNORE (project misconfiguration)
   │   └─ Java stack trace present → go to step 3
   ├─ Exit code 137 → CRITICAL (out-of-memory, escalate)
   └─ Other exit code → NEEDS-MANUAL-REVIEW

3. Which component crashed? Use the last sensor that started before the error.
   ├─ Stack trace is in `ReportPublisher.upload` → IGNORE (Peach server / report upload timeout)
   ├─ Log says `Node.js process running out of memory` or suggests `sonar.javascript.node.maxspace` → CRITICAL (SonarJS bridge Node heap exhausted)
   ├─ Log says `Failed to get response from analysis` and then `Failed to analyze file ...` with `Rule: "sonarjs/Sxxxx"` → CRITICAL (SonarJS rule crash)
   ├─ Stack trace contains `org.sonar.plugins.javascript` frames but no sensor name → CRITICAL (SonarJS plugin initialization failure)
   ├─ Last active sensor is one of the SonarJS sensors listed above → CRITICAL (SonarJS analyzer crash)
   └─ Last active sensor is something else (DRE Shell, Java, Security...) → IGNORE (different plugin, not our problem)
```

Do not classify by exit code before you know the failing phase. For example, exit code `1`
during `npm install` is a dependency/setup problem, not a scanner problem.
Likewise, do not classify from the first matching exit-code line in the log alone: nested commands
can emit intermediate non-fatal `Process completed with exit code 1` lines that the job then
recovers from before the real terminal failure.

## Failure Categories

### IGNORE: Diff Val Monitoring Failure

**Verdict:** IGNORE — the failure happened in differential-validation monitoring, not in project
analysis.

**How to identify:**
- The failing step name contains `Diff Val` or `diff-val`
- Examples:
  - `Setup Diff Val`
  - `Diff Val Snapshot generation`
  - `Diff Val aggregated snapshot generation`
  - `Upload diff-val artifacts`
- These steps run after analysis or as workflow-level post-processing to compare daily snapshots
  for monitoring purposes
- Failures here often come from the same Peach API flakiness seen elsewhere, but they do not say
  anything about SonarJS analyzer correctness
- This category applies to per-project jobs only. The standalone workflow job
  `diff-validation-aggregated` is excluded entirely from analyzed-job counts and detailed findings.

**Detection patterns:**
- Classify from step metadata first; do not require log inspection
- Phase 1 log hints may include `/502 Bad Gateway/`, `/503 Service Unavailable/`,
  `/timeout/`, `/difference is found/`, or non-zero exit codes from diff-val tooling

**Example outcomes:**
```
Diff Val Snapshot generation
Process failed ... SnapshotHttpException: HTTP request failed with error code '502' ...
##[error]Process completed with exit code 1.
```

```
Diff Val aggregated snapshot generation
Application run failed ... ExitDiffAppException: The difference is found for projects: ...
##[error]Process completed with exit code 2.
```

**Action:** None for SonarJS release triage. Ignore and silence these failures in the detailed
review output. If needed, track them separately as Peach monitoring noise. Do not use this
category for `diff-validation-aggregated`; exclude that workflow job entirely instead.

---

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
- Phase 2: `/Failed to get response from analysis/`, `/Failed to analyze file/`, `/Rule: "sonarjs\/S[0-9]+"/` — rule crash inside the JavaScript sensor → CRITICAL

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

**Example log excerpt (protobuf recursion limit exceeded — 2026-04-23, affected 53 projects):**
```
Sensor JavaScript/TypeScript/CSS analysis [javascript]
ERROR Failed to get response from analysis
java.lang.IllegalStateException: The bridge server is unresponsive...
  at org.sonar.plugins.javascript.bridge.BridgeServerImpl.unresponsiveServerException(BridgeServerImpl.java:430)
  at org.sonar.plugins.javascript.bridge.BridgeServerImpl.analyzeProject(BridgeServerImpl.java:395)
  at org.sonar.plugins.javascript.analysis.WebSensor.execute(WebSensor.java:155)
Caused by: io.grpc.StatusRuntimeException: INTERNAL: Invalid protobuf byte sequence
Caused by: com.google.protobuf.InvalidProtocolBufferException:
  Protocol message had too many levels of nesting. May be malicious.
  Use setRecursionLimit() to increase the recursion depth limit.
EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

**Example log excerpt (rule crash inside the JavaScript sensor):**
```
Sensor JavaScript/TypeScript/CSS analysis [javascript]
ERROR Failed to get response from analysis
java.lang.IllegalStateException: Failed to analyze file ...: <rule-specific error>
Occurred while linting ...:<line>
Rule: "sonarjs/S6437"
  at org.sonar.plugins.javascript.analysis.WebSensor$AnalyzeProjectHandler.handleFileResult(...)
EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

The protobuf recursion-limit pattern above occurs when a source file contains a deeply nested AST (e.g. deeply nested arrow
functions or call expressions) that exceeds the default protobuf recursion limit when the Java
side deserializes the gRPC response from the Node.js bridge. The fix is to call
`setRecursionLimit()` with a higher value on the `CodedInputStream` used in
`BridgeServerImpl.analyzeProject`. In the log, an `Artifact has expired (HTTP 410)` line may
appear earlier (exit code 1) — that is pre-scan noise the scanner recovers from; the protobuf
crash is the real terminal failure.

**Action:** File a bug or investigate the SonarJS analyzer code. Do not release until resolved.

---

### CRITICAL: SonarJS Node Heap Exhaustion

**Verdict:** CRITICAL — investigate analyzer memory use before release.

**How to identify:**
- Failure occurs during the SonarScanner execution step
- The last active sensor is `JavaScript/TypeScript/CSS analysis [javascript]`
- The log contains one or more of:
  - `The analysis will stop due to the Node.js process running out of memory`
  - `sonar.javascript.node.maxspace`
  - `sonar.javascript.node.debugMemory`
- The Java stack trace often ends with `WebSocket connection closed abnormally` and
  `Analysis of JS/TS files failed`

**Detection patterns:**
- Phase 2: `/Node\.js process running out of memory/`,
  `/sonar\.javascript\.node\.(maxspace|debugMemory)/`,
  `/org\.sonar\.plugins\.javascript/`

**Example log excerpt (`tape`, 2026-04-07):**
```
Sensor JavaScript/TypeScript/CSS analysis [javascript]
ERROR The analysis will stop due to the Node.js process running out of memory (heap size limit 4288 MB)
ERROR You can see how Node.js heap usage evolves during analysis with "sonar.javascript.node.debugMemory=true"
ERROR Try setting "sonar.javascript.node.maxspace" to a higher value to increase Node.js heap size limit
...
java.lang.IllegalStateException: Analysis of JS/TS files failed
  at org.sonar.plugins.javascript.analysis.WebSensor.execute(WebSensor.java:175)
EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

**Action:** Raise the heap size for the affected project and investigate whether the analyzer
has a memory regression or pathological input pattern.

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
- The **last active** sensor name is **not** one of the SonarJS sensors listed above
- Common non-SonarJS sensor names seen on Peach:
  - `Sensor Declarative Rule Engine for Shell` — belongs to **sonar-iac**
  - `Sensor Declarative Rule Engine for Terraform` — belongs to **sonar-iac**
  - `Sensor Declarative Rule Engine for CloudFormation` — belongs to **sonar-iac**
  - `Java sensor` — belongs to **sonar-java**
  - Any `Security` sensor — belongs to SonarSource security plugins

**Detection patterns:**

- Phase 1: `/EXECUTION FAILURE/`, `/Process completed with exit code/` — exit code 3 with no misconfiguration signal escalates to Phase 2
- Phase 2: `/Sensor /` — last sensor name is not a SonarJS sensor and no later SonarJS sensor appears after it; `/org\.sonar\.plugins\.javascript/` absent → IGNORE

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

**Action:** None for the SonarJS team. Optionally notify the team responsible for the failing sensor (e.g. sonar-iac team for DRE Shell failures). If the project should stay green on Peach, create or update a Peach tracking task.

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

**Action:** No SonarJS release blocker. The analyzed project's sonar-project.properties references a path that no longer exists. Create or update a Peach tracking task if the project should stay green.

---

### IGNORE: Upstream Repository Removed / Inaccessible

**Verdict:** IGNORE — the target project can no longer be fetched from GitHub, so analysis never
started and this is not a SonarJS analyzer issue.

**How to identify:**
- Failure occurs during `Checkout project`
- `Analyze project` is skipped
- The checkout URL points to a repository or owner that is no longer accessible
- The log shows repeated clone retries ending with messages such as:
  - `fatal: could not read Username for 'https://github.com': No such device or address`
  - `All 3 attempts failed`

This can happen when the upstream owner or repository has been removed from GitHub, for example
after abuse or malware takedowns.

**Detection patterns:**
- Phase 1: `/fatal: could not read Username for 'https:\/\/github\.com'/`
- Phase 1: `/All 3 attempts failed/`

**Example log excerpt (`vote-coin-demo`, 2026-04-14):**
```
Checking out vote-coin-demo at ed7b9fd5d9504311598bd05d622fc4244c78848f from https://github.com/scholtz/vote-coin-demo
fatal: could not read Username for 'https://github.com': No such device or address
Attempt 3 failed with exit code 128
All 3 attempts failed
##[error]Process completed with exit code 1.
```

**Action:** No SonarJS release blocker. Remove or replace the Peach project entry, or track it as a
Peach maintenance issue if the matrix should remain green.

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
- Phase 2: `/ReportPublisher\.upload/`, `/api\/ce\/submit/`, or `/SocketTimeoutException/`
- Phase 2: `/org\.sonar\.plugins\.javascript/` absent; `/Sensor /` present and the SonarJS sensor already finished → IGNORE

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

This can still appear under the GitHub step name `Analyze project`. If
`Sensor JavaScript/TypeScript/CSS analysis [javascript] (done)` appears before the stack trace,
the analysis completed and the job should be classified as `post-scan`, not as an analyzer crash.

**Action:** None for the SonarJS team. Re-run the workflow if needed; the failures are unrelated to the analyzer.

---

### IGNORE: Diff Val Artifact / Aggregation Failure

**Verdict:** IGNORE — the scan completed, but the post-analysis Diff Val workflow failed.

**How to identify:**
- Project jobs complete `Analyze project` successfully and fail later in `Setup Diff Val`
- The failing Diff Val setup step shows a missing artifact download such as:
  - `Download snapshot-app-<VERSION>.tar`
  - `curl: (22) The requested URL returned error: 404`
- These jobs typically exit with code 22
- The downstream `diff-validation-aggregated` job may then fail because no project produced a
  successful Diff Val result
- Typical downstream signals are:
  - `No successful diff-val projects found`
  - `tar: diff-val-download/diff-app-<VERSION>.tar: Cannot open: No such file or directory`
  - `mv: cannot stat '../diff_aggregated_*.html': No such file or directory`

**Detection patterns:**
- Phase 1: `/Download snapshot-app-/`, `/curl: (22) The requested URL returned error: 404/`,
  `/No successful diff-val projects found/`, `/diff-val-download\/diff-app-/` — post-scan
  Diff Val artifact failure

**Example log excerpt (mass failure, 2026-05-01):**
```
Analyze project
...
Run SonarSource/differential-validation-actions/setup-diff-val@master
Downloading snapshot and diff app
Download snapshot-app-1.10.0.3931.tar
curl: (22) The requested URL returned error: 404
##[error]Process completed with exit code 22.
```

**Example aggregated-job excerpt (downstream effect):**
```
No successful diff-val projects found
##[error]Process completed with exit code 1.
tar: diff-val-download/diff-app-1.10.0.3931.tar: Cannot open: No such file or directory
##[error]Process completed with exit code 2.
```

If most or all project jobs fail this way in the same run, treat it as a shared Diff Val
artifact publication problem, not a SonarJS analyzer regression.

**Action:** Safe for SonarJS release triage. Re-run after the Diff Val artifact issue is fixed
or notify the Peach / Diff Val owners if it persists.

---

### IGNORE: Dependency Install Failure

**Verdict:** IGNORE — the analyzed project's dependencies are broken, unrelated to SonarJS.

**How to identify:**

- Failure occurs during the dependency install step (npm/pnpm/yarn install)
- The `Analyze project` step never starts
- Error messages such as:
  - `ERR_PNPM_OUTDATED_LOCKFILE` — pnpm lockfile out of sync with package.json
  - `npm error notarget No matching version found for <package>` — package version doesn't exist
  - `ERESOLVE unable to resolve dependency tree` — npm peer dependency conflict
  - `Cannot find module` — missing dependency

**Detection patterns:**
- Phase 1: `/ERR_PNPM/`, `/ERESOLVE/`, `/ETARGET/`, `/notarget/`, `/Process completed with exit code/` — exit code 1
- Confirm from surrounding log lines that the failure is in the install step and not in `Analyze project`

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

**Action:** No SonarJS release blocker. The analyzed project needs to update its dependencies. Create or update a Peach tracking task if the project should stay green.

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

### IGNORE: Scanner Bootstrap / Plugin Download Timeout

**Verdict:** IGNORE — the scanner timed out while provisioning its engine or downloading plugins
from Peach; the analyzer never started.

**How to identify:**
- Failure occurs during the `Analyze project` step
- No `Sensor ...` line appears before the stack trace, so no analyzer sensor owned the failure
- Error message contains one of:
  - `Fail to download plugin [javascript]`
  - `Call to URL [https://peach.sonarsource.com/api/v2/analysis/engine] failed`
  - `ScannerEngineLauncherFactory` or `PluginFiles.downloadBinaryTo`
  - `SocketTimeoutException: timeout`, `Connection timed out`, or `failed: closed`
- Scanner exits with code 1 or 3
- No `org.sonar.plugins.javascript` frame is present from the plugin itself; the failure is in
  scanner bootstrap / download code, not a SonarJS sensor

**Detection patterns:**
- Phase 1: `/Process completed with exit code/` — exit code 1 or 3 inside `Analyze project`
- Phase 2/3: no `/Sensor /` match before the stack trace, plus bootstrap markers such as
  `/Fail to download plugin \[javascript\]/`, `/api\/v2\/analysis\/engine/`,
  `/ScannerEngineLauncherFactory/`, or `/PluginFiles\.downloadBinaryTo/`

**Example log excerpt (`strapi`, 2026-04-13):**
```
ERROR Error during SonarScanner Engine execution
java.lang.IllegalStateException: Fail to download plugin [javascript] into ...
Caused by: java.net.SocketTimeoutException: timeout
INFO  EXECUTION FAILURE
##[error]Process completed with exit code 3.
```

**Example log excerpt (`open-lovable`, 2026-04-13):**
```
ERROR Error during SonarScanner CLI execution
java.lang.IllegalStateException: Call to URL [https://peach.sonarsource.com/api/v2/analysis/engine] failed: closed
Caused by: java.io.IOException: Connection timed out
##[error]Process completed with exit code 1.
```

**Action:** None for the SonarJS team. Re-run the workflow if needed; if this pattern becomes
frequent, treat it as Peach / scanner bootstrap infrastructure noise rather than an analyzer
regression.

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
/\[36;1m/b                             # skip GitHub Actions script-preview lines (ANSI-colored)
/Process completed with exit code/p    # universal — exit code value drives the flowchart
/EXECUTION FAILURE/p                   # scanner ran and failed (exit code 3)
/OutOfMemoryError/p                    # OOM / Runner Killed
/502 Bad Gateway/p                     # Peach Server Unreachable (502)
/503 Service Unavailable/p             # Peach Server Unreachable (503)
/Diff Val/p                           # Diff Val monitoring failure
/diff-val/p                           # Diff Val monitoring failure
/Fail to download plugin \[javascript\]/p  # Scanner Bootstrap / Plugin Download Timeout
/api\/v2\/analysis\/engine/p          # Scanner Bootstrap / Plugin Download Timeout
/Artifact has expired/p                # Artifact Expired
/All 3 attempts failed/p               # Git Clone / Network Timeout
/Download snapshot-app-/p             # Diff Val artifact missing in post-scan setup
/curl: (22) The requested URL returned error: 404/p
/No successful diff-val projects found/p
/diff-val-download\/diff-app-/p
/ERR_PNPM/p                            # Dependency Install Failure (pnpm)
/ERESOLVE/p                            # Dependency Install Failure (npm peer conflict)
/ETARGET/p                             # Dependency Install Failure (npm version not found)
/notarget/p                            # Dependency Install Failure (npm version not found)
/Invalid value of sonar/p              # Project Misconfiguration
/does not exist for/p                  # Project Misconfiguration
/SocketTimeoutException/p              # Peach report upload timeout (post-scan)
/ReportPublisher\.upload/p             # Peach report upload timeout (post-scan)
' target/peach-logs/JOB_ID.log
```

If Phase 1 shows exit code 3 with `EXECUTION FAILURE` but none of the misconfiguration patterns,
escalate to Phase 2 — a Java stack trace may be present that Phase 1 does not surface.
Do not assume the first printed exit code is the terminal failure. Logs may contain earlier
non-fatal subcommand failures such as `gh: Artifact has expired (HTTP 410)` followed by
`Process completed with exit code 1`, even though the job later proceeds to a different real
failure.

### Phase 2 — Sensor and stack trace detection

Identifies which sensor was running and whether the SonarJS plugin is involved. Run only for
jobs where Phase 1 showed exit code 3 without a clear misconfiguration signal. Apply the
**last sensor wins** rule: the last sensor that started before the error owns the failure unless
the stack trace proves a later phase such as `ReportPublisher.upload`.

```bash
sed --sandbox -n '
/\[36;1m/b                             # skip GitHub Actions script-preview lines (ANSI-colored)
/Sensor /p                             # last sensor name — is it a SonarJS sensor?
/EXECUTION FAILURE/p                   # scanner failure marker
/OutOfMemoryError/p                    # OOM inside scanner
/Node\.js process running out of memory/p   # SonarJS bridge Node heap exhaustion
/sonar\.javascript\.node\.maxspace/p        # SonarJS heap tuning hint
/sonar\.javascript\.node\.debugMemory/p     # SonarJS memory debugging hint
/ReportPublisher\.upload/p            # Peach report-upload timeout / post-scan failure
/api\/ce\/submit/p                    # Peach report submission endpoint
/SocketTimeoutException/p             # timeout during report upload
/Process completed with exit code/p    # exit code confirmation
/org\.sonar\.plugins\.javascript/p     # SonarJS plugin frame in stack trace → CRITICAL
' target/peach-logs/JOB_ID.log
```

This surfaces both the last sensor that ran and any `org.sonar.plugins.javascript` frames in the
stack trace, plus the explicit Node-heap hints used by the `tape` failure pattern and the
post-scan report-upload timeout pattern.

---

## Output Guidance

When summarizing a run for SonarJS release triage:

- Treat Diff Val / `diff-validation-aggregated` failures as silenced `IGNORE` items
- Do not emit one detailed line per ignored Diff Val failure unless they are the only failures
- Prefer a short roll-up note such as `Ignored 4 Diff Val monitoring failures`
- If every failed job is either a Diff Val monitoring failure or another `IGNORE` category, the
  release verdict is `SAFE`

---

## How to Run the Check

Use the `/peach-check` skill from within the SonarJS repository. It will automatically fetch
the latest run, classify all failures, and print a summary table.
