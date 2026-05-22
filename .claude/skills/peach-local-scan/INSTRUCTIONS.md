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

This skill is intentionally narrow:

- Host-based scanner only.
- Always scan against `http://localhost:9000`.
- Always poll SonarQube until compute-engine processing completes, then fetch the currently raised
  issues after each successful scan.
- Never fall back to `https://peach.sonarsource.com/`.
- Never ask the user for an explicit analyzer jar path.

## Inputs And Reuse

Reuse values already established earlier in the current conversation if they still validate on
disk:

- `PEACHEE_ROOT`: must contain `projects.json`
- `NIGEL_ROOT`: must contain `start-services.sh`
- project selection
- rebuild choice

If any of those are missing or invalid, ask only for the missing values:

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

## Outputs

Write per-project artifacts under:

```text
target/peach-local-scan/<project>/
  scan.log
  issues.json
target/peach-local-scan/sonarqube-analyzer-state/
  snapshot.tsv
  files/*
```

If you install dependencies for a freshly checked out project, keep that log in the same
directory as `install.log`.

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

### 4. Patch The Local SonarQube Analyzer Only When Required

If the user wants exact local-worktree validation, snapshot the current analyzer state, register a
restore trap, and then patch the running SonarQube analyzer:

```bash
ANALYZER_STATE_DIR="target/peach-local-scan/sonarqube-analyzer-state"
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
- The helper snapshots the current analyzer state first, then patches the active analyzer jar in
  the running container, and finally restores the previous state when requested.

If you discover a previously patched container but do **not** have a snapshot to restore from,
recreate the SonarQube container with `./start-services.sh`. The built-in analyzer jar lives in
the container filesystem, not in the mounted `extensions` volume, so recreating the container
discards the mutation.

### 5. Prepare The Root Scanner Installation

Run from `PEACHEE_ROOT`.

The root scanner used by Peach lives at `node_modules/.bin/sonar-scanner`. If it is missing,
install the root dependency exactly like the Peach workflow does:

```bash
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
```

### 6. Resolve Project Selection Then Process Projects Serially

From `PEACHEE_ROOT`, first resolve the user's project selection into a concrete `PROJECTS`
list. Then process that list one project at a time so logs and failures stay attributable.

Project-selection rules:

- If the user named specific projects, preserve that order in `PROJECTS`.
- If the user asked for all projects, expand every entry from `projects.json` without filtering.

For an all-project scan, resolve the list like this:

```bash
mapfile -t PROJECTS < <(jq -r 'keys_unsorted[]' projects.json)
```

If that expansion yields no projects, stop and report that `projects.json` did not define any
Peach projects to scan.

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
6. Run the scan with debug-friendly settings.
7. Poll SonarQube until the submitted analysis report is processed, then fetch the currently raised
   issues.

Use these values:

```bash
PROJECT_KEY="$(grep -E '^sonar\.projectKey=' "$PROJECT/sonar-project.properties" | head -1 | cut -d= -f2-)"
INSTALL_MODE="$(jq -r --arg p "$PROJECT" '.[$p].install // empty' projects.json)"
JAVA_OPTS="$(jq -r --arg p "$PROJECT" '.[$p].java_opts // empty' projects.json)"
ARTIFACT_DIR="target/peach-local-scan/$PROJECT"
WORKSPACE="$PROJECT/workspace"
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

### 7. Run The Host-Based Scan

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
```

That file contains the compute-engine task id for the submitted analysis report. Use it to poll
SonarQube before fetching issues.

### 8. Poll SonarQube Then Fetch Raised Issues

After each successful scan, wait for SonarQube compute-engine completion and then fetch the
currently raised issues into the project artifact directory:

```bash
node .claude/skills/peach-local-scan/fetch-local-issues.js \
  "$PROJECT_KEY" \
  "$ARTIFACT_DIR/issues.json" \
  "$REPORT_TASK_PATH"
```

This helper polls `/api/ce/task` until the submitted analysis reaches `SUCCESS`, fails fast on
`FAILED` or `CANCELED`, and only then calls `/api/issues/search`.

Do not consider a project scan complete until both of these are true:

- SonarQube compute-engine processing for the submitted report reached `SUCCESS`
- `issues.json` exists

If the scan itself failed, keep `scan.log`, report the scan failure, and do not pretend that a
later issue fetch represents that failed attempt.

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

The helper writes only currently raised issues after compute-engine completion. Useful follow-up
commands:

Count issues:

```bash
jq '.total' "target/peach-local-scan/$PROJECT/issues.json"
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
