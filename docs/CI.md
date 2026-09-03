# SonarJS CI Reference

This document explains the main GitHub Actions pipeline in
[`../.github/workflows/build.yml`](../.github/workflows/build.yml).

It documents the cache/artifact model used by the workflow:

- direct workflow-level cache usage in `build.yml` uses official GitHub cache actions
- same-run file handoff uses official GitHub artifact actions
- local cache wrappers (`maven-cache`, `orchestrator-cache`, `rule-api-cache`) also use official GitHub cache actions
- `build.yml` uses explicit npm registry configuration on both Linux and Windows cache-population jobs
- `build.yml` does not use SonarSource's S3-backed cache action

This is the document to read first when you need to answer any of these questions quickly:

- Which jobs exist and why?
- Which jobs depend on which other jobs?
- What data moves via outputs, caches, and artifacts?
- What is shared across jobs in one run?
- What is shared from the default branch to other branches?
- Where does S3 still appear, and where does it not?
- How do Repox, Vault, RSPEC, SonarQube, and promotion fit into the pipeline?

## Scope

This document focuses on the main `Build` workflow:

- [`../.github/workflows/build.yml`](../.github/workflows/build.yml)
- [`../.github/actions/ruling_bot/action.yml`](../.github/actions/ruling_bot/action.yml)
- [`../.github/actions/maven-cache/action.yml`](../.github/actions/maven-cache/action.yml)
- [`../.github/actions/orchestrator-cache/action.yml`](../.github/actions/orchestrator-cache/action.yml)
- [`../.github/actions/rule-api-cache/action.yml`](../.github/actions/rule-api-cache/action.yml)

