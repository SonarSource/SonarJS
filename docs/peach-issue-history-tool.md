# Peach Issue History Tool

## Goal

Add an `mc` command that detects suspicious drops in the total issue count of Peach projects.
A large drop usually means the project was analyzed with a broken or narrowed
`sonar-project.properties` configuration, even when the GitHub job itself is green.

The tool is intended to support the Peach Main Analysis triage workflow and should be fast
enough to run across the whole nightly matrix.

## Background

The SonarQube project Overview "Activity" panel exposes historical measure values per project.
For this check, the relevant signal is the project issue count history, not individual issue
documents.

Use the SonarQube measure-history API as the source of truth:

- primary endpoint: `/api/measures/search_history`
- primary metric: `violations`
- optional diagnostic metrics: `bugs`, `vulnerabilities`, `code_smells`, `open_issues`
- optional event enrichment: `/api/project_analyses/search`

History retention follows SonarQube housekeeping, so the command must tolerate missing older
points and shallow histories.

## Proposed Command

```bash
mc peach issue-history --jobs-json target/jobs.json
mc peach issue-history --input project-keys.txt
mc peach issue-history --project js:FreeCodeCamp --project ts:AI-Media2Doc
```

## Scope

The command should support two modes:

1. Generic project-key mode for ad hoc checks.
2. Peach-run mode driven by the GitHub Actions jobs payload already fetched by the
   `peach-check` skill.

The Peach-run mode is the primary target for this work.

## Inputs

### Project-key mode

- `--project <KEY>` repeatable
- `--input <FILE>` with one project key per line

### Peach-run mode

- `--jobs-json <FILE>` pointing to the paginated `gh api .../jobs` payload
- `--peachee-root <DIR>` pointing to the local `peachee-js` checkout

Project resolution in Peach-run mode:

1. Read all non-excluded jobs from `jobs.json`.
2. Ignore workflow-only jobs such as `diff-validation-aggregated`.
3. By default, keep only project jobs with `conclusion == "success"`.
4. For each remaining job name, read
   `<peachee-root>/<job-name>/sonar-project.properties`.
5. Extract `sonar.projectKey=...`.
6. Deduplicate resolved keys.
7. Report unresolved job names separately.

This avoids guessing SonarQube keys from GitHub job names. The local `peachee-js` checkout is
already the authoritative project catalog for the Peach matrix.

## Default Heuristic

Default configuration:

- metric: `violations`
- baseline: median of the previous 5 successful analyses
- suspicious drop threshold: `5%`
- minimum absolute drop: `20` issues
- concurrency: `8`

Decision rule:

- `current` = latest stored value for the selected metric
- `baseline` = median of up to the previous 5 stored values
- `drop_abs` = `baseline - current`
- `drop_pct` = `drop_abs / baseline * 100`
- `min_drop_abs` is only a small-project noise floor
- the effective required drop is:
  - `max(min_drop_abs, baseline * threshold_pct / 100)`
- flag as suspicious when:
  - `baseline > 0`
  - `drop_pct >= threshold_pct`
  - `drop_abs >= min_drop_abs`

Shallow-history rule:

- if there is no previous value, report `INSUFFICIENT_HISTORY`
- if there are fewer than 5 previous values, use all available previous values and mark
  `history_truncated: true`

## Command-Line Interface

```text
mc peach issue-history
  [--project <KEY> ...]
  [--input <FILE>]
  [--jobs-json <FILE>]
  [--peachee-root <DIR>]
  [--metric <METRIC>]
  [--baseline median:<N>]
  [--threshold-pct <NUMBER>]
  [--min-drop-abs <NUMBER>]
  [--concurrency <N>]
  [--format text|json|tsv]
  [--output <FILE>]
  [--include-non-success]
  [--fail-on-drop]
```

Rules:

- `--project`, `--input`, and `--jobs-json` are composable sources; the final set is the union
  of all resolved keys.
