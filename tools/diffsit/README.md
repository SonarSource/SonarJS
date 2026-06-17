# diffsit — SIT Issue Diff Analyzer

`diffsit` compares SonarQube issue reports between two analysis runs and reports new issues, removed issues, and unchanged count. It consumes [sit-exporter](../sit-exporter/) issue exports and diff-val `snapshot-app` snapshots.

## Typical Workflow

```
sit-exporter run or diff-val snapshot (base)   ─┐
                                                 ├─ diffsit → diff report
sit-exporter run or diff-val snapshot (target) ─┘
```

## Building

```bash
# Via Gradle (recommended)
./gradlew :dev-tools:diffsit:compileDiffsit

# Or directly with Cargo from the dev-tools/diffsit directory
cd dev-tools/diffsit
cargo build --release
# Binary: dev-tools/diffsit/target/release/diffsit
```

## Usage

```
diffsit <BASE> <TARGET> [OPTIONS]
```

### Arguments

| Argument | Description                                                        |
| -------- | ------------------------------------------------------------------ |
| `BASE`   | Path to the base (before) analysis — a `.zip` file or a directory  |
| `TARGET` | Path to the target (after) analysis — a `.zip` file or a directory |

### Options

| Option                          | Default   | Description                                                                                                                             |
| ------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `--group-by <file\|rule>`       | `file`    | Group output issues by file or by rule                                                                                                  |
| `--only-new`                    | —         | Show only new issues (suppress removed)                                                                                                 |
| `--only-removed`                | —         | Show only removed issues (suppress new)                                                                                                 |
| `--file-filter <STRING>`        | —         | Keep only file-scoped issues whose component path contains `STRING`                                                                     |
| `--rule-filter <STRING>`        | —         | Keep only issues whose rule key matches any provided value (repeat flag or pass comma-separated list)                                   |
| `--project-filter <STRING>`     | —         | Keep only projects whose name contains `STRING` (multi-project mode only)                                                               |
| `--format <text\|json\|html>`   | `text`    | Single output format written to stdout, unless `--output` is also provided                                                              |
| `--formats <text\|json\|html>`  | —         | One or more output formats to write under `--output` (repeat flag or pass comma-separated list)                                         |
| `--output <DIR>`                | —         | Directory where report files are written as `diffsit-report.txt`, `diffsit-report.json`, and/or `diffsit-report.html`                   |
| `--diff-mode <explain\|strict>` | `explain` | Matching mode: `explain` reports same-primary message/secondary drift as changed issues; `strict` compares full issue fingerprints only |

### Exit Codes

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| `0`  | No differences found                      |
| `1`  | Differences found                         |
| `2`  | Error (bad input, mismatched modes, etc.) |

## Input Format

Each input can be a **`.zip` file** or a **directory**. `diffsit` auto-detects the input format and single-project vs multi-project mode:

- **Single-project SIT export**: a directory (or `.zip` root) containing `issues.jsonl` and optionally `metadata.json`
- **Single-project diff-val snapshot**: a `snapshot-app` archive containing root-level `snapshot.json` and `metadata.json`
- **Multi-project SIT export**: a directory (or `.zip` root) whose sub-directories each contain an `issues.jsonl` file
- **Multi-project diff-val snapshots**: a directory containing diff-val snapshot `.zip` files; project names come from each snapshot's `projectName`

The `issues.jsonl` format is the one produced by `sit-exporter`: one JSON issue object per line. Project-level issues are represented with `component_path: null`; they are included in diffs and reports, and are excluded when `--file-filter` is used.

Diff-val snapshots are normalized into the same internal issue model as SIT exports. Snapshot locations are accepted in schema `1.2` comma-string form and the older object form. Snapshot issue keys and statuses are ignored for matching, consistent with SIT exports.

## Output Formats

- **text** (default): human-readable summary with grouped issue listings
- **json**: machine-readable JSON diff result
- **html**: self-contained HTML report with interactive features — useful for sharing or archiving

Use `--format` for a single report, usually on stdout. Use `--formats` with `--output` to generate multiple report files from one diff computation. `--format` and `--formats` are mutually exclusive.

## Matching Modes

By default, `diffsit` first matches issues by their full fingerprint, then pairs remaining issues with the same primary location and rule. If the paired issues differ only by message or secondary locations, they are reported as **changed** instead of as one removed issue plus one new issue. Summaries also include **message changes** and **secondary changes** sub-counts; an issue that changed both is counted in both sub-counts.

Use `--diff-mode strict` when you need the previous full-fingerprint behavior where any message or secondary-location drift is counted as removed plus new.

## Examples

```bash
# Compare two single-project exports (text output, grouped by file)
diffsit build/sit-export/before build/sit-export/after

# Compare two diff-val snapshots
diffsit snapshot_before.zip snapshot_after.zip

# Compare a diff-val snapshot against a SIT export
diffsit snapshot_before.zip build/sit-export/after

# Show only newly introduced issues for rule S1234
diffsit before.zip after.zip --only-new --rule-filter S1234

# Show only newly introduced issues for multiple rules
diffsit before.zip after.zip --only-new --rule-filter S1234 --rule-filter S5678
# or
diffsit before.zip after.zip --only-new --rule-filter S1234,S5678

# Use strict full-fingerprint matching
diffsit before.zip after.zip --diff-mode strict

# HTML report grouped by rule
diffsit before/ after/ --format html --group-by rule > report.html

# Generate text, JSON, and HTML reports in one invocation
diffsit before/ after/ --formats text,json,html --output reports --group-by rule

# Multi-project comparison, focus on a specific project
diffsit exports-before/ exports-after/ --project-filter fzf

# Multi-project diff-val comparison from directories of snapshot zips
diffsit snapshots-before/ snapshots-after/

# Filter to a specific file path
diffsit before/ after/ --file-filter src/main
```

## Development

```bash
cd dev-tools/diffsit

cargo test           # Run tests
cargo fmt            # Format code
cargo clippy         # Lint
```

Or via Gradle:

```bash
./gradlew :dev-tools:diffsit:testDiffsit
./gradlew :dev-tools:diffsit:checkDiffsitFormat
./gradlew :dev-tools:diffsit:checkDiffsitLicense
./gradlew :dev-tools:diffsit:clippyDiffsit
```
