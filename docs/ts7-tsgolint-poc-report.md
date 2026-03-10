# TypeScript 7 / tsgolint gRPC PoC Report ([JS-1140](https://sonarsource.atlassian.net/browse/JS-1140))

Date: 2026-03-10  
Branch: `feat/tsgolint-grpc-poc`  
Issue: [JS-1140](https://sonarsource.atlassian.net/browse/JS-1140) (`Investigate migration to TypeScript 7`)

## 1. Executive Summary

This PoC validated that SonarJS can offload a subset of type-aware TypeScript rules to a Go binary (`tsgolint`) via gRPC, while keeping Node.js as the mandatory primary analyzer. Non-typechecked analysis stays in Node.js/ESLint (including community rules), Vue remains Node-only, Babel fallback remains Node-only, and CSS analysis remains in Node via stylelint.

What is proven:

- End-to-end integration works in SonarJS: Java sensor -> Go gRPC server -> tsgolint rule execution -> Sonar issue import.
- 7 real type-aware rules are offloaded and reported with correct Sonar rule keys.
- A fast integration test (`TsgolintIntegrationTest`) validates that the offloaded rules actually raise issues on fixture code.
- Packaging/deployment path for platform-specific `tsgolint` binaries is integrated in the plugin build and runtime extraction flow.

What is not yet proven:

- Global performance impact on representative SonarJS workloads (including large projects and mixed JS/TS/Vue).
- Bundle-size impact against release constraints (especially `multi` artifact).
- Behavioral parity for offloaded TypeScript type-checked semantics (tsconfig discovery, orphan-file handling, SonarLint incremental typed flows).
- Compatibility impact on Sonar Architecture UDG generation path, which currently relies on Node.js TypeScript parser services.
- SonarLint/IDE packaging viability for Go offload: historical `main`-artifact + user-installed-Node model keeps Node analysis working but cannot run Go offload and may conflict with marketplace package-size limits if binaries are bundled.
- Stability of long-term maintenance around `tsgolint`/`typescript-go` shim internals and patch management.

## 2. Scope and Inputs

### Evidence base

Detailed source inventory is in the appendix. Conclusions here are based on [JS-1140](https://sonarsource.atlassian.net/browse/JS-1140) discussions, the PoC branch implementation and tests, PR review comments, and measured artifact/build outputs.

### Scope of this report

- Evaluate this PoC as implemented (not only researched alternatives).
- Separate evidence-backed conclusions from assumptions.
- Provide options and tradeoffs, including split-sensor architecture.
- Recommend concrete next steps and decision gates.
- Architecture invariant in scope: Node.js remains permanent and authoritative for non-typechecked analysis (ESLint/community rules), Vue, Babel fallback, and CSS/stylelint. This PoC evaluates Go offload only for selected TypeScript type-checked rules.

## 3. What Was Implemented in This PoC

### 3.1 Runtime integration

- Added a gRPC analyzer contract (`analyzer.proto`) with:
  - `AnalyzeProject` (server-streaming results)
  - `IsAlive`
- Implemented Go server in `sonar-plugin/bridge/src/main/go/sonar-server`:
  - Request handling
  - tsconfig resolution via tsgolint utilities
  - Rule selection from request
  - Diagnostics conversion to proto issues
- Implemented Java gRPC client process manager:
  - Starts/stops `tsgolint` subprocess
  - Health-check polling
  - Streams issues into Sonar pipeline

### 3.2 Sensor orchestration

- `WebSensor` now:
  - Starts tsgolint only when relevant rules are enabled and binary is available.
  - Runs regular Node bridge analysis.
  - Runs tsgolint analysis and imports issues.
  - Excludes offloaded rules from the Node bridge request to avoid duplicate reporting.

### 3.3 Rule mapping and conversion

- Added explicit mapping between Sonar keys and tsgolint rule names for 7 rules:
  - S4123, S2933, S4157, S4325, S6565, S6583, S6671
- Added reverse conversion for incoming tsgolint diagnostics to Sonar issue keys/language.

### 3.4 Packaging and deployment

- Added `TsgolintBundle`:
  - Loads compressed binary from plugin resources
  - Deploys to `${sonar.userHome}/js/tsgolint/<hash>/...`
  - Handles platform-specific binary names and permissions
- Added Maven build flow to:
  - Initialize submodules
  - Apply tsgolint/typescript-go patches
  - Generate Go gRPC stubs
  - Cross-compile binaries for 6 platforms
  - Compress and embed binaries in shaded artifacts
- Added `skip-tsgolint` profile to skip tsgolint build phases when not needed.

### 3.5 Test coverage added

- Added fast integration test:
  - `its/plugin/fast-tests/src/test/java/com/sonar/javascript/it/plugin/TsgolintIntegrationTest.java`
- Added test fixtures and quality profile:
  - `its/plugin/projects/tsgolint-test/*`
  - `its/plugin/fast-tests/src/test/resources/tsgolint-rules.xml`
- The test asserts:
  - analysis exit code = 0
  - no ERROR logs
  - all 7 offloaded rules produce issues
  - issues are associated to expected files for sampled rules

## 4. What This PoC Proves

### 4.1 Proven

- Feasibility of hybrid execution model:
  - Node remains mandatory primary analyzer by design.
  - Node continues to own non-typechecked analysis, Vue, Babel fallback, and CSS/stylelint.
  - Go handles selected type-aware rules.
  - Results merge into a single Sonar issue stream.
- Feasibility of process lifecycle:
  - binary extraction
  - subprocess startup
  - gRPC health checks and streaming consumption
- Feasibility of incremental typed-rule offload strategy:
  - offload subset while preserving existing architecture

### 4.2 Proven with caveats

- The classloader/runtime issue on gRPC client side can be mitigated by:
  - using `grpc-okhttp`
  - explicitly registering `PickFirstLoadBalancerProvider`
- This solves the observed startup/runtime behavior in this environment, but should still be considered runtime-coupled and regression-prone until exercised across all supported products/environments.

### 4.3 Not proven

- End-user speedup for SonarJS analysis at product scale.
- Memory reduction in real projects.
- Full parity for offloaded TypeScript type-checked semantics and edge cases.
- Long-term maintainability cost of shim/patch coupling.

## 5. Alternative TS Type-Checking Paths Considered (from [JS-1140](https://sonarsource.atlassian.net/browse/JS-1140) + supporting reports)

### 5.1 `@typescript/api` IPC path

- Current status (as of 2026-03-10, based on [JS-1140](https://sonarsource.atlassian.net/browse/JS-1140) comments and referenced upstream trackers): API incomplete for SonarJS needs.
- Research notes reported:
  - only a small subset of required checker APIs exposed
  - simulated IPC overhead significant for linter-like workloads
- Implication: not currently viable as a near-term performance path.

### 5.2 WASM / napi-go shim approaches

- Keep JS rule code, proxy type checker calls to Go backend.
- Risks highlighted in research:
  - proxy completeness/silent mismatch risk
  - runtime constraints (WASM) or runtime-signal/interop risks (napi-go)
- Implication: technically interesting but high implementation risk and low durable value.

### 5.3 Go-rule migration via tsgolint (PoC path)

- Chosen for this PoC because:
  - viable now
  - direct typed-rule execution in Go
  - reusable progress per migrated rule

### 5.4 AST-fallback path for selected typed rules (contingency)

- Additional assessment report: <https://gist.github.com/vdiez/3623573cf396d9108af6f989791b270a>.
- Related impact report (no type-checker available during analysis): <https://gist.github.com/vdiez/8cafc03810759a86a46c13436956d721>.
- If a TS7-compatible analyzer path is delayed, part of the current type-checker-dependent rule set may still be adapted to full-AST heuristics.
- If no type-checker is available at analysis time, type-aware rule behavior/coverage is reduced; fallback candidates should be treated as compensating controls, not parity-equivalent replacements.
- The report classifies 48 assessed rules into:
  - Easy: 4
  - Medium: 9
  - Hard: 16
  - Impossible: 19
- Implication: this is a viable contingency to preserve partial rule coverage, but only for a bounded subset and with explicit accuracy tradeoffs (higher false positives/false negatives than type-aware execution).

## 6. Split-Sensor Architecture Evaluation

Question: split into two sensors (Node sensor + Go sensor), run serially, conditionally trigger Go sensor for selected TypeScript type-checked rules.

Feasible design variant:

- Shared abstract sensor for common orchestration logic.
- `NodeSensor` and `GoSensor` subclasses with bridge-specific execution (`node bridge` vs `tsgo bridge`).
- Explicit execution ordering via Sonar sensor dependency annotations (`@DependsUpon` / `@DependedUpon`).

### 6.1 Potential advantages

- Clearer ownership boundary and simpler mental model per sensor.
- Better fault isolation at sensor level.
- Easier to disable/roll back Go path independently.

### 6.2 Potential drawbacks

- Duplication is avoidable but not free:
  - a shared abstract sensor reduces repeated logic
  - shared abstractions still need strict contracts to prevent behavior drift
- Residual parity risk remains at integration boundaries:
  - rule routing and de-duplication between sensors
  - cache/state handoff and configuration consistency
- Higher operational complexity in SonarQube/SonarLint flows.
- Harder end-to-end optimization:
  - shared data/caches become harder across sensor boundary.

### 6.3 About TS7-based trigger logic

- Triggering Go sensor only when "TypeScript 7 detected" is likely too coarse.
- Better trigger dimensions:
  - offloaded-rule activation in quality profile
  - file/language presence
  - binary availability/platform support
  - explicit feature flag for rollout

### 6.4 Recommendation

- A split-sensor model is technically viable and can be implemented without major logic duplication if built around a shared base sensor + explicit dependency ordering.
- Near term for this PoC: keep one orchestration sensor (`WebSensor`) to minimize moving parts while stabilizing parity, size, and SonarLint strategy.
- Re-evaluate split-sensor when one of these becomes dominant:
  - offloaded rule set grows significantly
  - independent lifecycle/release cadence is required
  - single-sensor observability/maintainability becomes a bottleneck
- Node remains mandatory by architecture:
  - non-typechecked analysis and ESLint community rules remain Node-owned
  - Babel fallback and Vue analysis remain Node-only
  - CSS analysis remains Node-owned via stylelint
  - Sonar Architecture UDG generation remains dependent on Node TypeScript parser-services/AST flow

## 7. Risk Register

### 7.1 Product/behavior risks

- Rule parity drift between Node and Go implementations.
- Missing parity for offloaded TypeScript type-checked behaviors:
  - tsconfig path semantics
  - fallback/no-program behavior
  - incremental SonarLint typed model
- Scope-boundary risk:
  - Vue/Babel fallback and CSS/stylelint paths are intentionally Node-owned and not migration targets for Go
  - accidental routing of those paths to Go would cause regressions
- Sonar Architecture coupling risk:
  - `sonar-architecture` frontend JavaScript package currently generates UDG from TypeScript AST through Node parser services.
  - A migration that reduces or alters Node TypeScript semantics can break architecture-graph generation or produce divergence from current UDG output.

Mitigation:

- Rule-by-rule parity harness and fixture comparisons.
- Explicit "not yet offloaded" boundaries with owner and timeline.
- Add explicit routing guards/tests so only selected TypeScript type-checked rules are sent to Go; keep Vue/Babel/CSS paths in Node.
- Add cross-repo contract tests with Sonar Architecture UDG fixtures before any broader TS-engine migration.
- Keep Node TypeScript parser-services path stable until UDG generation has an agreed replacement or compatibility layer.

### 7.2 Upstream coupling risks

- tsgolint depends on shim/internal `typescript-go` APIs.
- Local build currently applies patches to `typescript-go`.
- Upstream changes can break build/runtime semantics.

Mitigation:

- Pin submodule revisions.
- Add CI checks for patch applicability and breakage visibility.
- Engage upstream for stabilizing needed APIs.

### 7.3 CI/build/release risks

- Longer build times (Go toolchain + cross-compilation).
- Artifact size growth, especially for `multi` flavor.
- Packaging complexity and platform matrix maintenance.
- Artifact-selection risk: using the wrong plugin artifact can silently disable the Go offload path.

Mitigation:

- Use `skip-tsgolint` path for jobs that do not validate Go changes.
- Add dedicated Go-path test lane instead of broad default execution.
- Define and enforce size budgets.
- Add release-time checks that validate expected runtime assets are present in each published classifier.

### 7.4 Runtime risks

- gRPC/runtime classpath/provider coupling (already observed once).
- Process startup failures and binary extraction/deploy edge cases.

Mitigation:

- Keep health-check startup with clear logs/fallback behavior.
- Add platform matrix smoke checks in CI for binary startup.

### 7.5 SonarLint distribution/model risks

- Historical SonarLint model uses `main` plugin artifact and user-provided Node.js runtime.
- `main` artifact does not include Go binaries, so TS7 Go-offload path is unavailable in this model.
- Node-based analysis in this model remains available; the gap is specifically Go-offloaded typed rules.
- Bundling Go binaries directly in IDE distributions may violate practical marketplace package-size constraints (notably VSCode) and increase delivery friction.
- Resulting risk: server and IDE behavior divergence for typed rules, potentially blocking rollout expectations.

Mitigation options:

1. Keep SonarLint Node-primary and temporarily disable Go offload in IDE.
2. Runtime-download a signed platform Go binary on demand (cache in user home).
3. Publish platform-targeted IDE packages containing only one platform binary.
4. Keep analysis client-side in all modes; when a local Go binary is unavailable, skip Go-offloaded typed rules and rely on Node-owned analysis (plus approved AST fallbacks where applicable).
5. Keep current IDE path and wait for a JS-facing TS7 API path (`@typescript/api`) to become viable.

### 7.6 Observability and readiness risks

- During PoC iteration, scanner-side logging for the Go path was hard to observe in orchestrator/ruling contexts, slowing root-cause analysis.
- This creates a supportability risk: failures in binary startup, rule selection, or issue conversion are harder to triage quickly.
- PR quality signals also indicated temporary readiness debt during the PoC (a quality gate failure with low new-code coverage / new issues), reinforcing that additional hardening is still needed before broad rollout.

Mitigation:

- Add explicit structured diagnostics/telemetry for Go-path lifecycle:
  - binary deployment source/version/hash
  - server startup/health events
  - request rule counts and analyzed file counts
  - issue conversion/ingestion counters
- Ensure CI has at least one lane that enforces meaningful coverage and quality gates specifically for Go-offload integration code paths.

## 8. Bundle Size and Per-Platform Artifact Impact

Current packaging model embeds `tsgolint` binaries for:

- `win-x64`
- `linux-x64`
- `linux-x64-musl`
- `linux-arm64`
- `darwin-arm64`
- `darwin-x64`

Implications:

- Platform-specific plugin artifacts carry one compressed tsgolint binary.
- `multi` artifact carries all platform binaries, increasing size materially.
- Existing plugin-size enforcer was disabled for this PoC, so growth is currently unguarded.
- `main` artifact does not include `tsgolint` runtime assets (`tsgolint/**/*.xz`), so it cannot execute the TS7 Go-offload path.
- Most `main` artifact growth comes from additional Java dependencies/classes required for gRPC runtime integration, not from bundled Go binaries.

Measured comparison (baseline = latest `master` build from root `sizes.txt`, current = local `target` snapshot build):

| Artifact       | Baseline bytes | Current bytes | Delta bytes | Delta % |
| -------------- | -------------: | ------------: | ----------: | ------: |
| main           |     12,058,624 |    17,172,931 |  +5,114,307 | +42.41% |
| win-x64        |     34,498,150 |    48,353,276 | +13,855,126 | +40.16% |
| linux-x64      |     41,943,040 |    55,658,985 | +13,715,945 | +32.70% |
| linux-x64-musl |     42,781,901 |    56,479,757 | +13,697,856 | +32.02% |
| linux-arm64    |     40,894,464 |    53,583,946 | +12,689,482 | +31.03% |
| darwin-arm64   |     36,071,014 |    49,176,274 | +13,105,260 | +36.33% |
| darwin-x64     |     37,643,878 |    51,496,886 | +13,853,008 | +36.80% |
| multi          |    118,908,518 |   174,515,568 | +55,607,050 | +46.76% |
| sources        |        258,662 |       261,627 |      +2,965 |  +1.15% |

Notes:

- `multi` is the most impacted artifact (+55.6 MB, +46.8%).
- Platform-specific jars increased by roughly +12.7 MB to +13.9 MB each.

Artifact usability for TS7 PoC path:

| Artifact kind                                           | Includes `tsgolint` binary assets | TS7 Go-offload path |
| ------------------------------------------------------- | --------------------------------- | ------------------- |
| `main`                                                  | No                                | Not available       |
| Platform classifiers (`win-x64`, `linux-*`, `darwin-*`) | Yes (platform-specific)           | Available           |
| `multi`                                                 | Yes (all supported platforms)     | Available           |

Action needed:

- Re-enable plugin-size guardrails with explicit thresholds derived from these measured deltas.
- Decide acceptable caps per classifier and for `multi` before any rollout beyond PoC.
- Define publishing/consumption policy so TS7-capable deployments do not accidentally use `main`.

### 8.1 SonarLint-specific implication

Given the current artifact layout:

- `main` remains the only size-practical artifact in the current IDE distribution model, but it is not TS7-Go-capable.
- TS7-Go support in IDE therefore requires a local distribution strategy change (runtime download or platform-targeted packages), not only analyzer code changes.

## 9. Build Ownership and Maintainability

Current state:

- SonarJS owns a significant part of the `tsgolint` build orchestration.
- This increases maintenance cost and upgrade friction over time.

Strategic direction:

- Move toward clearer ownership boundaries where upstream owns how `tsgolint` is prepared/built and SonarJS owns plugin integration/packaging.
- Keep this migration incremental to preserve CI reproducibility and avoid introducing new build-tooling instability.

Decision implication:

- This is not a blocker for PoC validation, but it is a medium-term maintainability concern that should be addressed before broader rollout.

## 10. Recommended Next Steps

Recommendation: continue low-regret investment now, and defer irreversible commitments until checkpoint evidence confirms direction.

Decision matrix:

| Option            | Choose when                                                                                                                         | Do now                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Wait              | Ecosystem path is expected to be production-viable within the next 2 releases (through 2026-06-30) and PoC gains are still unproven | Limit work to monitoring and minimal maintenance only                             |
| Low-regret invest | Ecosystem direction is still uncertain, but PoC shows enough promise to reduce risk with bounded effort                             | Execute section 10.1 scope, keep architecture reversible, avoid broad commitments |
| Full commit       | PoC meets performance/parity/size gates and no lower-cost ecosystem path is expected in the next 2 releases (through 2026-06-30)    | Start broader rule migration and product rollout planning                         |

### 10.1 Short-term (1-2 sprints)

- Establish hard metrics:
  - analysis latency targets
  - memory targets
  - artifact-size budgets per classifier
- Build parity suite for the 7 migrated TypeScript type-checked rules versus current Node typed behavior.
- Add CI lane that validates Go path with `skip-tsgolint` enabled elsewhere to control build cost.
- Measure real artifact sizes from CI outputs and re-enable size guardrails with updated thresholds.
- Improve scanner-side observability in ITS/ruling runs (capture or emit Go-path diagnostics reliably).
- Build an AST-fallback contingency shortlist from the "Easy/Medium" set in the fallback report, with explicit FP/FN acceptance criteria per candidate rule.

### 10.2 Medium-term (3-6 sprints)

- Expand offloaded rule set incrementally (with parity gates), limited to selected TypeScript type-checked rules.
- Implement missing request semantics in Go path (`tsconfig_paths`, configuration fields) if required for parity.
- Define rollout strategy:
  - opt-in flag
  - fallback behavior if Go path unavailable
  - telemetry for adoption and failures
- Run an explicit ecosystem watch track in parallel:
  - monitor `@typescript/api` completeness/perf for linter workloads
  - monitor `typescript-go` public Go API direction and stability signals
  - reassess build-vs-buy decision at fixed checkpoints (for example, every release cycle)

### 10.3 Decision gate

Proceed beyond PoC only if all are true:

- Measured performance gain is material on representative projects.
- Bundle-size increase is within agreed budgets.
- No critical parity regressions on selected pilot rule set.
- Build/release overhead is acceptable for CI and product teams.
- No lower-cost ecosystem path (`@typescript/api` maturity or public Go API availability) is expected to become production-viable within the agreed decision horizon (next 2 releases, through 2026-06-30).
- The architecture remains reversible (clear boundaries, limited lock-in) so SonarJS can pivot if ecosystem options become better.

### 10.4 Recommended Investment Posture Under Ecosystem Uncertainty

Assumption anchor (as of 2026-03-10): `@typescript/api` and public TypeScript-Go API options remain uncertain for SonarJS production needs.

- Continue low-regret investments now (from 10.1):
  - parity/observability/reliability hardening on the existing PoC scope
  - SonarLint packaging strategy spike
  - size and CI guardrails
- Defer high-commitment investments until ecosystem checkpoints:
  - large-scale rule-porting program
  - non-reversible architecture changes
  - broad rollout promises across all products

Checkpoint trigger (suggested):

- Re-evaluate every release cycle or every 4-6 weeks, whichever comes first.
- Assign explicit owner: SonarJS TS7 initiative tech lead (or delegated architect).
- Publish a short checkpoint note after each review with decision: `wait`, `low-regret invest`, or `full commit`.
- Next checkpoint date: 2026-04-07.
- Switch to ecosystem-native path if evidence shows it is viable and lower cost.
- Continue Go-offload path only if ecosystem path remains blocked and PoC metrics continue to meet gates.

## 11. Open Questions (Need Product/Platform Input)

1. What is the maximum acceptable plugin size increase for:
   - platform-specific artifacts?
   - `multi` artifact?
2. Should Go-offloaded analysis be fail-open (skip Go rules on startup failure) or fail-fast?
3. Is partial rule migration acceptable in the medium term, or do we require near-complete typed-rule parity before shipping?
4. For SonarLint, what is the tolerance for behavior differences while incremental parity is incomplete?
5. Do we want a hard policy that all non-Go-code PRs use `-Pskip-tsgolint` in CI lanes by default?
6. For Sonar Architecture, do we commit to preserving current UDG output stability during this migration, and who owns the compatibility gate?
7. Which SonarLint strategy do we choose for TS7 support:
   - Node-primary with temporary Go-offload gap
   - runtime binary download
   - platform-targeted packaging
   - local AST-fallback for selected rules?
8. What is the formal ecosystem checkpoint cadence and the switch criteria for moving from PoC Go-offload to an ecosystem-native path (`@typescript/api` or public Go API)?
9. If TS7-compatible execution is delayed, which AST-fallback candidates (Easy/Medium) are acceptable to ship, and what accuracy budget (FP/FN) is acceptable?
10. Do we formalize the architecture invariant that Node remains authoritative for non-typechecked ESLint analysis, Vue, Babel fallback, and CSS/stylelint while Go is limited to selected TypeScript type-checked rules?

## Appendix: Sources

- [JS-1140](https://sonarsource.atlassian.net/browse/JS-1140) issue and comments (Atlassian Jira, queried via `acli`)
- Gist: TypeScript 7 integration paths and option matrix
  - <https://gist.github.com/vdiez/2a180c0159df55fa527f4cc182e3dee4>
- Gist: AST fallback feasibility for type-checker-dependent rules
  - <https://gist.github.com/vdiez/3623573cf396d9108af6f989791b270a>
- Gist: Impact of no type-checker during analysis
  - <https://gist.github.com/vdiez/8cafc03810759a86a46c13436956d721>
- Detailed PoC inputs reviewed:
  - Jira: [JS-1140](https://sonarsource.atlassian.net/browse/JS-1140) description + all comments (6 comments, 2026-02-03 to 2026-02-12)
  - PR #6458 comments (including review discussion on parity, classloader/runtime behavior, CI, and packaging)
  - Repo docs:
    - `docs/tsgolint-typescript-go-api-surface.md`
    - `docs/typescript-program-performance-comparison.md`
    - `docs/typescript-program-creation-guide.md`
  - Sonar Architecture frontend references (private repo):
    - `frontend/javascript/packages/jsts/src/engine/generateIrFromTSAst.ts`
    - `frontend/javascript/packages/jsts/src/rules/sonar-architecture-ir/rule.ts`
  - Current branch implementation snapshot (base vs `origin/master` at time of review):
    - 34 changed files, +2210/-115 LOC
- tsgolint upstream docs:
  - <https://github.com/oxc-project/tsgolint/blob/main/README.md>
  - <https://github.com/oxc-project/tsgolint/blob/main/CONTRIBUTING.md>
- Ecosystem status references:
  - typescript-eslint tracker: <https://github.com/typescript-eslint/typescript-eslint/issues/10940>
  - typescript-go IPC scaffold: <https://github.com/microsoft/typescript-go/pull/711>
  - typescript-go API discussion: <https://github.com/microsoft/typescript-go/discussions/455>
  - typescript-go public Go API discussion: <https://github.com/microsoft/typescript-go/discussions/481>
- Sonar sensor dependency model references:
  - `DependsUpon`: <https://github.com/SonarSource/sonar-plugin-api/blob/master/plugin-api/src/main/java/org/sonar/api/batch/DependsUpon.java>
  - ordering implementation (`AbstractExtensionDictionary`): <https://github.com/SonarSource/sonarqube/blob/master/sonar-scanner-engine/src/main/java/org/sonar/scanner/bootstrap/AbstractExtensionDictionary.java>
- Sonar Architecture frontend (private):
  - <https://github.com/SonarSource/sonar-architecture/tree/master/frontend/javascript/packages/jsts/src>