- `--jobs-json` requires `--peachee-root` unless a default Peach checkout path is configured.
- `--baseline` initially supports only `median:<N>`.
- `--min-drop-abs` is a de-noising floor for small projects, not the primary trigger for large ones.
- `--fail-on-drop` makes the command exit non-zero when one or more suspicious drops are found.
  Without it, a suspicious result is data, not a command failure.

## API Behavior

For each project key, the command should:

1. Call `/api/measures/search_history` for the selected metric.
2. Parse the latest value plus enough prior values to compute the configured baseline.
3. Optionally call `/api/project_analyses/search` for the same project to enrich the latest
   point with analysis metadata and Activity events.
4. Produce one normalized result row.

The tool should not call the issue search API. It is slower, returns issue documents rather than
measure history, and is the wrong level of abstraction for this check.

## Concurrency Model

The command should issue SonarQube requests concurrently with a bounded worker pool.

Requirements:

- default concurrency: `8`
- preserve output determinism by sorting final rows by project key
- reuse HTTP connections
- retry transient `429`, `502`, and `503` responses up to 3 times with jittered backoff
- keep per-project failures isolated; one bad project must not abort the full matrix run

Expected scale:

- approximately 200 to 250 projects in the nightly Peach matrix
- one history request per project, plus one optional analyses request when enrichment is enabled

## Output

### Text output

```text
metric=violations baseline=median:5 threshold_pct=5 threshold_abs=20 concurrency=8
DROP  js:FreeCodeCamp   current=3821 baseline=4150 drop_abs=329 drop_pct=7.9 analysis=2026-04-30T03:10:35Z
OK    js:angularfire    current=2144 baseline=2152 drop_abs=8   drop_pct=0.4 analysis=2026-04-30T03:10:17Z
INFO  ts:AI-Media2Doc   status=INSUFFICIENT_HISTORY current=188 history_points=2
WARN  ai-media2doc      status=UNRESOLVED_PROJECT
Summary: DROP=1 OK=1 INSUFFICIENT_HISTORY=1 UNRESOLVED_PROJECT=1
```

### JSON output

Each row should include:

- `project_key`
- `metric`
- `analysis_date`
- `current_value`
- `baseline_value`
- `baseline_kind`
- `baseline_window`
- `history_points`
- `history_truncated`
- `drop_abs`
- `drop_pct`
- `status`
- `source_job_name` when resolved from `--jobs-json`
- `message`

Statuses:

- `OK`
- `DROP`
- `INSUFFICIENT_HISTORY`
- `UNRESOLVED_PROJECT`
- `ERROR`

## Peach-Check Integration

The `peach-check` skill should call the command after fetching `target/jobs.json` and before any
early-safe exit.

Recommended invocation:

```bash
mc peach issue-history \
  --jobs-json target/jobs.json \
  --peachee-root /home/francois/git/peachee-js \
  --metric violations \
  --baseline median:5 \
  --threshold-pct "${PEACH_ISSUE_DROP_THRESHOLD_PCT:-5}" \
  --min-drop-abs "${PEACH_ISSUE_DROP_MIN_ABS:-20}" \
  --concurrency "${PEACH_ISSUE_HISTORY_CONCURRENCY:-8}" \
  --format json \
  --output target/peach-issue-history.json
```

Skill behavior:

- treat each `DROP` as `NEEDS-MANUAL-REVIEW`
- do not fail the run on `INSUFFICIENT_HISTORY`
- treat `UNRESOLVED_PROJECT` as `NEEDS-MANUAL-REVIEW` because the issue-history check is incomplete
- keep failed-job triage and issue-drop triage separate in the final summary

## Non-Goals

- Explaining every issue-count decrease automatically
- Comparing individual issue keys or rule-level deltas
- Replacing the existing failed-job classification flow
- Treating every issue drop as a SonarJS analyzer bug

The first version only flags suspicious project-level drops and leaves the explanation to manual
review.
