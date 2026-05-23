# Peach Local Scan

Use this skill when the user wants to validate a SonarJS analyzer against one or more named Peach
projects, or every project defined in `projects.json`, with Nigel local SonarQube.

Important architecture note:

- The host `sonar-scanner` binary is not what gets patched.
- JavaScript analysis code comes from the analyzer deployed by the target SonarQube instance.
- A clean SonarQube startup begins with the released analyzer shipped by the base image.
- A running local `sonarqube` container may still be locally mutated from an earlier debugging
  session. Never assume the currently running container is stock; inspect it first.
- When the user needs exact local-worktree validation, patch the local SonarQube analyzer for the
  duration of the scan and then restore the previous state before finishing the task.
- Treat `.claude/skills/peach-local-scan/manage-local-analyzer.sh` as the canonical helper for
  analyzer inspection, snapshot, patch, and restore.
- Treat `.claude/skills/peach-local-scan/scan-report.js` as the canonical helper for initializing
  and updating the resumable scan report under `target/peach-local-scan/`.

This skill is intentionally narrow:

- Host-based scanner only.
- Always scan against `http://localhost:9000`.
- Always poll SonarQube until compute-engine processing completes, then fetch the currently raised
  issues after each successful scan.
- Never fall back to `https://peach.sonarsource.com/`.
- Never ask the user for an explicit analyzer jar path.

## Inputs And Reuse

Before asking the user for any scan inputs, check whether the current SonarJS worktree already has
an in-flight Peach local scan report. This skill should prefer the persisted run state over asking
the same setup questions again.

Normalize the report path up front:

```bash
SCAN_REPORT_JSON="target/peach-local-scan/peach-local-scan.json"

if [[ -f target/peach-local-scan/scan-report.json && ! -f "$SCAN_REPORT_JSON" ]]; then
  node .claude/skills/peach-local-scan/scan-report.js migrate target/peach-local-scan
fi
```

If `$SCAN_REPORT_JSON` exists:

- Inspect it before asking for `PEACHEE_ROOT`, `NIGEL_ROOT`, project selection, or rebuild choice.
- Treat the report as the source of truth for the stored run inputs:
  - `.options.peacheeRoot`
  - `.options.nigelRoot`
  - `.options.rebuildAnalyzer`
  - `.options.patchLocalAnalyzer`
  - `.projectOrder`
- If the report status is not `completed`, ask only whether to **continue** or **restart**.
- If the user chooses `continue`, reuse the stored report values exactly as-is. Do not re-ask the
  initial setup questions and do not replace them with conflicting values volunteered later in the
  turn.
- If the user chooses `restart`, default to the same stored values and project order from the
  report unless the user explicitly says they want to change one of them.
- If the report status is `completed`, tell the user the previous run already finished and ask only
  whether they want to rerun with the stored values.

If no resumable report exists, reuse values already established earlier in the current
conversation if they still validate on disk:

- `PEACHEE_ROOT`: must contain `projects.json`
- `NIGEL_ROOT`: must contain `start-services.sh`
- project selection
- rebuild choice

If any of those are missing or invalid and there is no resumable report to reuse, ask only for the
missing values:

- path to the `peachee-js` checkout
- path to the Nigel checkout
- one or more Peach project names, or confirmation that every project in `projects.json` should be
  scanned
- whether to rebuild the analyzer before scanning

Rules:

- Do not assume default paths.
- Do not persist paths outside the current conversation.
- Do not ask for an existing jar path; the only question is whether to rebuild.
- If the user asks to scan all projects, derive the project list directly from `projects.json`
  instead of asking them to enumerate names.
- Validate every requested or expanded project name against `projects.json` before scanning.
- When continuing an existing report, prefer stored report values over re-asking or recomputing the
  initial inputs.

## Outputs

Write per-project artifacts under:

```text
target/peach-local-scan/
  peach-local-scan.json
  peach-local-scan.md
target/peach-local-scan/<project>/
  report-task.txt
  scan.log
  issues.json
target/peach-local-scan/sonarqube-analyzer-state/
  files/*
```

If you install dependencies for a freshly checked out project, keep that log in the same
directory as `install.log`.

Treat `peach-local-scan.json` as the source of truth for resume decisions and analyzer snapshot
metadata, and `peach-local-scan.md` as the human-readable progress snapshot. Both files must
exist before patching the analyzer or scanning the first project.

## Workflow

### 1. Resolve The Local Analyzer Jar When Needed

If the user wants a rebuild, or if later steps determine that an external jar install is needed:

1. Read `.claude/skills/build/SKILL.md`.
2. Follow that build skill from the SonarJS repository root until the plugin jar exists.
3. Do not restate or fork the build instructions here.

