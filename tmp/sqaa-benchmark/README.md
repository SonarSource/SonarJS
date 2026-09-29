# Temporary SonarJS CI ↔ SQAA parity benchmark

This tool is checked into [SonarJS PR #7986](https://github.com/SonarSource/SonarJS/pull/7986) so another engineer can resume the Dev16 context-restoration validation from any machine. It is not shipped with the analyzer. It requires Node.js 20+ and no npm dependencies.

The objective is exact parity for `javascript`, `typescript`, and `css` findings between an ordinary CI analysis and direct SQAA requests on the same files. HTTP failures and SQAA analysis errors are counted separately from missing or extra findings. The exact comparator uses rule, message, and the full text range as a multiset, mirroring the Java benchmark comparator.

## Current reference run

- Analyzer: SonarJS candidate `14.1.0.9298`, built from implementation commit `cda6ac40f15f7f809fcba637664a522f7bb4f369` (SonarJS PR head at deployment: `0df7382fc586aff80f64c2097cc457527e23b6e8`).
- SQAA: [PR #960](https://github.com/SonarSource/sonar-analysis-as-a-service/pull/960), Dev16 image `8975`; temporary plugin deployment: [deployer PR #300](https://github.com/SonarSource/sonar-plugins-deployer/pull/300). Verify the currently installed versions before a fresh comparison.
- CI source: [Peachee PR #99](https://github.com/SonarSource/peachee-js/pull/99), [Main Analysis run 36431209173](https://github.com/SonarSource/peachee-js/actions/runs/36431209173). The committed `projects-36431209173.txt` contains its 241 successful project keys. Four failed checkout/dependency jobs are excluded.
- The earlier Kibana OOM file `packages/kbn-api-contracts/src/allowlist/load_allowlist.ts` already passed two direct SQAA requests on one reused Node worker with no issue differences. Broad parity remains to be measured.

## Workflow

1. Verify that the CI projects were analyzed with the intended SonarJS build, their context artifacts were published, and Dev16's SQAA service embeds the same build. The analyzer build and project revisions are part of the test identity; do not silently mix runs.
2. Capture CI issues by project. The script uses `/api/issues/search` in bulk, paginates, and recursively splits components at the 10,000-result cap, following the approach in Peachee's [`fetch-issues.mjs`](https://github.com/SonarSource/peachee-js/blob/js-ts-css-html/fetch-issues.mjs). It selects up to 20 issues per rule across the project set, then saves _all_ SonarJS findings, source, and MAIN/TEST scope for every selected file. Each project and file is checkpointed independently; an interrupted capture resumes. A sealed `baseline.json` is written only after every file is present and project analysis keys still match.
3. Send direct SQAA requests using that immutable baseline. A response with analysis errors or a non-2xx HTTP status is **not** treated as an empty issue list. Each result is checkpointed to JSONL, with duration and response ID for correlating service logs. Repeat with a new output directory when the SQAA deployment changes.
4. Compare missing/extra findings and request failures separately. Inspect phase timings and RSS/heap in service logs using response IDs; the local HTTP duration alone is not analyzer execution time. Fix real mismatches on existing PRs #7986/#960, then repeat against a fresh, build-matched CI analysis.

## Reproducing the 2026-09-28 cohort

The project manifest is committed, so a Peachee checkout is not needed to use it. To regenerate it for another Main Analysis run, check out that Peachee revision and run:

```sh
node projects-from-peachee.mjs --run <github-actions-run-id> --peachee <peachee-checkout> --key-prefix vdiez: --out <project-manifest.txt>
```

The generator uses the authenticated `gh` CLI to enumerate successful jobs and reads each job's `sonar-project.properties`. It does not include failed jobs or invent project keys.

Use an authorized Dev16 token through `SONAR_TOKEN` (or select another secret environment-variable name with `--token-env`). Never put tokens in command arguments, tracked files, output, or logs. The output directory contains source code and analysis data; treat it as private. `out/` below this folder is ignored by Git.

```sh
node benchmark.mjs capture \
  --server-url https://dev16.sc-dev16.io \
  --organization vdiez \
  --organization-id d2a6f6a1-4536-4604-9cf2-186f7f6d4215 \
  --analyzer-build 14.1.0.9298 \
  --projects projects-36431209173.txt \
  --out out/9298-baseline

node benchmark.mjs compare \
  --baseline out/9298-baseline/baseline.json \
  --sqaa-url https://api.sc-dev16.io/a3s-analysis/analyses \
  --deployment sqaa-8975-sonarjs-9298 \
  --out out/9298-sqaa
```

For a fast investigation, add `--project <project-key>` and/or `--file <component-key>` to `capture`. A full component key can select an indexed file with no CI findings. Add `--rule javascript:S1234` to select a rule's cohort; the captured files still retain all SonarJS findings. `compare` accepts the same project, file, and rule filters against a saved baseline, with no CI calls. A new comparison output directory starts a clean SQAA run; rerunning with the same directory skips successful files and retries failed requests. Its `run.json` rejects a different baseline or deployment in that directory. The default is one SQAA request at a time, matching the service's single-flight Node worker. Raise `--concurrency` cautiously after measuring Dev16 load and memory.

For an extension-specific replay of the same rule-sampled cohort, add `--file-suffix .vue` to `capture`. Sampling still runs across all issue-bearing files first; only selected Vue files need source snapshots and SQAA requests. Use repeated `--exclude-project <project-key>` to omit expensive projects (such as Kibana) before sampling. Both filters are recorded in the sealed baseline.

In capture, an explicit `--file` selects only the named file(s), rather than also sampling every rule. Full component keys let the runner fetch CI issues for just those files and skip unrelated projects in the manifest. A suffix-only selector still requires the broader project issue query. Use `--rule` without `--file` to create a rule-sampled cohort. Issue-search component metadata supplies the MAIN/TEST qualifier for issue-bearing files; an issue-free explicit file falls back to `/api/components/show`.

For capture, `--concurrency` defaults to 8, `--pace-ms` to 150, and `--sample-per-rule` to 20. Adjust pacing only in response to observed API rate limits. The script retries HTTP 429/503/504 with backoff. It refuses to seal a baseline if an analysis key changes during capture. Start a new output directory after a new CI analysis; never overwrite a sealed baseline.

If a selected source remains unavailable, `capture` accepts repeated `--exclude-file <full-component-key>` options. Excluded files must belong to the selected cohort; the sealed baseline records their exact keys and does not count them as analyzed. Keep the exclusion list with the run results so coverage remains explicit.

For comparison, each SQAA request has a 60-second timeout by default and is attempted only once. A failure is recorded, not silently retried or treated as an empty issue list. Rerun the same comparison output explicitly to retry failed files; successful files are skipped. `--timeout-ms` can change the timeout for a controlled experiment.

## Outputs and limitations

- `baseline.json`: sealed project analysis keys/revisions, branch IDs, intended analyzer build, selected file references, and benchmark parameters.
- `projects/*.json`: resumable issue snapshots; `files/*.json`: source, scope, and all SonarJS findings for one selected file.
- `run.json`: comparison identity (baseline digest and declared SQAA deployment); `results.jsonl`: one direct SQAA result per attempt, including analysis and gateway request IDs when available.
- `summary.json`: cohort coverage, matched/missing/extra findings, invalid context, analysis/HTTP failures, error-code counts, and successful-request duration percentiles. `rule_metrics.json` and `rule_metrics.csv` give per-rule detection and false-positive counts/rates; `false_positives.csv`, `errors.csv`, and `timings.csv` support investigation.

The tool samples issue-bearing files by rule; it is not an exhaustive pass over every indexed file. Explicit `--file` selectors can probe issue-free files. It currently sends one file per SQAA request to preserve clear per-file attribution. Batching files from the same project may be a later speed improvement, but first confirm identical analyzer semantics and memory behavior. The timing CSV is per request/file, not CPU time per rule: one request runs many rules, so genuine per-rule timing needs analyzer instrumentation or isolated-rule experiments. It does not parse ECS logs automatically; use the saved analysis and gateway request IDs for phase timings and memory. It does not upload or share captured source snapshots.

Run its self-contained tests with `node --test benchmark.test.mjs`.