Other workflows exist in `.github/workflows/`, but they are out of scope unless they directly affect the `build.yml` lifecycle. The exception is [`../mise.toml`](../mise.toml), which is in scope: it is the single declared source of the Java/Maven/Node versions `build.yml` provisions — see [Toolchain Provisioning (mise)](#toolchain-provisioning-mise).

## Cache And Artifact Model

The workflow uses a deliberate split between GitHub cache and GitHub artifacts:

- `node_modules`, Maven, CycloneDX CLI, orchestrator, rule-api, JS coverage, and the Windows JS marker use cache semantics
- RSPEC data, built Maven outputs, JaCoCo reports, JS coverage reports, the ESLint plugin tarball, and nightly generated READMEs use artifact semantics
- `prepare_rspec_rule_data` refreshes RSPEC once and shares the result through a per-run artifact
- Maven, orchestrator, and rule-api cache policy is centralized in local wrapper actions
- `config-maven` configures Maven and Repox access, but its built-in caching is disabled in `build.yml`
- NPM registry authentication is configured explicitly in `build.yml` through Vault-fetched Artifactory tokens
- all direct workflow cache steps and the local cache wrappers use the same official GitHub cache actions

## Trigger Model And Global Controls

`build.yml` runs on:

- `push` to `master`
- `push` to `branch-*`
- `push` to `dogfood-*`
- `pull_request`
- `merge_group`
- `workflow_dispatch`
- nightly `schedule`

Global behavior:

- `concurrency.group = ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}`
- `cancel-in-progress: true`

That means:

- one PR gets at most one active `Build` run
- one branch ref gets at most one active `Build` run
- new pushes cancel older in-flight runs for the same PR/ref

## Runner Strategy

Runner labels express relative size and environment, not a stable hardware contract. The workflow uses them as follows:

| Runner label                                  | Typical jobs                                                                                                                 | Why it is used                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `sonar-xs`                                    | `setup`, `get_build_number`, `populate_npm_cache`, `prepare_rspec_rule_data`, `knip`, `promote`, `releasability`, `run_iris` | Lightweight orchestration, metadata, cache preparation, and control-plane jobs |
| `sonar-m`                                     | `test_js`, `analyze_primary`, `analyze_shadows`, most Linux plugin QA jobs                                                   | Medium Linux compute for tests and analysis                                    |
| `sonar-l`                                     | `build`                                                                                                                      | Main Linux Maven build and deploy                                              |
| `sonar-xl`                                    | `js_ts_ruling`, `ruling`                                                                                                     | Large ruling workloads                                                         |
| `github-ubuntu-latest-s`                      | `build_eslint_plugin`, `test_eslint_plugin`, `generated_files_freshness`                                                     | Small GitHub-hosted Linux jobs                                                 |
| `github-windows-latest-s`                     | `populate_npm_cache_win`                                                                                                     | Small Windows cache producer                                                   |
| `github-windows-latest-m`                     | `build_win`, `test_js_win`, Windows plugin QA jobs                                                                           | Medium Windows build/test jobs                                                 |
| `warp-custom-ubuntu-24-04` + Alpine container | Alpine QA jobs                                                                                                               | Host runner plus containerized musl/Alpine validation                          |

## High-Level Pipeline Map

```mermaid
flowchart TD
  A["setup"] --> B["get_build_number"]
  A --> C["populate_npm_cache"]
  A --> D["populate_npm_cache_win"]
  C --> E["prepare_rspec_rule_data"]

  B --> F["build"]
  C --> F
  E --> F

  B --> G["build_win"]
  D --> G
  E --> G

  E --> H["build_eslint_plugin"]
  H --> I["test_eslint_plugin"]

  C --> J["test_js"]
  E --> J

  D --> K["test_js_win"]
  E --> K

  C --> L["knip"]
  E --> L

  E --> M
  H --> M["generated_files_freshness (nightly)"]

  F --> N["plugin QA fan-out"]
  F --> O["ruling"]
  C --> P["js/ts ruling"]
  E --> P

  F --> Q["analyze_primary"]
  J --> Q
  F --> R["analyze_shadows (nightly)"]
  J --> R

  Q --> S["run_iris (nightly)"]
  R --> S

  B --> T["promote"]
  F --> T
  G --> T
  I --> T
  J --> T
  K --> T
  N --> T
  O --> T
  P --> T
  Q --> T

  T --> U["releasability"]
```

## Detailed Dependency Views

The full 31-job dependency graph is too dense to read well as a single Mermaid diagram. The grouped views below are the readable version; the job table that follows is the exact exhaustive reference.

### 1. Setup And Artifact Producers

```mermaid
flowchart TD
  setup["setup"] --> get_build_number["get_build_number"]
  setup --> populate_npm_cache["populate_npm_cache"]
  get_build_number --> populate_npm_cache
  setup --> populate_npm_cache_win["populate_npm_cache_win"]
  get_build_number --> populate_npm_cache_win

  setup --> prepare_rspec_rule_data["prepare_rspec_rule_data"]
  populate_npm_cache --> prepare_rspec_rule_data

  setup --> build["build"]
  get_build_number --> build
  populate_npm_cache --> build
  prepare_rspec_rule_data --> build

  setup --> build_win["build_win"]
  get_build_number --> build_win
  populate_npm_cache_win --> build_win
  prepare_rspec_rule_data --> build_win

  setup --> build_eslint_plugin["build_eslint_plugin"]
  prepare_rspec_rule_data --> build_eslint_plugin
  build_eslint_plugin --> test_eslint_plugin["test_eslint_plugin"]
```

### 2. Verification And Analysis

```mermaid
flowchart TD
  setup["setup"] --> populate_npm_cache["populate_npm_cache"]
  setup --> populate_npm_cache_win["populate_npm_cache_win"]
  setup --> prepare_rspec_rule_data["prepare_rspec_rule_data"]
  populate_npm_cache --> prepare_rspec_rule_data

  setup --> knip["knip"]
  populate_npm_cache --> knip
  prepare_rspec_rule_data --> knip

  setup --> test_js["test_js"]
  populate_npm_cache --> test_js
  prepare_rspec_rule_data --> test_js

  setup --> test_js_win["test_js_win"]
  populate_npm_cache_win --> test_js_win
  prepare_rspec_rule_data --> test_js_win

  prepare_rspec_rule_data --> generated_files_freshness
  build_eslint_plugin["build_eslint_plugin"] --> generated_files_freshness["generated_files_freshness"]

  setup --> analyze_primary["analyze_primary"]
  get_build_number["get_build_number"] --> analyze_primary
  build["build"] --> analyze_primary
  test_js --> analyze_primary

  setup --> analyze_shadows["analyze_shadows"]
  get_build_number --> analyze_shadows
  build --> analyze_shadows
  test_js --> analyze_shadows

  analyze_primary --> run_iris["run_iris"]
  analyze_shadows --> run_iris
```

### 3. QA, Ruling, And Release Fan-In

```mermaid
flowchart TD
  build["build"] --> plugin_qa["plugin QA matrix"]
  get_build_number["get_build_number"] --> plugin_qa

  build --> ruling["ruling"]
  get_build_number --> ruling

  populate_npm_cache["populate_npm_cache"] --> js_ts_ruling["js_ts_ruling"]
  prepare_rspec_rule_data["prepare_rspec_rule_data"] --> js_ts_ruling

  build --> promote["promote"]
  build_win["build_win"] --> promote
  test_js["test_js"] --> promote
  test_js_win["test_js_win"] --> promote
  analyze_primary["analyze_primary"] --> promote
  test_eslint_plugin["test_eslint_plugin"] --> promote
  plugin_qa --> promote
  ruling --> promote
  js_ts_ruling --> promote
  get_build_number --> promote

  promote --> releasability["releasability"]
```

## Job Index

| Job                                  | Runner                     | Needs                                                                            | Condition                                                             |
| ------------------------------------ | -------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `setup`                              | `sonar-xs`                 | `-`                                                                              | default                                                               |
| `get_build_number`                   | `sonar-xs`                 | `setup`                                                                          | non-fork PRs and all non-PR runs                                      |
| `populate_npm_cache`                 | `sonar-xs`                 | `setup`, `get_build_number`                                                      | non-fork PRs and all non-PR runs                                      |
| `populate_npm_cache_win`             | `github-windows-latest-s`  | `setup`, `get_build_number`                                                      | non-fork PRs and all non-PR runs                                      |
| `prepare_rspec_rule_data`            | `sonar-xs`                 | `setup`, `populate_npm_cache`                                                    | non-fork PRs and all non-PR runs                                      |
| `build`                              | `sonar-l`                  | `setup`, `get_build_number`, `populate_npm_cache`, `prepare_rspec_rule_data`     | non-fork PRs and all non-PR runs                                      |
| `build_win`                          | `github-windows-latest-m`  | `setup`, `get_build_number`, `populate_npm_cache_win`, `prepare_rspec_rule_data` | non-fork PRs and all non-PR runs                                      |
| `build_eslint_plugin`                | `github-ubuntu-latest-s`   | `setup`, `prepare_rspec_rule_data`                                               | non-fork PRs and all non-PR runs                                      |
| `generated_files_freshness`          | `github-ubuntu-latest-s`   | `prepare_rspec_rule_data`, `build_eslint_plugin`                                 | nightly only                                                          |
| `test_eslint_plugin`                 | `github-ubuntu-latest-s`   | `setup`, `build_eslint_plugin`                                                   | default                                                               |
| `knip`                               | `sonar-xs`                 | `setup`, `populate_npm_cache`, `prepare_rspec_rule_data`                         | default                                                               |
| `test_js`                            | `sonar-m`                  | `setup`, `populate_npm_cache`, `prepare_rspec_rule_data`                         | default                                                               |
| `test_js_win`                        | `github-windows-latest-m`  | `setup`, `populate_npm_cache_win`, `prepare_rspec_rule_data`                     | default                                                               |
| `analyze_primary`                    | `sonar-m`                  | `setup`, `get_build_number`, `test_js`, `build`                                  | non-fork PRs and all non-PR runs                                      |
| `analyze_shadows`                    | `sonar-m`                  | `setup`, `get_build_number`, `test_js`, `build`                                  | nightly only                                                          |
| `plugin_qa_with_node`                | `sonar-m`                  | `setup`, `get_build_number`, `build`                                             | non-fork PRs and all non-PR runs                                      |
| `plugin_qa_fast_with_node`           | `sonar-m`                  | `setup`, `get_build_number`, `build`                                             | non-fork PRs and all non-PR runs                                      |
| `plugin_qa_without_node`             | `sonar-m`                  | `setup`, `get_build_number`, `build`                                             | non-fork PRs and all non-PR runs                                      |
| `plugin_qa_without_node_dev`         | `sonar-m`                  | `setup`, `get_build_number`, `build`                                             | nightly only                                                          |
| `plugin_qa_without_node_alpine`      | `warp-custom-ubuntu-24-04` | `setup`, `get_build_number`, `build`                                             | nightly only                                                          |
| `plugin_qa_fast_without_node`        | `sonar-m`                  | `setup`, `get_build_number`, `build`                                             | non-fork PRs and all non-PR runs                                      |
| `plugin_qa_fast_without_node_dev`    | `sonar-m`                  | `setup`, `get_build_number`, `build`                                             | nightly only                                                          |
| `plugin_qa_fast_without_node_alpine` | `warp-custom-ubuntu-24-04` | `setup`, `get_build_number`, `build`                                             | nightly only                                                          |
| `plugin_qa_win`                      | `github-windows-latest-m`  | `setup`, `get_build_number`, `build`                                             | non-fork PRs and all non-PR runs                                      |
| `plugin_qa_sonarlint_win`            | `github-windows-latest-m`  | `setup`, `get_build_number`, `build`                                             | non-fork PRs and all non-PR runs                                      |
| `plugin_qa_win_fast_with_node`       | `github-windows-latest-m`  | `setup`, `get_build_number`, `build`                                             | non-fork PRs and all non-PR runs                                      |
| `js_ts_ruling`                       | `sonar-xl`                 | `setup`, `populate_npm_cache`, `prepare_rspec_rule_data`                         | non-fork PRs and all non-PR runs                                      |
| `ruling`                             | `sonar-xl`                 | `setup`, `get_build_number`, `build`                                             | non-fork PRs and all non-PR runs                                      |
| `run_iris`                           | `sonar-xs`                 | `analyze_primary`, `analyze_shadows`                                             | nightly only                                                          |
| `promote`                            | `sonar-xs`                 | many fan-in jobs                                                                 | only when upstream jobs succeeded and the run is allowed to promote   |
| `releasability`                      | `sonar-xs`                 | `promote`                                                                        | only after successful promote on `master`, `branch-*`, or `dogfood-*` |

## Control-Plane Handoff

These are the small data items passed as job outputs or step outputs, not bulky file payloads.

| Producer           | Data                | Consumers                                                   | Meaning                                                                                        |
| ------------------ | ------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `setup`            | `node-matrix`       | Node-matrix plugin QA jobs                                  | Derived from `package.json` engine range                                                       |
| `setup`            | `js-files-hash`     | `test_js`, `test_js_win`                                    | Cache key seed for JS coverage and Windows JS marker, including workflow and dependency inputs |
| `setup`            | `maven-hash`        | all `maven-cache` users                                     | Cache key seed for Maven dependencies                                                          |
| `setup`            | `npm-hash`          | all `node_modules` producers/consumers                      | Exact cache key seed for installed Node dependencies                                           |
| `setup`            | `cache-month`       | `maven-cache`                                               | Monthly key rotation value                                                                     |
| `setup`            | `is-default-branch` | most `mise-action` calls                                    | Controls when tool caches may be saved                                                         |
| `get_build_number` | `build-number`      | build, QA, analysis, promotion, and shared env anchor users | One build number is minted once and reused consistently                                        |
| `config-maven`     | `project-version`   | `analyze_primary`, `analyze_shadows`                        | Sonar analysis version value                                                                   |

### Important internal detail: build number cache

`SonarSource/ci-github-actions/get-build-number` itself uses GitHub cache internally:

- restore: `build-number-${github.run_id}`
- save: same key
- purpose: rerun stability within one workflow run

That cache is tiny, but it is still part of the repository's GitHub cache footprint.

## File-Plane Handoff Inside One Workflow Run

Artifacts are the only cross-job file handoff mechanism that is guaranteed to stay inside one workflow run. They do not flow from `master` to branches or from one run to the next.

### Artifacts

| Producer                  | Artifact name                       | Consumers                                                                                                                  | Purpose                                                                           | Retention                         |
| ------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------- |
| `prepare_rspec_rule_data` | `rspec-rule-data-${github.sha}`     | `build`, `build_win`, `build_eslint_plugin`, `generated_files_freshness`, `knip`, `test_js`, `test_js_win`, `js_ts_ruling` | One RSPEC refresh per run; downstream jobs do not refresh again                   | 1 day                             |
| `build`                   | `sonarjs-m2`                        | all plugin QA jobs, `ruling`                                                                                               | Share locally built SonarJS Maven artifacts instead of rebuilding them everywhere | 1 day                             |
| `build`                   | `maven-targets-${github.sha}`       | `analyze_primary`, `analyze_shadows`                                                                                       | Reuse compiled Maven outputs for Sonar analysis                                   | 1 day                             |
| `build`                   | `jacoco-xml-reports-${github.sha}`  | `analyze_primary`, `analyze_shadows`                                                                                       | Reuse JaCoCo XML coverage reports                                                 | 1 day                             |
| `build_eslint_plugin`     | `eslint-tarball-${github.sha}`      | `test_eslint_plugin`                                                                                                       | Same-run ESLint plugin tarball handoff                                            | 1 day                             |
| `build_eslint_plugin`     | `generated-readmes-${github.sha}`   | `generated_files_freshness`                                                                                                | Reuse the README files produced by the nightly ESLint build                       | 1 day                             |
| `test_js`                 | `js-coverage-reports-${github.sha}` | `analyze_primary`, `analyze_shadows`                                                                                       | Reuse JS coverage reports for Sonar analysis                                      | 1 day                             |
| `ruling`                  | `ruling-differences`                | humans only on failure                                                                                                     | Failure triage artifact                                                           | default retention for upload step |

### Why ESLint Outputs Are Artifacts, Not Caches

The ESLint plugin tarball and generated READMEs are purely same-run handoffs:

- producer: `build_eslint_plugin`
- consumers: `test_eslint_plugin` for the tarball and nightly `generated_files_freshness` for the READMEs
- no reuse across workflow runs is needed
- stale cross-run reuse would be actively misleading

That is exactly artifact semantics, not cache semantics.

## Cross-Run State: Caches

### Explicit workflow-owned caches

| Cache                      | Path                               | Producer(s)                                                       | Consumer(s)                                                                                                                                                    | Key shape                                                                                | Save policy                                                                                                         |
| -------------------------- | ---------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| installed NPM dependencies | `node_modules`                     | `populate_npm_cache`, `populate_npm_cache_win`                    | `build`, `build_win`, `prepare_rspec_rule_data`, `build_eslint_plugin`, `knip`, `test_js`, `test_js_win`, `analyze_primary`, `analyze_shadows`, `js_ts_ruling` | `npm-${runner.os}-${npm-hash}`                                                           | producer jobs use `actions/cache` with `lookup-only: true`; save happens only after a miss and a successful install |
| CycloneDX CLI              | `~/.cache/cyclonedx-cli`           | `build`, `build_win`                                              | `build`, `build_win`                                                                                                                                           | `cyclonedx-cli-${runner.os}-${runner.arch}-${hashFiles('tools/merge-cyclonedx-bom.sh')}` | immutable, checksum-verified native CLI used only by the opt-in Maven `sbom` profile                                |
| JS coverage cache          | `coverage/js`                      | `test_js`                                                         | `test_js` itself                                                                                                                                               | `js-coverage-${runner.os}-${js-files-hash}`                                              | combined restore/save cache; allows skip when exact coverage already exists                                         |
| Windows JS marker          | `.js-test-marker-win`              | `test_js_win`                                                     | `test_js_win` itself                                                                                                                                           | `js-test-win-${runner.os}-${js-files-hash}`                                              | lookup-only probe; on miss the job runs tests and saves marker at job end                                           |
| Maven repository           | `~/.m2/repository`                 | default-branch runs through `maven-cache`                         | all `maven-cache` users                                                                                                                                        | `maven-${runner.os}-${cache-month}-${maven-hash}` plus monthly restore prefix            | only default branch saves; non-default branches restore only                                                        |
| Orchestrator home          | `${github.workspace}/orchestrator` | default-branch QA jobs through `orchestrator-cache`               | orchestrator-based QA/ruling jobs                                                                                                                              | `${key-prefix}-${month}-${github.run_id}` with monthly restore prefix                    | only default branch saves unless `save: false`                                                                      |
| Rule API clone/cache       | `$HOME/.sonar/rule-api`            | default-branch `prepare_rspec_rule_data` through `rule-api-cache` | `prepare_rspec_rule_data`                                                                                                                                      | `${key-prefix}-${github.run_id}` with prefix restore                                     | only default branch saves unless `save: false`                                                                      |

### Helper-owned or transitive caches

| Owner                     | Path or payload        | Backend                       | Why it exists                                                                                                                                                                         |
| ------------------------- | ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get-build-number` action | `.build_number.txt`    | GitHub cache                  | Reuse one build number across reruns of the same workflow run                                                                                                                         |
| `jdx/mise-action`         | tool/runtime downloads | action-managed cache behavior | Reuses provisioned Java/Maven/Node toolchains; mostly action-managed, but a few jobs pass an explicit `cache_key` — see [Toolchain Provisioning (mise)](#toolchain-provisioning-mise) |

### Local wrapper semantics

#### Maven cache wrapper

`maven-cache` is the repo's opinionated wrapper around official GitHub cache primitives:

- branches: `actions/cache/restore` only
- default branch: full `actions/cache`
- keys rotate monthly and also hash all `pom.xml` files
- restore key allows reuse of other Maven entries from the same month when the exact key misses
- after restore, the wrapper deletes `~/.m2/repository/org/sonarsource/javascript`

That last cleanup is important:

- branch jobs may restore Maven dependencies from cache
- but they must not accidentally consume a stale locally built SonarJS artifact from cache
- SonarJS artifacts are instead handed over explicitly via the `sonarjs-m2` artifact

#### Orchestrator cache wrapper

`orchestrator-cache` is intentionally more rolling and less content-addressed:

- key includes `github.run_id`
- restore uses a prefix within the current month
- only default branch saves
- `key-prefix` separates normal and `fast` orchestrator environments
- `save: 'false'` forces restore-only even on default branch

This matches orchestrator state better than a content hash would:

- the workload depends on runtime images and evolving infrastructure state
- exact content identity is less important than getting a recent warm baseline

#### Rule API cache wrapper

`rule-api-cache` behaves like a rolling GitHub cache:

- key includes `github.run_id`
- restore uses a stable prefix
- only default branch saves unless disabled

This is deliberate because the underlying RSPEC clone/cache evolves independently of the SonarJS tree. A pure repository hash would be a poor invalidation signal here.

## Branch, PR, And Default-Branch Data Flow

### 1. Same workflow run

Use artifacts.

- `prepare_rspec_rule_data` produces RSPEC files once
- `build` produces Maven outputs and coverage reports once
- `build_eslint_plugin` produces one tarball and, on nightly runs, the generated READMEs
- downstream jobs download exactly those outputs from the same run

Artifacts never become the default-branch warm source for future runs.

### 2. Default branch to non-default branches

Use caches.

#### `node_modules`

The `node_modules` design is strict:

- exact key only
- no restore keys
- Linux and Windows keys are separated by `runner.os`

Implications:

- if the default branch has already populated `npm-${runner.os}-${npm-hash}`, a branch/PR run can restore that exact cache
- if the default branch does not have that exact cache yet, producer jobs do a real install and then save at job end
- consumer jobs fail on a cache miss; they assume the producer job already handled population

The producer pattern matters:

- `actions/cache` with `lookup-only: true` checks existence without downloading content
- on hit: skip checkout/tool setup/install
- on miss: do the install
- because the step is `actions/cache`, not `actions/cache/restore`, the post step still saves the populated cache after success

#### Maven / orchestrator / rule-api

The repo explicitly centralizes branch behavior:

- non-default branches restore only
- default branch is the intended producer of warm caches
- restore keys allow branches to reuse recent default-branch entries
- branches do not write their own long-lived copies of those caches

This makes `master` the canonical source of warm cross-branch state for those caches.

### 3. Branch or PR back to default branch

There is effectively no promotion of branch-produced file payloads back to the default branch:

- artifacts are run-local only
- branch caches do not become the default-branch cache
- restore-only wrappers make that explicit for Maven/orchestrator/rule-api
- default branch stays the authoritative producer for shared long-lived cache state

### 4. PR-specific state

PR runs still create PR-scoped GitHub state:

- build-number caches
- `node_modules` caches when the exact key is missing
- JS coverage cache
- Windows JS marker cache
- action-owned caches such as `mise`
- workflow artifacts for that PR's runs

That is why the repository also defines a PR-close cleanup workflow.

## S3 In This Workflow

`build.yml` does not use SonarSource's S3-backed cache action.

For this workflow, the relevant storage primitives are:

- GitHub cache for cross-run reusable state
- GitHub artifacts for same-run file payloads

S3 may still exist elsewhere in SonarSource reusable actions or in other workflows, but it is not part of the `build.yml` data path described in this document.

## Why GitHub Cache / Artifact Makes Sense Here

### Good fits for official GitHub primitives

| Payload                               | Best primitive | Why                                                                       |
| ------------------------------------- | -------------- | ------------------------------------------------------------------------- |
| `node_modules`                        | GitHub cache   | exact-key reusable install output; natural cross-run cache                |
| JS coverage skip output               | GitHub cache   | cache key is tied to source hash; restore/save in same job                |
| Windows JS test marker                | GitHub cache   | tiny skip marker, not a reusable artifact                                 |
| RSPEC prepared files                  | artifact       | per-run output shared by many downstream jobs                             |
| ESLint tarball                        | artifact       | one producer, one consumer, same run only                                 |
| generated README files                | artifact       | nightly output passed directly to the generated-files PR job              |
| Maven build outputs for analysis      | artifact       | exact same run-local compiled outputs are required                        |
| locally built SonarJS Maven artifacts | artifact       | explicit handoff is safer than accidentally restoring stale cached builds |

### Why not use one cache mechanism for everything?

Because the semantics differ:

- caches are for future reuse across runs
- artifacts are for deterministic handoff inside the current run
- pretending a run-local artifact is a cache invites stale reuse
- pretending a reusable dependency directory is an artifact creates needless uploads and downloads on every run

## Job-By-Job Walkthrough

### Foundation and dependency preparation

#### `setup`

Responsibilities:

- derive Node matrix from `package.json`
- hash JavaScript sources plus test-environment inputs for JS test reuse
- hash Maven files for Maven cache
- hash lockfile plus patches for `node_modules` cache
- compute cache month
- expose whether this is the default branch

This job is the control-plane root of the workflow.

#### `get_build_number`

Responsibilities:

- mint or recover a single build number
- make that value available to later jobs

This prevents downstream jobs from inventing inconsistent build numbers.

#### `populate_npm_cache` / `populate_npm_cache_win`

Responsibilities:

- probe the exact `node_modules` cache
- if present, stop early
- if missing, install dependencies and let the post step save the cache

Platform specifics:

- both jobs fetch an Artifactory access token from Vault
- both jobs configure the npm registry explicitly with `npm config set`
- Linux and Windows still produce separate `node_modules` caches because the cache key includes `runner.os`

#### `prepare_rspec_rule_data`

Responsibilities:

- restore `node_modules`
- restore Maven cache
- restore rule-api cache
- authenticate to RSPEC through Vault-fetched GitHub token
- run `npm run rspec:refresh`
- upload refreshed rule JSON and `rspec.sha` files as an artifact

This is the only job in the pipeline that refreshes RSPEC.

### Core build and correctness jobs

#### `build`

Responsibilities:

- restore `node_modules`
- restore Maven cache
- restore the checksum-verified CycloneDX CLI cache
- download refreshed RSPEC files
- configure Maven/Repox
- fetch deploy/signing credentials
- run Maven deploy with coverage/sign/release and `sbom` profiles
- upload:
  - `sonarjs-m2`
  - `maven-targets-${github.sha}`
  - `jacoco-xml-reports-${github.sha}`
- remove local SonarJS Maven artifacts before default-branch cache save

This is the central build producer job.

#### `build_win`

Responsibilities:

- Windows verification build
- restores `node_modules`, Maven cache, CycloneDX CLI cache, and RSPEC artifact
- runs `mvn verify -Psbom -T1C`

It validates Windows buildability but does not deploy artifacts.

#### `build_eslint_plugin`

Responsibilities:

- restore `node_modules`
- configure npm registry
- download refreshed RSPEC data
- build ESLint plugin package
- upload tarball artifact
- on nightly runs, update rule counts and upload both generated README files

#### `generated_files_freshness`

Nightly-only maintenance job:

- downloads refreshed RSPEC data
- downloads the README files generated by `build_eslint_plugin`
- opens or updates a bot PR if generated content drifted

#### `knip`

Responsibilities:

- restore `node_modules`
- download refreshed RSPEC data
- run `npm run bbf`
- run `npx knip`

#### `test_js`

Responsibilities:

- use `coverage/js` cache as a skip mechanism
- on miss, restore `node_modules`, download refreshed RSPEC data, generate metadata, compile bridge, run JS tests with coverage
- validate coverage files exist
- upload coverage reports artifact for analysis jobs

This job is both a cache consumer and a cache producer.
Its skip cache is keyed on both source inputs and workflow/dependency inputs so CI or Node changes do not silently reuse stale success.

#### `test_js_win`

Responsibilities:

- use a Windows marker cache as a skip mechanism
- on miss, restore `node_modules`, download refreshed RSPEC data, generate metadata, compile bridge, run JS tests
- create marker directory so the post step can save it

Like `test_js`, its skip key includes workflow/dependency inputs in addition to source inputs.

### Analysis, QA, and ruling fan-out

#### `analyze_primary`

Responsibilities:

- wait for `build` and `test_js`
- restore `node_modules` and Maven cache
- download JS coverage reports, Maven targets, and JaCoCo XML
- configure Maven
- fetch SonarQube Next credentials from Vault
- run Maven Sonar analysis

#### `analyze_shadows`

Nightly-only twin of `analyze_primary`:

- runs against shadow platforms
- matrix includes SonarCloud EU and SonarQube US

#### Plugin QA family

These jobs all consume:

- `sonarjs-m2` artifact from `build`
- Maven cache
- often orchestrator cache
- various licenses and runtime credentials

Variants differ by:

- Node present vs disabled
- normal vs `fast`
- Linux vs Windows vs Alpine
- `LATEST_RELEASE` vs nightly `DEV`

Important details:

- Alpine jobs pre-seed `BUILD_NUMBER` from `get_build_number` because the `get-build-number` action's GitHub cache approach is unreliable in Alpine-container context
- `fast` jobs use `key-prefix: orchestrator-fast`
- `DEV` jobs intentionally skip orchestrator cache because the target version changes too frequently

#### `js_ts_ruling`

Responsibilities:

- checkout with submodules
- restore `node_modules`
- download refreshed RSPEC data
- run JS/TS ruling
- on PRs or default branch, delegate ruling report, fix-PR, and comment handling to `./.github/actions/ruling_bot`
- pass explicit `new-results-path` and `old-results-path` inputs so the action only depends on sonar-lits result JSON semantics, not on a fixed SonarJS directory layout
- pass source-tree and link inputs so the action can render the same rule-centric PR ruling report format with RSPEC links, source links, inline snippets, and a collapsible full report
- fail the workflow when ruling needs an update

This job is more than test execution; it is also automated ruling maintenance.

#### `ruling`

Responsibilities:

- checkout with submodules
- restore Maven cache
- download `sonarjs-m2`
- configure Maven
- optionally restore orchestrator cache with `save: 'false'`
- run Maven ruling tests with explicit parallelism cap
- upload `ruling-differences` on failure

Note the explicit `save: 'false'`:

- this job may benefit from a recent orchestrator baseline
- but it should not publish new orchestrator cache state

### Finalization

#### `run_iris`

Nightly-only post-analysis comparison:

- runs only after primary and shadow analyses
- compares Next against shadow platforms through the dedicated IRIS action

#### `promote`

This is the main fan-in gate.

It waits for:

- build
- Windows build
- JS tests
- Windows JS tests
- primary analysis
- ESLint plugin tests
- Linux/Windows/Alpine plugin QA jobs
- ruling jobs
- build-number generation

Then it runs `SonarSource/ci-github-actions/promote@v1`, which promotes build info/artifacts in Repox.

#### `releasability`

Final branch-level status job:

- runs only after successful promote
- only on `master`, `branch-*`, and `dogfood-*`
- computes releasability state and updates GitHub commit status

## Repox, Vault, RSPEC, Sonar Platforms, And Other External Systems

### Repox / Artifactory

Repox is the repository manager behind both npm and Maven flows here.

#### npm

Both Linux and Windows cache-population jobs:

- fetch a private-reader token from Vault
- run:
  - `npm config set //repox.jfrog.io/artifactory/api/npm/:_authToken=...`
  - `npm config set registry https://repox.jfrog.io/artifactory/api/npm/npm/`

#### Maven

`config-maven`:

- defaults `repox-url` to `https://repox.jfrog.io`
- writes Maven `settings.xml`
- sets `SONARSOURCE_REPOSITORY_URL=$ARTIFACTORY_URL/sonarsource-qa`
- exports authentication environment variables for Maven

`build` additionally fetches deployer credentials and pushes to `sonarsource-public-qa`.

`promote` later promotes the produced build info/artifacts in Artifactory.

### Vault

Vault is the central credentials source. Typical secrets include:

- Artifactory reader token for npm/Maven reads
- Artifactory deployer token for `build`
- Artifactory promoter token for `promote`
- signing key and passphrase
- RSPEC GitHub token
- SonarQube platform URLs and tokens
- GitHub token for licenses access

### RSPEC

The private RSPEC repository is consumed only through `prepare_rspec_rule_data` in this workflow. The result is then frozen into the run-local `rspec-rule-data-${github.sha}` artifact and reused downstream.

### Sonar platforms

The workflow targets:

- SonarQube Next in `analyze_primary`
- SonarCloud EU in `analyze_shadows`
- SonarQube US in `analyze_shadows`
- IRIS comparison across those platforms during nightly runs

## External Actions Used By `build.yml`

These are the most important reusable components in the current pipeline.

| Action                                                     | Approx. uses in `build.yml` | Purpose                                                                                                    | Cache / artifact relevance                             |
| ---------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `actions/checkout`                                         | 28                          | source checkout                                                                                            | none                                                   |
| `jdx/mise-action`                                          | 26                          | provision Java, Maven, Node                                                                                | action-managed runtime cache behavior                  |
| `actions/download-artifact`                                | 28                          | same-run file handoff                                                                                      | run-local artifact consumption                         |
| `SonarSource/vault-action-wrapper`                         | 18                          | credentials from Vault                                                                                     | none directly, but enables Repox/RSPEC/Sonar access    |
| `./.github/actions/maven-cache`                            | 17                          | repo-owned Maven cache policy                                                                              | official GitHub cache, restore-only on branches        |
| `SonarSource/ci-github-actions/config-maven`               | 17                          | Maven + Repox setup                                                                                        | built-in caching disabled in this workflow             |
| `actions/cache/restore`                                    | 10                          | restore-only cache consumers                                                                               | direct GitHub cache use                                |
| `./.github/actions/orchestrator-cache`                     | 9                           | repo-owned orchestrator cache policy                                                                       | official GitHub cache, rolling monthly prefix          |
| `actions/upload-artifact`                                  | 8                           | same-run file handoff                                                                                      | artifact production                                    |
| `actions/cache`                                            | 6                           | cache producer/probe jobs, including Linux and Windows CycloneDX CLI caches                                | direct GitHub cache use                                |
| `SonarSource/ci-github-actions/get-build-number`           | 1                           | stable build number                                                                                        | internally uses GitHub cache                           |
| `./.github/actions/ruling_bot`                             | 1                           | repo-owned ruling report/comment/fix-PR automation for sonar-lits result trees and rich PR ruling comments | control-plane encapsulation, no direct cache semantics |
| `./.github/actions/rule-api-cache`                         | 1                           | repo-owned rule-api cache policy                                                                           | official GitHub cache, rolling prefix                  |
| `peter-evans/create-pull-request`                          | 1                           | nightly generated-files PR                                                                                 | none                                                   |
| `SonarSource/unified-dogfooding-actions/run-iris`          | 1                           | nightly cross-platform comparison                                                                          | none                                                   |
| `SonarSource/ci-github-actions/promote`                    | 1                           | Artifactory/Repox promotion                                                                                | downstream of all build/test gates                     |
| `SonarSource/gh-action_releasability/releasability-status` | 1                           | releasability commit status                                                                                | none                                                   |

## Toolchain Provisioning (mise)

Java, Maven, and Node for CI are declared exactly once, in the repo-root [`mise.toml`](../mise.toml):

```toml
[tools]
java = "21.0"
maven = "3.9"
node = "24.11.1"
```

Every `jdx/mise-action` step in `build.yml` picks this up automatically — **no job in `build.yml` passes its own `mise_toml` input.** Passing that input would overwrite the tracked file on the runner (`mise-action` writes it to `mise.toml` in the working directory), which is exactly what jobs used to do before this file existed, each restating the same three versions inline.

### Installing only a subset of tools

A job that does not need every tool restricts installation with `install_args` instead of restating versions:

| Job(s)                                                                                                                                                                                          | `install_args`                 | Why                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`, `build_win`, `prepare_rspec_rule_data`, `build_eslint_plugin`, `knip`, `analyze_primary`, `analyze_shadows`, Windows QA jobs, `js_ts_ruling`, `ruling`, `promote` (the `&mise` anchor) | _(none — installs everything)_ | needs Java, Maven, and Node                                                                                                                                |
| `plugin_qa_with_node`, `plugin_qa_fast_with_node` (the `&mise_java_matrix_node` anchor)                                                                                                         | _(none — installs everything)_ | same as above, but Node's version is overridden per matrix leg (see below)                                                                                 |
| `populate_npm_cache`, `populate_npm_cache_win`, `test_js`, `test_js_win`                                                                                                                        | _(none — installs everything)_ | same as `&mise`, but these steps carry their own `if: cache-hit != 'true'` guard, so they can't use the anchor and appear as separate inline steps instead |
| `plugin_qa_without_node`, `plugin_qa_without_node_dev`, `plugin_qa_fast_without_node`, `plugin_qa_fast_without_node_dev` (the `&mise_java_only` anchor)                                         | `java maven`                   | Node must be absent so "QA without Node" actually tests without Node                                                                                       |
| `plugin_qa_without_node_alpine`, `plugin_qa_fast_without_node_alpine` (the `&alpine_setup_maven` anchor)                                                                                        | `maven`                        | the Alpine container image already ships its own JDK; only Maven is missing                                                                                |
| `test_eslint_plugin`                                                                                                                                                                            | `node`                         | ESLint plugin tests only need Node, at a matrix-driven version (see below)                                                                                 |

A tool declared in `mise.toml` but omitted from `install_args` is simply left uninstalled: `mise ls` reports it `(missing)`, no shim is created for it, and `mise env` does not export it (confirmed against the pinned Alpine image — the container's own `JAVA_HOME` survives untouched). This is what makes the Alpine/`_only` rows above safe even though `mise.toml` also declares tools they don't want.

### Overriding one tool's version per job (matrix Node versions)

`plugin_qa_with_node`, `plugin_qa_fast_with_node`, and `test_eslint_plugin` each need a _different_ Node version per matrix leg instead of `mise.toml`'s default. They override it at runtime with a `MISE_<TOOL>_VERSION` env var, e.g.:

```yaml
plugin_qa_with_node:
  env:
    BUILD_NUMBER: ${{ needs.get_build_number.outputs.build-number }}
    MISE_NODE_VERSION: ${{ matrix.node-version }}
  steps:
    - uses: jdx/mise-action@...
      with:
        cache_key: '{{default}}-{{env.MISE_NODE_VERSION}}'
```

Two rules — getting the first one wrong is a silent _correctness_ bug; getting the second one wrong is only a _cache-efficiency_ problem, but both are worth getting right:

1. **Declare the env var at job level, not on the mise-action step.** This one has no safety net — get it wrong and there is no test failure to catch it. `mise-action` puts mise's shim directory on `PATH` for every later step in the job (not just its own). Those shims resolve the tool version at invocation time from whatever's in the environment then. A step-scoped `env:` on the mise-action step only exists while that one step runs, so every subsequent step (npm scripts, the Maven QA run, ...) would silently fall back to `mise.toml`'s default version instead of the matrix leg's.
2. **Pass an explicit `cache_key` that includes the env var.** `mise-action`'s default cache key is `{{cache_key_prefix}}-{{platform}}-{{version}}[-{{mise_env}}][-{{install_args_hash}}][-{{bootstrap_hash}}]-{{file_hash}}` (`{{version}}` here is the pinned _mise binary_ version, e.g. `2026.8.14` — not a provisioned tool's version) — `file_hash` is a hash of the mise config files, and nothing in that template reflects a `MISE_<TOOL>_VERSION` override. Since `mise.toml` is now identical across every matrix leg, legs with a _different_ Node version would resolve to the same default key and fight over one shared cache entry unless `cache_key` folds the env var in explicitly (as shown above). Getting this wrong doesn't break the override itself — `mise install` still installs the version `MISE_NODE_VERSION` asks for regardless of what the restored cache contained — it just means wasted downloads and cache churn between legs. Two legs that happen to want the _same_ Node version (e.g. `test_eslint_plugin`'s `eslint-9` and `eslint-8` matrix entries, both on Node 18.18.0) correctly still share one cache entry; that's fine, since they install the identical toolset.

Also note: `install_args_hash` already differentiates jobs with different `install_args` sets (e.g. the `java maven`-only jobs never collide with the full-install jobs), so the explicit `cache_key` above is only needed for the _env-var-override_ case, not for the `install_args`-restriction case.

### Keeping the JS unit-test skip-cache honest

`setup`'s `js-files-hash` step (`build.yml`, "Compute JS test hash for skip caching") hashes a `find` list that includes `mise.toml`. This matters because `test_js`/`test_js_win` use that hash as their skip-cache key: on a hit, `test_js` skips checkout/mise/npm/test entirely but still runs its unconditional coverage-upload step, publishing whatever coverage was already in the restored cache; `test_js_win` is a `lookup-only` marker with no upload step at all, so its failure mode is simpler but just as invisible — it reports green having run nothing. Before `mise.toml` existed, the tool versions lived inside `build.yml` itself, which _is_ in that hash, so a version bump correctly invalidated the skip cache and forced a real re-run. `mise.toml` has to stay in that `find` list for the same property to hold: without it, bumping `mise.toml` alone would hit the stale cache and never re-run on the new toolchain.

Being _in_ the hash isn't sufficient on its own, though — the hash is over `mise.toml`'s _text_, not the version mise actually resolves at runtime. A fuzzy spec like `node = "24.11"` has the same declared text before and after a new `24.11.x` patch ships, so the skip-cache key wouldn't change even though the Node runtime under test would. That's why `node` is pinned to an exact version (`24.11.1`) above rather than left fuzzy like `java`/`maven`: `java`/`maven`'s exact patch doesn't affect `test_js`'s behavior (that job never touches Maven, and Java only matters to Maven-based jobs, which have no equivalent skip-cache), but Node's does, so Node's declared and resolved versions have to be the same value at all times. See [Why Node is pinned exactly, and every other version is a fuzzy minor spec](#why-node-is-pinned-exactly-and-every-other-version-is-a-fuzzy-minor-spec) below.

### The one workflow that only conditionally needs an inline `mise_toml`

[`sqaa-release.yml`](../.github/workflows/sqaa-release.yml) is `workflow_call`-only and checks out `ref: ${{ inputs.ref }}` — a ref supplied by its callers (`automated-release.yml` passes `refs/tags/<version>`, `docker-sqaa.yml` passes `${{ inputs.branch || github.ref }}`) that is **decoupled** from the workflow file's own ref. That checkout can land on a tag or branch that predates `mise.toml`.

Rather than keep a hand-maintained inline block that has to be updated every time `mise.toml` changes (an early version of this section documented exactly that approach, and it already drifted once within this same PR), the workflow instead checks whether the _checked-out ref_ has its own `mise.toml` and only falls back to a hardcoded snapshot when it genuinely doesn't:

```yaml
- name: Fall back to a pinned toolchain only if the checked-out ref predates mise.toml
  id: mise-fallback
  run: |
    if [ -f mise.toml ]; then
      echo "toml=" >> "$GITHUB_OUTPUT"
    else
      { echo "toml<<MISE_TOML_EOF"; echo '[tools]'; echo 'java = "21.0"'; echo 'maven = "3.9"'; echo 'node = "24.11.1"'; echo "MISE_TOML_EOF"; } >> "$GITHUB_OUTPUT"
    fi

- uses: jdx/mise-action@...
  with:
    mise_toml: ${{ steps.mise-fallback.outputs.toml }}
```

An empty `mise_toml` input is falsy, so `mise-action` skips writing it and just reads whatever `mise.toml` the checkout brought with it — no drift possible for any ref recent enough to have the file. The hardcoded fallback only ever applies to refs old enough to predate `mise.toml` entirely, so it's a frozen historical snapshot, not something that needs to track future bumps.

No other workflow needs any of this. In particular, [`release_eslint_plugin.yml`](../.github/workflows/release_eslint_plugin.yml) looks superficially similar (it's also a manually-triggered release workflow) but is _not_ exposed: it is `workflow_dispatch`-only with no `ref` input, and its checkout takes no `ref:` either, so the workflow file and the checked-out tree always come from the same commit — dispatching an old ref just runs _that ref's own_ copy of the file. Don't add a `mise_toml` block back there.

### Why Node is pinned exactly, and every other version is a fuzzy minor spec

`mise.toml` uses `java = "21.0"` and `maven = "3.9"` — minor-precision fuzzy specs — but pins `node = "24.11.1"` to an exact patch. This isn't an inconsistency; each is deliberate, for different reasons:

- **Node has to be exact because its resolved version feeds a cache key that only encodes declared text, not resolved version** (see [Keeping the JS unit-test skip-cache honest](#keeping-the-js-unit-test-skip-cache-honest) above, and the same is true of `mise-action`'s own cache key). A fuzzy `node = "24.11"` would keep the same declared text across a `24.11.1` → `24.11.2` patch release, so every hash keyed on that text would stay unchanged even though the actual Node runtime under test would not — a real toolchain change with zero corresponding cache invalidation. Pinning exactly means the declared version and the resolved version are always the same value, closing that gap outright.
- **Java and Maven stay fuzzy because nothing about their exact patch feeds any skip-cache key that matters.** `test_js`/`test_js_win` never touch Maven and don't run under a JVM, so a Java or Maven patch bump has no equivalent staleness risk to close.
- **This doesn't cut Node off from Renovate.** The repo's shared Renovate preset disables only _patch_-type updates for mise-managed tools (`matchUpdateTypes: ["patch"]`) — minor and major updates still flow normally to a pinned dependency. To keep Node's patch releases flowing too (since those matter for a runtime, unlike Java/Maven's), [`.github/renovate.json`](../.github/renovate.json) adds a narrow override that re-enables patch updates for just the `node` mise dependency. Each such bump lands as an ordinary PR that changes `mise.toml`'s text — which is exactly the property an exact pin is supposed to guarantee, and a fuzzy spec can't.

### Gotcha: GitHub Actions does not support YAML merge keys

`build.yml` uses YAML anchors/aliases extensively (`&name` / `*name`) to reuse step and job fragments, and that works fine on GitHub Actions. **Merge keys (`<<: *anchor`) do not** — GitHub's workflow parser rejects them, even though most local YAML tooling (`js-yaml`, `pyyaml`, etc.) accepts merge keys and will validate the file successfully. A workflow file broken this way doesn't show up as a failed `Build` check: GitHub can't parse the file well enough to know which triggers apply, so it emits a separate `push`-triggered run named after the workflow file itself (visible via `gh run list`, not in the PR's check list) and the real `Build` workflow simply never runs on that commit — which can look like unrelated checks (SCA/Gitar/security scans) are green when the thing that actually matters isn't running at all. If you need to combine an anchored base mapping with per-job overrides, write the keys out explicitly instead of merging.

### Jobs the nightly schedule gates — no PR run ever exercises them

Several jobs/steps are guarded by `if: github.event_name == 'schedule'`, and GitHub only fires `schedule` on the default branch — so they don't run on `push`, `pull_request`, or even a manual `workflow_dispatch`: `plugin_qa_without_node_dev`, `plugin_qa_without_node_alpine`, `plugin_qa_fast_without_node_dev`, `plugin_qa_fast_without_node_alpine`, `analyze_shadows`, `run_iris`, `generated_files_freshness`, and the nightly steps inside `build_eslint_plugin`. A change that only affects one of these (like an Alpine-container `install_args` tweak) gets **no CI signal at all** until the first post-merge nightly.

Do not "fix" this by dispatching `build.yml` manually to force them — a `workflow_dispatch` run satisfies `github.event_name != 'pull_request'`, so it will also run `build`'s `mvn deploy -Pdeploy-sonarsource,coverage,sign,release,sbom -T1C` and the `promote` job, publishing and promoting real artifacts in Repox from a throwaway ref. For container-specific behavior (e.g. the Alpine jobs), reproduce it locally instead: run the exact pinned container image with the exact pinned `mise` version (`curl https://mise.run | MISE_VERSION=v<pinned> sh`) and mount in `mise.toml`, rather than the version installed on your own machine.

## PR Cleanup Workflow

The repository also defines a companion workflow:

- [`../.github/workflows/pr-cleanup.yml`](../.github/workflows/pr-cleanup.yml)

It runs on `pull_request.closed` and uses `SonarSource/ci-github-actions/pr_cleanup@v1`.

The workflow is intentionally separate from [`../.github/workflows/PullRequestClosed.yml`](../.github/workflows/PullRequestClosed.yml):

- `PullRequestClosed.yml` handles Jira/backlog behavior
- `pr-cleanup.yml` handles GitHub Actions resource cleanup

The workflow shape is:

```yaml
name: Cleanup PR Resources
on:
  pull_request:
    types:
      - closed

jobs:
  cleanup:
    runs-on: github-ubuntu-latest-s
    permissions:
      actions: write
    steps:
      - uses: SonarSource/ci-github-actions/pr_cleanup@v1
```

What it helps with in SonarJS:

- delete PR-scoped GitHub caches after the PR closes
- delete branch-run artifacts for the PR's head branch
- reduce stale GitHub cache/artifact footprint created by:
  - build-number caches
  - `node_modules` caches
  - JS coverage and Windows JS marker caches
  - action-owned GitHub caches such as `mise`
  - large short-lived artifacts like `sonarjs-m2` and `maven-targets`

What it would **not** help with:

- default-branch caches used as warm shared sources
- restore-only branch consumers of Maven/orchestrator/rule-api caches

So the value of `pr-cleanup.yml` is:

- yes for housekeeping and storage churn reduction
- no as a correctness or performance fix for active PRs

## Mental Model Summary

If you remember only one model, remember this one:

1. `setup` computes all cache keys and matrix inputs.
2. `get_build_number` mints one build number.
3. `populate_npm_cache*` are producer/probe jobs for `node_modules`.
4. `prepare_rspec_rule_data` is the one RSPEC refresh job.
5. `build` is the main artifact producer.
6. downstream jobs either:
   - restore caches for reusable dependency state, or
   - download artifacts for exact same-run payloads
7. `promote` is the fan-in gate for artifact promotion.
8. `releasability` is the final status gate.

And for caches specifically:

- GitHub cache is the direct mechanism in this workflow
- artifacts carry run-local build products
- default branch is the intended long-lived producer for shared warm caches