When you need a local jar, resolve the newest local analyzer jar from the current SonarJS
worktree:

```bash
find sonar-plugin/sonar-javascript-plugin/target \
  -maxdepth 1 \
  -type f \
  -name 'sonar-javascript-plugin-*-multi.jar' \
  | sort \
  | tail -1
```

If the current task requires a local jar and that command returns nothing, stop and report that
no local SonarJS analyzer jar is available.

### 2. Start Or Validate Nigel Local SonarQube

Run from the Nigel repository root provided by the user:

```bash
./start-services.sh
```

Use `./start-services.sh --local` only when the user explicitly needs to skip the AWS-backed
proxy base image resolution.

Wait for SonarQube to report `UP` on the host:

```bash
curl -sf http://localhost:9000/api/system/status
```

If startup is slow, inspect:

```bash
docker logs sonarqube
```

Read credentials from the files written by Nigel bootstrap:

```bash
SONAR_HOST_URL=http://localhost:9000
SONAR_TOKEN="$(tr -d '\r\n' < ~/.vibe-bot-credentials/.sonarqube/token)"
SONAR_ADMIN_PASSWORD="$(tr -d '\r\n' < ~/.vibe-bot-credentials/.sonarqube/admin-password)"
```

Use the saved token for all API calls and scans. Do not assume `admin/admin`.

### 3. Inspect The Current Analyzer State

After SonarQube is `UP`, inspect the current JavaScript analyzer state before deciding anything:

```bash
bash .claude/skills/peach-local-scan/manage-local-analyzer.sh status
```

Interpret the result with these rules:

- If the current analyzer already reports a snapshot build, treat the running local container as
  previously patched.
- If the user wants a clean baseline and the status output shows a locally patched analyzer,
  recreate local services with `./start-services.sh` before scanning.
- If the user wants exact local-worktree validation, patch the local SonarQube analyzer only for
  this run, and restore it afterward.

Initialize the report flag before deciding whether to patch:

```bash
PATCH_LOCAL_ANALYZER=false
```

### 4. Resolve Project Selection Then Initialize Or Reuse The Run Report

Normalize the run-level report locations before asking for setup inputs or resolving project
selection:

```bash
SCAN_REPORT_JSON="target/peach-local-scan/peach-local-scan.json"
SCAN_REPORT_MD="target/peach-local-scan/peach-local-scan.md"
ANALYZER_STATE_DIR="target/peach-local-scan/sonarqube-analyzer-state"
```

If the artifact root still uses the legacy report names, migrate it before inspecting or resuming:

```bash
if [[ -f target/peach-local-scan/scan-report.json && ! -f "$SCAN_REPORT_JSON" ]]; then
  node .claude/skills/peach-local-scan/scan-report.js migrate target/peach-local-scan
fi
```

That migration renames the report files to `peach-local-scan.*`, upgrades the JSON schema, and
merges any legacy `container.txt` / `snapshot.tsv` metadata into the main report.

If `$SCAN_REPORT_JSON` already exists, inspect it before asking for initial scan inputs:

```bash
sed -n '1,20p' "$SCAN_REPORT_MD"
jq '{status, currentProject, progress, options, projectOrder}' "$SCAN_REPORT_JSON"
```

Interpret an existing report like this:

- If the report status is `completed`, tell the user the previous run already finished and do not
  rescan unless they explicitly ask to rerun.
- If the report status is anything else, ask only whether to continue from that report or restart.
- If the report still shows a project with status `running`, treat that project as interrupted and
  re-run it when continuing.
- If the user chooses `continue`, reuse `.options` from the report as the active input set for this
  turn.
- If the user chooses `restart`, reuse the stored report values by default and only ask follow-up
  questions if the user explicitly wants to change one of them.

Hydrate stored inputs from the report like this:

```bash
PEACHEE_ROOT="$(jq -r '.options.peacheeRoot' "$SCAN_REPORT_JSON")"
NIGEL_ROOT="$(jq -r '.options.nigelRoot' "$SCAN_REPORT_JSON")"
REBUILD_ANALYZER="$(jq -r '.options.rebuildAnalyzer' "$SCAN_REPORT_JSON")"
PATCH_LOCAL_ANALYZER="$(jq -r '.options.patchLocalAnalyzer' "$SCAN_REPORT_JSON")"
```

If the user chooses to continue, derive the remaining project list from the existing report in
stored order:

```bash
mapfile -t PROJECTS < <(
  jq -r '.projects[] | select(.status != "succeeded" and .status != "skipped") | .name' \
    "$SCAN_REPORT_JSON"
)
```

