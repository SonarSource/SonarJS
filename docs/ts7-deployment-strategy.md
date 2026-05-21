# TypeScript 7 Deployment Strategy

Date: 2026-05-21

Related Jira:

- [JS-1140](https://sonarsource.atlassian.net/browse/JS-1140) - investigate migration to TypeScript 7
- [JS-1506](https://sonarsource.atlassian.net/browse/JS-1506) - support TypeScript 7 with a Go-based JS/TS analyzer
- [JS-1743](https://sonarsource.atlassian.net/browse/JS-1743) - parity corpus and differential harness
- [JS-1744](https://sonarsource.atlassian.net/browse/JS-1744) - performance and memory benchmarks
- [JS-1748](https://sonarsource.atlassian.net/browse/JS-1748) - decide the runtime for AST-only TypeScript rules
- [JS-1749](https://sonarsource.atlassian.net/browse/JS-1749) - productize routing and packaging for SonarQube and SonarLint
- [JS-1750](https://sonarsource.atlassian.net/browse/JS-1750) - restore TS7 support for non-rule features and define rollout gates
- [JS-1761](https://sonarsource.atlassian.net/browse/JS-1761) - orphan-program caching follow-up

Related repository documents:

- [node-vs-jsts-go-equivalence-assessment.md](./node-vs-jsts-go-equivalence-assessment.md)
- [jsts-go-migration-progress.md](./jsts-go-migration-progress.md)
- [jsts-go-typescript-go-api-surface.md](./jsts-go-typescript-go-api-surface.md)
- [ts7-jsts-go-poc-report.md](./ts7-jsts-go-poc-report.md)
- [jsts-go-analyze-project-go-sketch.md](./jsts-go-analyze-project-go-sketch.md)
- [../server-go/UPSTREAM.md](../server-go/UPSTREAM.md)

## Executive Summary

The recommended strategy is a reversible hybrid, not a rushed replacement:

1. Keep the current Node.js analyzer as the main analyzer and orchestration point in the near term.
2. Keep the Go analyzer as a second execution path under active validation, and only promote it to production for eligible TS7 projects when it can be the sole typed-analysis owner for those projects.
3. Keep Node authoritative for the parts that the Go path does not cover today: Vue, embedded JS in HTML/YAML, Babel fallback, CSS/stylelint, and the current non-issue outputs and downstream integrations.
4. Treat SonarLint as a separate deployment problem from SonarQube/SonarCloud. Do not block all server progress on the IDE story, but do not pretend it is solved either.
5. Run an explicit ecosystem watch on the TypeScript 7 API/IPC path, but do not block all TS7 work on a future API that is not ready yet.

This means:

- Do not rush a Go-first replacement.
- Do not wait passively for the TypeScript 7 API either.
- Do build a productized server-first validation-and-cutover path now, with strict scope, telemetry, fallback rules, and clear rollback.

## TS7 Is Not A New Language-Support Problem

This point should be explicit for product and management discussions:

- supporting TypeScript 7 is not the same thing as supporting a new language
- TypeScript 7 is a new compiler and tooling generation, not a new JavaScript/TypeScript language family
- as of the current public TS7 direction, this transition is not primarily about new syntax or new language constructs that SonarJS would suddenly fail to parse

What this means in practice:

- TS7 becoming stable does not automatically mean "new TS7 codebases" are unreadable by SonarJS
- the first risk is not that users write radically new source syntax on day one
- for the current public TS7 transition, this is not primarily a "new language features" or "new syntax support" problem
- the first risk is that typed analysis, `tsconfig` handling, JavaScript/JSDoc behavior, and compiler/tooling integration drift away from the TS6-based assumptions in the current Node analyzer

So management should read "supporting TS7" as:

- keeping analysis reliable for codebases that adopt the TS7 compiler toolchain
- keeping typed rules correct and available
- keeping all typed-program-dependent features working
- handling compiler-version-driven config and API changes

and not as:

- adding support for a brand new language surface
- urgently teaching SonarJS a new syntax family before code can even be parsed

## What "Node Remains the Main Analyzer" Should Mean

Keeping Node as the main analyzer does not mean "do nothing". It means:

- Node remains the broad, battle-tested execution surface for JS/TS analysis as a whole.
- Node remains the owner of mixed-language and parser-sensitive paths.
- Go is introduced first in validation modes, and only later in production where it can own typed analysis coherently for eligible projects.
- The system remains understandable: Node is the primary pipeline, and Go is the alternative typed-analysis path under validation and possible future cutover.
- Unsupported Go cases fall back to Node-owned behavior or remain explicitly out of scope, instead of silently drifting.

In practice, Node should remain the main analyzer at least until all of the following are true:

- [JS-1743](https://sonarsource.atlassian.net/browse/JS-1743) parity coverage is broad enough to trust migrated rules.
- [JS-1744](https://sonarsource.atlassian.net/browse/JS-1744) has shown a material benefit on representative workloads.
- [JS-1748](https://sonarsource.atlassian.net/browse/JS-1748) is answered for AST-only TypeScript rules.
- [JS-1749](https://sonarsource.atlassian.net/browse/JS-1749) is solved for packaging, activation, and coexistence.
- [JS-1750](https://sonarsource.atlassian.net/browse/JS-1750) is solved for non-rule features and definition of done.
- At least one limited production phase has generated enough telemetry to understand failures, parity drift, and product support cost.

The right retirement condition for Node is evidence-based, not date-based.

## Current State

### What is already true

- The current Node analyzer is mature, broadly tested, and already deployed in products.
- The current Go runtime is no longer only a toy PoC. It already mirrors a meaningful part of the `analyze-project` semantics for the currently migrated subset.
- The current Go path is still a secondary JS/TS issue engine, not a full replacement for Node.
- `JsTsChecks.JSTS_GO_RULES` currently routes 16 Sonar rules to Go.
- The current migration inventory identifies 92 rules with a hard type-service dependency and 142 AST-only rules that are conditional on the future TS runtime choice.

### What is still missing or unresolved

- The Go path is still not the owner of Vue analysis.
- The Go path is still not the owner of embedded JS in HTML/YAML.
- The Go path is still not the owner of Babel fallback.
- The Go path is still not the owner of CSS/stylelint.
- The Go path still returns issues only, not the full Node result surface.
- Productization is still open for SonarLint.
- Release gating is still open for Architecture UDG, taint analysis, performance, memory, and artifact-size budgets.

### What deployment cost changes when Go becomes productized

The current Node model externalizes part of the runtime problem:

- a Node binary can exist in the environment or in the current product packaging model
- the analyzer logic stays mostly platform-neutral

The Go model internalizes that cost:

- SonarJS must ship binaries for every officially supported platform
- packaging and upgrade become a first-class product concern
- startup, extraction, permissions, signing, hashing, and caching become analyzer responsibilities
- SonarLint inherits a significantly harder distribution story than the current `main` artifact model

### Current deployment risks already visible in the repo

- The current PoC packaging snapshot increases `main` by about 42%, platform-specific artifacts by about 31-40%, and `multi` by about 47%.
- The current `main` artifact is not TS7-Go-capable because it does not embed Go binaries.
- The current SonarLint model is therefore not compatible with the Go path without a distribution change.
- The current Go path still has an accepted sidecar failure window if rules are removed from Node and the sidecar dies.

## External Ecosystem Checkpoint

As of 2026-05-21, the external ecosystem does not justify a wait-only strategy:

- Microsoft has stated in the [TypeScript 7 beta announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/) that the stable public compiler API is expected later, not in TS 7.0 itself.
- The [`typescript-eslint` tracking issue](https://github.com/typescript-eslint/typescript-eslint/issues/10940) for using the Go port is still blocked on external API readiness.
- The [`tsgolint` repository](https://github.com/typescript-eslint/tsgolint) is useful evidence that native typed linting can be fast, but it is not by itself a reason to assume the `typescript-eslint` ecosystem will switch quickly.

The practical implication is:

- keep monitoring the API/IPC direction closely
- do not make it the critical path for short-term SonarJS deployment decisions
- keep the current architecture reversible so SonarJS can pivot if TS 7.1-era APIs become good enough

## Date Anchors and Deadlines

This section separates public dates from recommended SonarJS planning dates.

### Public dates we can anchor on

- 2025-12-02: Microsoft said TypeScript 6.0 would be the last JavaScript-based release, with only infrequent 6.0.x patch releases after that, and that 6.0 was the bridge release toward 7.0.
- 2025-12-02: Microsoft also said they wanted 6.0 and 7.0 to stay as compatible as possible, but they also documented known gaps around the old tooling API and JavaScript/JSDoc behavior.
- 2026-03-23: TypeScript 6.0 was released.
- 2026-04-21: TypeScript 7.0 Beta was released.
- 2026-04-21: Microsoft said the current plan was to ship TypeScript 7.0 within the next two months, with a release candidate a few weeks before that stable release.
- 2026-04-21: Microsoft also said a stable programmatic API would not be available until at least several months later, with TypeScript 7.1 or later.
- 2026-05-21: As of today, the official TypeScript blog still shows the 2026-04-21 beta announcement as the latest public TS7 release post, so there is no public RC announcement yet.

### What this means for planning

- Earliest credible stable-release date: 2026-06-21.
- Most likely public stable-release window to plan against: late June to late July 2026.
- Earliest credible planning date for a stable TS7 programmatic API: September 2026.
- Safer planning assumption for depending on a production-usable TS7 API in external tooling: Q4 2026, not Q3 2026.

The last two bullets are planning inferences, not Microsoft commitments. They come from combining the 2026-04-21 beta statement about "at least several months" with the fact that the stable API is deferred to TypeScript 7.1 or later.

### When TS7 meaningfully diverges from TS6

If "diverge" means "pure `.ts` type-checking semantics become broadly different", the public signal is still reassuring:

- Microsoft says TypeScript 7.0 is intended to be compatible with TypeScript 6.0's type-checking and command-line behavior.
- Microsoft says any code that compiles cleanly with TypeScript 6.0, with `stableTypeOrdering` enabled and without `ignoreDeprecations`, should compile identically in TypeScript 7.0.

But if "diverge" means "users start hitting practical incompatibilities that matter to tools", divergence is already real in these areas:

- Since 2025-12-02 in planning terms, because Microsoft said 6.0 would be the last JavaScript-based release and not to expect a 6.1 line.
- Since 2026-03-23 in migration terms, because TypeScript 6.0 introduced deprecations and new defaults specifically to prepare for 7.0.
- Since 2026-04-21 in TS7 behavior terms, because the beta already hard-errors deprecated 6.0 options and changes JavaScript/JSDoc behavior.
- From the TS7 stable release onward, because ecosystem templates, docs, and developer expectations will progressively move to 7.0/7.x while 6.0 only receives rare patch servicing.

So the practical answer is:

- For typed `.ts` code, I would not expect a sudden wave of TS6-vs-TS7 semantic divergence on day one.
- For source-language support, I would not frame TS7 as "a new language that SonarJS must learn"; the more immediate problem is compiler-version and tooling compatibility.
- For `tsconfig` behavior, deprecated options, JavaScript checking, and JSDoc-heavy codebases, the divergence is already visible now in the public beta.

### When SonarJS should expect real pressure if it still relies on TS6

- By 2026-06-30: SonarJS should already have production monitoring for TS7-related analysis failures, even if rollout is still disabled by default.
- By 2026-07-31: SonarJS should have a guarded mitigation path for early TS7-specific failures that can still be handled in Node, especially `tsconfig` hard failures from deprecated options, and a clear server-side decision on whether Go is still validation-only or is close to a coherent single-owner cutover.
- By 2026-09-30: If SonarJS still has no credible server-side TS7 path for the hard type-service slice, I would treat that as "late".
- By 2026-12-31: If SonarJS is still effectively TS6-only for typed analysis, I would treat that as a strategic miss unless the TS7 API/tooling path has become clearly viable and near-term.

Those dates are recommendations, not public commitments. They are based on the published beta timeline, the lack of a planned 6.1 release, the limited servicing policy for 6.0.x, and the API delay to 7.1 or later.

### What kinds of analysis failures we should watch first

The first wave is unlikely to be "TS7 syntax appears and TS6 immediately cannot parse it". The earlier risks are:

- TS7-only hard errors around options deprecated in 6.0.
- Repositories that update their `tsconfig` and project assumptions for TS7 defaults.
- JavaScript/JSDoc-heavy repositories where TypeScript 7 changed behavior intentionally.
- Tooling/API mismatches when projects move their editor or build workflows to TS7 while external tools still expect the TS6-style API surface.

Important mitigation note:

- The `tsconfig`-hard-failure slice should not automatically be treated as proof that Go must take over immediately.
- SonarJS already did compatibility work during the TS6 migration, so it is realistic to plan for Node-side preprocessing or normalization of the `tsconfig` body before handing it to the TS6-based analyzer.
- That makes deprecated-option failures and some config-default transitions good candidates for short-term mitigation in Node.
- This buys time precisely because the early problem is compiler/config compatibility, not sudden loss of source-language readability.
- It does not remove the longer-term need for a coherent TS7 typed-analysis strategy.

The later risk, likely from late Q3 2026 onward, is broader ecosystem drift:

- new templates assume 7.x defaults
- package authors test only against 7.x behavior
- users stop keeping both TS6 and TS7 side-by-side

### Monitoring thresholds to put in the strategy

Define a `TS7-related analysis failure` narrowly:

- analysis failed, degraded, or had to skip typed coverage
- root cause is a TS7-vs-TS6 or TS7-vs-SonarJS incompatibility
- exclude network, infrastructure, JVM, and unrelated analyzer failures

Recommended thresholds:

- Early warning: more than 0.10% of TS7-eligible analyses fail for TS7-specific reasons over 7 consecutive days.
- Escalation: more than 0.25% of TS7-eligible analyses fail for TS7-specific reasons over 7 consecutive days.
- Too late: more than 0.50% of TS7-eligible analyses fail for TS7-specific reasons over 14 consecutive days.
- Immediate red flag: more than 1.00% of TS7-eligible analyses fail on any single day after a stable TS7 release.

Use a second, repository-level view as well so a small number of large CI users do not hide the real blast radius:

- Early warning: more than 2% of TS7-using repositories hit at least one TS7-related analysis failure in a week.
- Too late: more than 5% of TS7-using repositories hit at least one TS7-related analysis failure in a week.

These are recommended SonarJS operating thresholds, not public TypeScript thresholds.

## Explicit TS7 Failure Thresholds

These thresholds should be treated as operational gates, not only as advisory text buried in the document.

| Signal | Threshold | Meaning |
| --- | --- | --- |
| TS7-specific analysis failures among TS7-eligible analyses | `>0.10%` over 7 consecutive days | Early warning |
| TS7-specific analysis failures among TS7-eligible analyses | `>0.25%` over 7 consecutive days | Escalation |
| TS7-specific analysis failures among TS7-eligible analyses | `>0.50%` over 14 consecutive days | Too late |
| TS7-specific analysis failures among TS7-eligible analyses | `>1.00%` on any single day after TS7 stable | Immediate red flag |
| TS7-using repositories with at least one TS7-related failure in a week | `>2%` | Early warning |
| TS7-using repositories with at least one TS7-related failure in a week | `>5%` | Too late |

Recommended handling:

- Early warning means the team should review telemetry and top failure signatures that week.
- Escalation means rollout should stop expanding until the main failure class is understood.
- Too late means the current plan is behind demand and must be corrected with a product or routing decision, not only monitoring.
- Immediate red flag means release management and product owners should be notified the same day.

### Deadlines I would actually put in the strategy

- 2026-06-15: finalize telemetry and classification for TS7-related failures.
- 2026-06-30: decide fail-open vs fail-fast for the Go sidecar and implement a kill switch.
- 2026-07-31: complete the first parity-and-benchmark gate for the current migrated rule slice.
- 2026-08-31: make a product decision for SonarQube/SonarCloud server-side rollout based on real telemetry, not PoC optimism.
- 2026-09-30: answer [JS-1748](https://sonarsource.atlassian.net/browse/JS-1748) and lock the runtime strategy for AST-only TypeScript rules.
- 2026-10-31: either have a production-worthy limited rollout for the server path or explicitly pivot to a different plan.
- 2026-12-31: re-evaluate whether the external TS7 API path is viable enough to reduce future Go migration scope.

## Core Decision Principles

Any deployment strategy should follow these principles:

1. No silent loss of rule coverage.
2. No "TS7 support" claim without a precise product-by-product definition.
3. Keep the architecture reversible while the external ecosystem is still moving.
4. Separate "support TS7 codebases" from "replace Node".
5. Make server and IDE tradeoffs explicit instead of hiding them in implementation details.
6. Prefer routing decisions based on rule class, product capability, and telemetry over a single coarse "TS7 detected" switch.
7. Do not pay dual type-checking cost in steady-state production unless we are explicitly buying a short-lived validation signal.

## Production Routing Principle: No Double Typed Execution

The current state has 16 Sonar rules implemented in both Node and Go. That is an implementation state, not a target execution model.

For production routing, the rule should be:

- one eligible TS7 project has one typed-analysis owner in production
- Node or Go can own typed program creation for that project, but not both in steady-state production
- running both on the same projects is acceptable only for bounded validation modes

Acceptable cases for dual execution:

- CI parity harnesses such as [JS-1743](https://sonarsource.atlassian.net/browse/JS-1743)
- short-lived canary or shadow cohorts with explicit sampling and observability
- temporary investigation of a suspected regression

Non-acceptable steady-state target:

- Node still builds typed programs for any typed rules or non-rule typed consumers on the project
- Go also builds typed programs for its routed rules or other typed consumers on the same project
- both parse and type-check the same project during normal production analysis

That model is useful for proving correctness, but it is not a performance strategy.

### Performance implication

As long as Node still needs to create typed programs for any meaningful rule or non-rule consumer on a project, and Go also performs typed analysis for that same project, the likely outcome is:

- more process startup cost
- more file parsing
- more type-checking work
- more memory pressure
- little or no end-user performance win

So the strategy should be explicit:

- the first Go rollout phases are about correctness, compatibility, and future optionality
- they are not a credible performance story yet
- meaningful performance improvement can only be expected once eligible projects stop paying for typed analysis in both runtimes

In practice, that means SonarJS should not expect a real performance win until at least one of these becomes true:

1. all typed-program-dependent rule and non-rule consumers needed for eligible TS7 projects can run without Node creating typed programs for those projects
2. SonarJS defines a routing mode where eligible TS7 projects use Go for typed analysis and Node remains only for responsibilities that do not require typed program creation

Until then, wider Go routing should be treated as a product-correctness investment, not a performance investment.

## Realistic Deployment Strategies

### Strategy A: Server-First Hybrid

Node stays primary at the product-architecture level, but typed execution has a single production owner per eligible project.

Concretely:

- Node remains the owner of Vue, embedded JS in HTML/YAML, Babel fallback, CSS, and the current non-issue outputs.
- SonarLint remains Node-primary until its packaging story is solved.
- Go is not turned on for normal production analyses if that would make Node and Go both build typed programs for the same project.
- Until Go can own the full hard type-service slice for eligible TS7 projects, Go runs only in validation modes or narrowly sampled cohorts.
- The production cutover happens only when eligible TS7 projects can use Go as the sole typed-analysis owner, with Node kept only for clearly Node-owned responsibilities that do not require typed program creation, including non-rule features.

### Pros

- Lowest-risk path to start supporting TS7-relevant typed behavior.
- Preserves the current Node-owned coverage surface.
- Lets us learn from real production traffic before making the IDE problem worse.
- Keeps the architecture reversible if the TypeScript 7 API path becomes viable later.
- Aligns well with the current branch state and the intent of [JS-1749](https://sonarsource.atlassian.net/browse/JS-1749).
- Avoids locking the product into a steady-state "double type-checking" model.

### Cons

- Creates temporary server/IDE divergence.
- Keeps dual-runtime complexity.
- Requires a harder cutover decision than a simple rule-by-rule production rollout.
- Delays visible production use of Go until ownership of the typed slice is coherent.
- Requires strong routing, telemetry, and fallback semantics.
- Requires clear product messaging around what is and is not covered.

### Worst case

We spend time validating Go, but never reach the point where Go can own typed analysis for eligible TS7 projects without Node still creating typed programs for some remaining rule or non-rule consumer. In that case, the rollout stalls and SonarJS remains effectively Node-typed in production for too long.

### Recommendation

This should be the default near-term deployment strategy.

### Strategy B: Full Hybrid Across All Products

Node stays primary everywhere, but the Go sidecar is productized for SonarQube/SonarCloud and SonarLint at roughly the same time.

### Pros

- Cleaner external story: one hybrid architecture across products.
- Less long-lived server/IDE divergence.
- Earlier pressure-testing of the full packaging and platform matrix.

### Cons

- Significantly harder packaging story, especially for IDEs.
- Higher risk of missing marketplace or artifact-size constraints.
- More failure modes on end-user machines.
- Forces the team to solve the hardest distribution problem before enough server evidence exists.

### Worst case

We turn a server rollout problem into a cross-product distribution problem too early, burn time on packaging friction, and still cannot ship cleanly because VSCode or another IDE path becomes the pacing item.

### Recommendation

Useful as a target state, but too early as the first deployment move.

### Strategy C: Wait for a TypeScript 7 API/IPC Solution and Keep Node-Only

Do not invest meaningfully in the Go analyzer beyond experiments. Wait for a TS7 programmatic API and try to keep the existing Node rule base with a new TS backend.

### Pros

- Potentially preserves the existing rule implementation model.
- Avoids large-scale Go rule migration.
- Keeps packaging closer to the current Node model.
- Could be the cleanest solution for AST-only TypeScript rules if the API becomes good enough.

### Cons

- Entire timeline is controlled by external teams.
- Performance may still be the wrong shape for linter workloads even if the API becomes complete.
- Delays a practical TS7 support path in the meantime.
- Risks waiting months only to discover that SonarJS still needs a Go path for the hard type-service slice.

### Worst case

We delay deployment waiting for an external API, TS7 adoption grows meanwhile, and we are still forced to restart Go work later under more schedule pressure.

### Recommendation

This should be a watch track, not the only plan.

### Strategy D: Aggressive Go-First Replacement for TS7 Codebases

Treat TS7 detection as the main trigger and move TS analysis aggressively to the Go implementation, with Node kept mostly for non-TS or clearly unsupported files.

### Pros

- Strong long-term simplification if it succeeds.
- Maximum leverage from native performance.
- Strong alignment with the future direction of the TypeScript implementation.

### Cons

- Current branch state is not ready for this.
- Vue and embedded JS in HTML/YAML remain open gaps.
- SonarLint packaging remains open.
- Non-rule features and release gates remain open.
- AST-only TypeScript runtime choice is still undecided.
- Rule migration scope is still large.

### Worst case

We call the Go analyzer "the TS7 analyzer" before it covers enough of the actual TS7 surface. Users hit missing coverage, IDE/server mismatches, and regressions in mixed-language projects, which damages trust in the rollout.

### Recommendation

Do not do this now.

### Strategy E: Full Go Replacement for JS/TS

Attempt to make Go replace the whole JS/TS endpoint, including the broader parser-driven surface.

### Pros

- Long-term conceptual simplicity if it ever becomes real.
- One runtime for the full JS/TS path.

### Cons

- Not credible from the current starting point.
- Conflicts directly with known Node-owned responsibilities.
- Requires re-solving too many features outside the migrated typed-rule slice.

### Worst case

We destabilize the entire analyzer surface while still needing Node for important features anyway, ending with the highest cost and the worst user impact.

### Recommendation

Treat this as a long-term architecture question, not a current deployment strategy.

### Strategy F: AST-Fallback Contingency

If a TS7-compatible typed path is delayed, ship a carefully chosen subset of AST-only or heuristic fallbacks while leaving Node primary.

### Pros

- Gives a pressure-release valve if TS7 support is blocked.
- Can preserve some rule coverage without waiting for full type-aware parity.

### Cons

- Accuracy is explicitly lower than true typed execution.
- Easy to overuse under schedule pressure.
- Can create long-lived "temporary" behavior that users never asked for.

### Worst case

We ship many heuristic replacements under the banner of TS7 support, and the false-positive and false-negative rate climbs enough to make the whole initiative look lower quality.

### Recommendation

Keep this as a bounded contingency only, with explicit FP/FN budgets per rule.

## Recommended Path

The recommended path is:

1. Adopt Strategy A now.
2. Interpret Strategy A as "single-owner typed execution in production", not as "partial typed split across Node and Go".
3. Keep Strategy C as the external watch track.
4. Use Strategy F only as a scoped contingency.
5. Reject Strategy D and Strategy E for the current phase.

## Recommended Activation Model

Go activation should not be driven by "TypeScript 7 detected" alone.

Instead, activation should require all of:

- the file set contains relevant TS/TSX input
- the project is in a mode where Go can be the sole typed-analysis owner, meaning Node no longer needs to create typed programs for that project
- the current product and platform support the Go path
- the required binary is available and verified
- the rollout flag or rollout tier enables the path

TS7 detection should still matter, but only as one signal among others:

- it can decide whether the TS6-based Node typed path is still acceptable
- it can decide whether certain rules must leave Node
- it can drive telemetry segmentation

It should not by itself be the sole route selector.

## Recommended Product Rollout Phases

### Phase 0: Hardening and Decision Prep

- Finish enough of [JS-1743](https://sonarsource.atlassian.net/browse/JS-1743) to trust parity for the first rule slice.
- Finish [JS-1744](https://sonarsource.atlassian.net/browse/JS-1744) so the team knows whether there is a real performance and memory win.
- Resolve [JS-1748](https://sonarsource.atlassian.net/browse/JS-1748) for AST-only TypeScript rules.
- Make [JS-1749](https://sonarsource.atlassian.net/browse/JS-1749) concrete for activation, fallback, and supported products.
- Define [JS-1750](https://sonarsource.atlassian.net/browse/JS-1750) release gates for non-rule features.
- Keep production ownership of typed analysis in Node during this phase.

### Phase 1: Shadow Validation on the Server Path

- Enable the Go path only on supported server-side platforms.
- Keep Node as the production owner of typed analysis.
- Run Go only for parity validation, sampled shadow traffic, or tightly bounded cohorts.
- Keep a kill switch.
- Prefer fail-open with explicit warnings and telemetry while Go is still a validation path rather than the production typed-analysis owner.
- Do not present this phase as a performance rollout.

The point of this phase is to prove correctness and operational readiness without committing production to double typed execution as the normal model.

### Phase 2: Single-Owner Typed Cutover for Eligible TS7 Projects

Move from validation to production only if:

- parity is stable
- Go can own the hard type-service slice and any required non-rule typed consumers for eligible TS7 projects, or Node otherwise no longer needs to create typed programs for those projects
- performance is materially better or at least not worse after startup cost
- packaging is stable on the supported matrix
- support burden is acceptable
- fallback behavior is understood

In this phase:

- Go becomes the sole typed-analysis owner for eligible TS7 projects on supported server-side platforms.
- Node stays active only for responsibilities that do not require typed program creation.
- If Node still needs to create typed programs for the same eligible projects, the cutover gate is not met.

### Phase 3: Decide the Long-Term Split

After server telemetry and the next ecosystem checkpoint:

- decide whether AST-only TS rules remain in Node or migrate to Go
- decide whether SonarLint gets a Go path or remains Node-primary longer
- decide whether the Go slice grows or stays intentionally narrow
- decide whether the external TS7 API path changes the cost model enough to pivot

## Signals That Should Drive Expansion or Replacement

The decision to push farther toward Go should be driven by concrete signals, not by the existence of the PoC alone.

| Signal | Push toward more Go | Push toward keeping Node primary |
| --- | --- | --- |
| TS7 adoption in analyzed codebases | A material and rising share of analyses clearly use TS7 | TS7 usage stays marginal or mostly internal/early adopter |
| Share of TS7 codebases using unsupported surfaces | Low share of Vue and embedded JS in HTML/YAML among TS7 users | High share of those surfaces among the codebases that need TS7 |
| Go startup and extraction reliability | Startup, extraction, and binary verification are boring on all supported platforms | Platform-specific failures remain visible or frequent |
| Node-vs-Go parity on the validation and cutover candidate set | Diff rate is low and understood before production cutover | Parity keeps regressing or requires constant special cases |
| User feedback on migrated rules | FP/WF rates are stable or better than Node baseline | Feedback worsens after migration |
| Analysis latency and memory | Go gives a measurable net gain after it becomes the sole typed owner for eligible projects | Startup and memory overhead erase the expected win, or Node still has to type-check the same projects |
| SonarLint packaging and behavior | Delivery model is solved and divergence is acceptable | IDE packaging remains unresolved or user-hostile |
| External ecosystem status | TS7 API path stays blocked or clearly unfit for linting | TS7 API/public interface becomes viable and cheaper to adopt than more Go migration |

### Signals to collect explicitly

- Percentage of analyses with TS7 dependencies or configuration.
- Percentage of analyses where the Go path is eligible.
- Percentage of eligible analyses where the Go path actually ran.
- Go startup failure rate by product, version, OS, and architecture.
- Binary download, extraction, signature, and permission failures.
- Fallback rate and fallback reason.
- Issue delta rate between Node and Go on parity corpora and ruling projects.
- FP/WF feedback trend on migrated rules.
- Analysis time and memory split into startup, program creation, steady-state analysis, and merge/import.
- Share of analyses that require Node-owned features such as Vue, HTML/YAML embedded JS, Architecture UDG, or taint.

## Questions That Must Have Explicit Answers

### Scope and Product Semantics

- What exactly does "TypeScript 7 support" mean for SonarQube, SonarCloud, and SonarLint?
- Is partial typed-rule coverage acceptable during rollout, or do we require near-complete parity before claiming support?
- Is temporary server/IDE divergence acceptable? If yes, for how long and in what form?
- Which user-visible behaviors are allowed to differ between TS6/Node and TS7/Go?
- Do we define "support" per rule slice, per product, or per language surface?

### Runtime Ownership and Routing

- Which rules must move to Go because they are truly blocked on TS7?
- Which AST-only TypeScript rules stay in Node if a compatible TS runtime remains available there?
- Which rule classes are permanently Node-owned?
- What is the minimum coherent cutover unit for typed analysis: all hard type-service rules, all typed-program-dependent features, or something else?
- What is the exact activation predicate for the Go path?
- What is the policy for unsupported platforms?
- What is the policy for mixed TS6/TS7 monorepos or mixed supported/unsupported files in one project?

### Fallback and Failure Semantics

- Do we fail-open or fail-fast when the Go analyzer cannot start?
- If we fail-open, how is the loss of typed coverage surfaced to users and support?
- When the Go path fails after Node has already excluded routed rules, how do we avoid silent issue loss?
- What rollback and kill-switch mechanisms exist at runtime and release time?

### Packaging and Distribution

- Which exact OS and architecture combinations are officially in scope for Go delivery?
- What are the artifact-size budgets for `main`, per-platform classifiers, and `multi`?
- How are binaries signed, hashed, cached, upgraded, and invalidated?
- How do we distribute binaries for SonarLint?
- Is runtime download acceptable for IDEs, or do we require packaged binaries?
- Do we keep the current Node-in-path expectation in any product mode?

### Quality, Testing, and Observability

- What parity threshold is required before a rule can leave Node?
- Which benchmark suite is authoritative for performance and memory decisions?
- What telemetry is mandatory before broad rollout?
- How do we monitor Go-specific crashes, panics, RPC failures, and conversion failures in production?
- Who owns triage when results differ between Node and Go?

### Non-Rule Features

- What is the plan for Architecture UDG generation?
- What is the plan for taint analysis?
- Which non-issue outputs must remain Node-owned for the foreseeable future?
- Are any of those non-rule features hard blockers for claiming TS7 support?

### Ownership and Ecosystem Strategy

- Who owns the shim and patch stack against `typescript-go`?
- Who decides when the external TypeScript 7 API path is good enough to revisit?
- What is the checkpoint cadence for re-evaluating Go vs API/IPC?
- What evidence would cause the team to pivot away from more Go migration?
- What is the formal definition of done for [JS-1506](https://sonarsource.atlassian.net/browse/JS-1506)?

## Why Rushing the Go Rollout Would Be a Mistake

Rushing broad deployment now would mean making a product commitment before the following are settled:

- parity confidence
- benchmark evidence
- AST-only runtime choice
- SonarLint distribution model
- non-rule feature coverage and release gates
- clear fallback semantics

The current state is strong enough to justify continued investment, but not strong enough to justify a broad replacement narrative.

The right thing to rush is:

- parity harnesses
- benchmarks
- observability
- supported-platform packaging hardening
- rollout policy
- external checkpointing

The wrong thing to rush is:

- declaring Go the new primary analyzer
- pushing the same deployment model to SonarLint immediately
- migrating broad rule sets before the first slice has proven itself
- removing Node from ownership of surfaces it still clearly owns

## Position on Waiting for the TypeScript 7 API/IPC Path

The TypeScript 7 API path should be monitored closely, but it should not be the only strategy.

The right interpretation is:

- if the API becomes complete and performant enough, it could become the lower-cost answer for some or many Node-owned TS rules
- until that happens, SonarJS still needs a practical TS7 strategy for the hard type-service slice
- therefore the team should keep the Go path alive, but in a reversible form

This is the key middle ground:

- do not assume the Go analyzer must replace everything
- do not assume the future API will save us in time
- keep Node as the main analyzer while building the smallest credible Go path that can reach a coherent server-side cutover when needed

## Final Recommendation

The near-term deployment strategy should be:

- Node remains the main analyzer.
- Go is validated server-side first, and only moved into production for eligible TS7 projects when it can be the sole typed-analysis owner for those projects.
- SonarLint remains Node-primary until its packaging story is explicitly solved.
- AST-only TypeScript rules are not mass-migrated before [JS-1748](https://sonarsource.atlassian.net/browse/JS-1748) is answered.
- Broad rollout is blocked on [JS-1743](https://sonarsource.atlassian.net/browse/JS-1743), [JS-1744](https://sonarsource.atlassian.net/browse/JS-1744), [JS-1749](https://sonarsource.atlassian.net/browse/JS-1749), and [JS-1750](https://sonarsource.atlassian.net/browse/JS-1750).
- The team maintains a live checkpoint against the TypeScript 7 API/IPC track and is ready to pivot if it becomes the lower-cost, lower-risk path.

If we phrase it bluntly:

- Rushing a Go replacement is too risky.
- Waiting passively for the API is too passive.
- A controlled hybrid rollout is the pragmatic path.