If the user chooses to restart from an existing report and did not explicitly change the selection,
reuse the original stored project order:

```bash
mapfile -t PROJECTS < <(jq -r '.projectOrder[]' "$SCAN_REPORT_JSON")
```

Only when no existing report is being reused should you resolve the current user's project
selection from `projects.json`.

Project-selection rules:

- If the user named specific projects, preserve that order in `PROJECTS`.
- If the user asked for all projects, expand every entry from `projects.json` without filtering.

For an all-project scan, resolve the list like this:

```bash
mapfile -t PROJECTS < <(jq -r 'keys_unsorted[]' projects.json)
```

If that expansion yields no projects, stop and report that `projects.json` did not define any
Peach projects to scan.

Normalize the rebuild choice into a shell boolean string before initializing the report:

```bash
REBUILD_ANALYZER=true   # if the user asked for a rebuild
REBUILD_ANALYZER=false  # otherwise
```

If the user chooses to start from scratch, recreate the report placeholders with `--force`:

```bash
node .claude/skills/peach-local-scan/scan-report.js init --force \
  "$SCAN_REPORT_JSON" \
  "$PEACHEE_ROOT" \
  "$NIGEL_ROOT" \
  "$REBUILD_ANALYZER" \
  "$PATCH_LOCAL_ANALYZER" \
  "${PROJECTS[@]}"
```

If there is no existing report, initialize it before scanning the first project:

```bash
node .claude/skills/peach-local-scan/scan-report.js init \
  "$SCAN_REPORT_JSON" \
  "$PEACHEE_ROOT" \
  "$NIGEL_ROOT" \
  "$REBUILD_ANALYZER" \
  "$PATCH_LOCAL_ANALYZER" \
  "${PROJECTS[@]}"
```

The report must exist before patching or scanning begins so every selected project has a
placeholder entry and `.analyzerState` has a single durable home. The Markdown header at the top
of `peach-local-scan.md` is the quick answer to "where is this run right now?".

### 5. Patch The Local SonarQube Analyzer Only When Required

If the user wants exact local-worktree validation, snapshot the current analyzer state, register a
restore trap, and then patch the running SonarQube analyzer:

```bash
PATCH_LOCAL_ANALYZER=true
PATCHED_ANALYZER=0

cleanup_analyzer() {
  if [[ "${PATCHED_ANALYZER:-0}" -eq 1 ]]; then
    bash .claude/skills/peach-local-scan/manage-local-analyzer.sh restore "$ANALYZER_STATE_DIR"
  fi
}

trap cleanup_analyzer EXIT
bash .claude/skills/peach-local-scan/manage-local-analyzer.sh snapshot "$ANALYZER_STATE_DIR"
bash .claude/skills/peach-local-scan/manage-local-analyzer.sh patch "$ANALYZER_JAR" "$ANALYZER_STATE_DIR"
PATCHED_ANALYZER=1
```

Why this helper exists:

- Current SonarQube versions can fail on duplicate JavaScript plugin keys if you blindly add a
  second jar in `extensions/plugins`.
- The helper snapshots the current analyzer state first, then records that snapshot in
  `peach-local-scan.json`, then patches the active analyzer jar in the running container, and
  finally restores the previous state when requested.
- If a migrated report still carries analyzer metadata from an older container instance, `patch`
  refreshes that snapshot against the current container before installing the local jar.

If you discover a previously patched container but do **not** have a snapshot to restore from,
recreate the SonarQube container with `./start-services.sh`. The built-in analyzer jar lives in
the container filesystem, not in the mounted `extensions` volume, so recreating the container
discards the mutation.

### 6. Prepare The Root Scanner Installation

Run from `PEACHEE_ROOT`.

The root scanner used by Peach lives at `node_modules/.bin/sonar-scanner`. If it is missing,
install the root dependency exactly like the Peach workflow does:

```bash
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
```

### 7. Process Projects Serially And Update The Report Around Each Attempt

Apply the per-project steps below inside a serial loop such as:

```bash
for PROJECT in "${PROJECTS[@]}"; do
  # run the per-project workflow below
done
```

For each project:

1. Resolve the project metadata from `projects.json`.
2. Ensure the project workspace exists.
3. Copy `sonar-project.properties` into the workspace.
4. Install dependencies only if the workspace had to be freshly created and the project defines
   an install mode.
5. Ensure the local SonarQube project exists.
6. Mark the project as running in the scan report.
7. Run the scan with debug-friendly settings.
8. Copy `report-task.txt` into the artifact directory.
9. Poll SonarQube until the submitted analysis report is processed, then fetch the currently raised
   issues.
10. Mark the project as succeeded or failed in the report before moving on.

Use these values:

```bash
PROJECT_KEY="$(grep -E '^sonar\.projectKey=' "$PROJECT/sonar-project.properties" | head -1 | cut -d= -f2-)"
INSTALL_MODE="$(jq -r --arg p "$PROJECT" '.[$p].install // empty' projects.json)"
JAVA_OPTS="$(jq -r --arg p "$PROJECT" '.[$p].java_opts // empty' projects.json)"
ARTIFACT_DIR="target/peach-local-scan/$PROJECT"
WORKSPACE="$PROJECT/workspace"
ARTIFACT_REPORT_TASK_PATH="$ARTIFACT_DIR/report-task.txt"
```

Validate the project name before doing anything else:

```bash
jq -e --arg p "$PROJECT" 'has($p)' projects.json >/dev/null
```

Create the artifact directory before teeing any logs:

```bash
mkdir -p "$ARTIFACT_DIR"
```

Create the workspace only when needed:

```bash
if [ ! -d "$WORKSPACE" ]; then
  bash scripts/checkout-project.sh "$PROJECT"
fi
```

Run that from `PEACHEE_ROOT`. If checkout creates the workspace during this run, remember that
the workspace is fresh and may need dependency installation.

Copy the project properties into the workspace before scanning:

```bash
cp "$PROJECT/sonar-project.properties" "$WORKSPACE/sonar-project.properties"
```

If the workspace was freshly created and `INSTALL_MODE` is set, install dependencies in
`$WORKSPACE` and tee the log into `$ARTIFACT_DIR/install.log`:

- `npm`:

  ```bash
  npm install --ignore-scripts --prefer-offline 2>&1 | tee "$ARTIFACT_DIR/install.log"
  ```

- `npm-legacy`:

  ```bash
  npm install --ignore-scripts --legacy-peer-deps --prefer-offline 2>&1 | tee "$ARTIFACT_DIR/install.log"
  ```

- `pnpm`:

  ```bash
  pnpm install --ignore-scripts --prefer-offline 2>&1 | tee "$ARTIFACT_DIR/install.log"
  ```

Ensure the local SonarQube project exists before scanning. Query first, then create only when
missing:

```bash
curl -sf -u "$SONAR_TOKEN:" --get \
  "$SONAR_HOST_URL/api/projects/search" \
  --data-urlencode "projects=$PROJECT_KEY"
```

Treat the project as already present only when the response confirms at least one matching
component.

If the search result does not contain the project, create it:

```bash
curl -sf -u "$SONAR_TOKEN:" -X POST \
  "$SONAR_HOST_URL/api/projects/create" \
  --data-urlencode "project=$PROJECT_KEY" \
  --data-urlencode "name=$PROJECT"
```

Immediately before the scan attempt, mark the project as running in the report:

```bash
node .claude/skills/peach-local-scan/scan-report.js project-start \
  "$SCAN_REPORT_JSON" \
  "$PROJECT" \
  "$PROJECT_KEY" \
  "$ARTIFACT_DIR"
```

Once `project-start` has run, never leave the report stale:

- If setup, install, or scanner execution fails, record a concise failure summary with
  `project-failure`.
- If CE polling or issue fetching fails, record that failure before moving on or stopping.
- Only call `project-success` after `issues.json` exists.

### 8. Run The Host-Based Scan, Copy Report Metadata, Then Fetch Raised Issues

Still from `PEACHEE_ROOT`, run the scanner from the host shell. Do not run the scanner in a
container for this skill. Again: you are not patching `node_modules/.bin/sonar-scanner`; you
are choosing which analyzer SonarQube serves to that scanner.

If `JAVA_OPTS` is non-empty, export it through `SONAR_SCANNER_OPTS`. Otherwise leave
`SONAR_SCANNER_OPTS` unset:

```bash
if [ -n "$JAVA_OPTS" ]; then
  export SONAR_SCANNER_OPTS="$JAVA_OPTS"
else
  unset SONAR_SCANNER_OPTS
fi
```

Use the Peach-style scan shape plus stronger diagnostics:

```bash
SONARJS_NODE_DEBUG_MEMORY=true \
SONAR_HOST_URL="$SONAR_HOST_URL" \
SONAR_TOKEN="$SONAR_TOKEN" \
./node_modules/.bin/sonar-scanner \
  -X \
  -Dsonar.verbose=true \
  -Dsonar.log.level=TRACE \
  -Dsonar.projectBaseDir="$WORKSPACE" \
  -Dsonar.projectKey="$PROJECT_KEY" \
  -Dsonar.cpd.exclusions=** \
  -Dsonar.java.file.suffixes=- \
  -Dsonar.c.file.suffixes=- \
  -Dsonar.cpp.file.suffixes=- \
  -Dsonar.internal.analysis.failFast=true \
  -Dsonar.objc.file.suffixes=- \
  -Dsonar.security.truncateLargeFlows=false \
  -Dsonar.scanner.keepReport=true \
  -Dsonar.scm.disabled=true \
  -Dsonar.branch.autoconfig.disabled=true \
  2>&1 | tee "$ARTIFACT_DIR/scan.log"
```

This workflow targets only the Nigel local SonarQube instance. It does not send results to
`peach.sonarsource.com`.

The scanner writes report metadata to:

```bash
REPORT_TASK_PATH="$WORKSPACE/.scannerwork/report-task.txt"
cp "$REPORT_TASK_PATH" "$ARTIFACT_REPORT_TASK_PATH"
```

That copied `report-task.txt` is the durable compute-engine metadata artifact for the project.

After each successful scan, wait for SonarQube compute-engine completion and then fetch the
currently raised issues into the project artifact directory:

```bash
node .claude/skills/peach-local-scan/fetch-local-issues.js \
  "$PROJECT_KEY" \
  "$ARTIFACT_DIR/issues.json" \
  "$ARTIFACT_REPORT_TASK_PATH"
```

This helper polls `/api/ce/task` until the submitted analysis reaches `SUCCESS`, fails fast on
`FAILED` or `CANCELED`, and only then calls `/api/issues/search`.

After `issues.json` has been written, finalize the project entry in the report:

```bash
node .claude/skills/peach-local-scan/scan-report.js project-success \
  "$SCAN_REPORT_JSON" \
  "$PROJECT" \
  "$PROJECT_KEY" \
  "$ARTIFACT_DIR"
```

That helper keeps the report generic. It records the artifact paths and derives only generic issue
summaries from `issues.json`: total raised issues, per-rule counts, JS/TS/other counts, and the
same language split per rule.

If the scan itself failed, or if CE polling / issue retrieval failed, keep the artifacts already
written and update the report explicitly before moving on:

```bash
node .claude/skills/peach-local-scan/scan-report.js project-failure \
  "$SCAN_REPORT_JSON" \
  "$PROJECT" \
  "$PROJECT_KEY" \
  "$ARTIFACT_DIR" \
  scan \
  "scanner exited with a non-zero status"
```

Use `scan`, `ce`, `issue-fetch`, or another short generic phase label that matches the failure.
Keep the failure message concise and specific.

Do not consider a project scan complete until both of these are true:

- SonarQube compute-engine processing for the submitted report reached `SUCCESS`
- `issues.json` exists and the report shows the project as `succeeded`

### 9. Restore The Previous Analyzer State If You Patched It

If this run patched the local SonarQube analyzer, restore it before leaving the task:

```bash
if [[ "${PATCHED_ANALYZER:-0}" -eq 1 ]]; then
  bash .claude/skills/peach-local-scan/manage-local-analyzer.sh restore "$ANALYZER_STATE_DIR"
  PATCHED_ANALYZER=0
fi
trap - EXIT
```

Do not leave the shared local `sonarqube` container patched unless the user explicitly asked you
to keep it that way.

## Reviewing The Results

Start with the run report:

```bash
sed -n '1,40p' target/peach-local-scan/peach-local-scan.md
```

That file tells you whether the run is complete, which project was last in progress, and where the
artifacts live. For machine-readable inspection, use `target/peach-local-scan/peach-local-scan.json`.

The issue-fetch helper writes only currently raised issues after compute-engine completion. Useful
follow-up commands:

Count issues:

```bash
jq '.total' "target/peach-local-scan/$PROJECT/issues.json"
```

Read the generic per-rule summary already recorded in the scan report:

```bash
jq '.projects[] | select(.name == "'"$PROJECT"'") | .issueSummary.byRule' \
  target/peach-local-scan/peach-local-scan.json
```

List the raised issues in a readable table:

```bash
jq -r '.issues[] | "\(.severity)\t\(.rule)\t\(.component):\(.line // "-")\t\(.message)"' \
  "target/peach-local-scan/$PROJECT/issues.json"
```

Keep these caveats in mind:

- Local quality profiles may differ from hosted environments.
- Reusing an old workspace can preserve local state; if a scan looks suspicious, reclone the
  workspace before drawing conclusions.
- Reusing a patched local `sonarqube` container can silently invalidate conclusions. Always inspect
  the current analyzer state first, and restore it after patching in the current run.
