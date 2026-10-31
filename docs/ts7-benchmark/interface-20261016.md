# TS7 interface, allocation and timing comparison, 16 October 2026

This follows the [whole-layer report](ownership-20261016.md) for
[JS-2643](https://sonarsource.atlassian.net/browse/JS-2643) and
[PR #8184](https://github.com/SonarSource/SonarJS/pull/8184).
The scope remains benchmarking and improving TS7 behind the owned TypeScript
interface. **No rules or rule helpers changed in this follow-up.**

## Common interface and boundary corrections

The allocation investigation exposed a benchmark bypass: TS6 used the production
factory, while TS7 called the private `createNativePrograms` implementation.
Both now call `createStandardProgram` with the production
`IncrementalCompilerHost`; the owned `ts.createProgram` chooses the provider.
Filename selection and diagnostics use `typescript/control`. Its new
instrumentation API returns copied metadata and counters, not the SDK API,
raw programs or a native session. Compiler-option serialization also has one
canonical implementation in that control module.

The selected provider now advertises its own compiler-library directory to the
host. Previously the native public host inherited the private TS6 library path,
which could make a restricted host reject the TS7 standard libraries. Native IPC
uses the matching installed platform libraries; WASM uses its artifact's copied
SDK libraries. A production-host test checks real library membership and reading
under the node_modules restriction.

Runtime hooks and the bundler now share `packages/typescript/boundary.cjs` for
compiler identities, supported entries and exact private implementation roots.
Regressions cover CJS/ESM compiler copies outside node_modules, a compiler loaded
before gateway installation, lookalike private directories, and nested compiler
packages attempting to hijack `typescript/control` or `typescript/errors`.
The production-import audit resolves package identities and rejects direct
private native/compatibility imports.

The benchmark preloads the owned module before Node resolves its consumer graph.
It rejects caught/sticky gateway failures, mismatched facade identity, and missing
application or typescript-eslint routing evidence. Every accepted worker records
58 SonarJS and 89 typescript-eslint import observations through the same facade.
The production-import audit and runtime/bundle guards cover the current
consumer graph and tested compiler-copy regressions.

## Results and calibrated timings

Eight accepted pairs per provider; seconds as median [min–max]:

| Backend      | Control analysis       | Sampled analysis       | Paired sample/control ratio |
| ------------ | ---------------------- | ---------------------- | --------------------------- |
| TS6          | 5.791 [5.493–5.833]    | 6.005 [5.736–7.585]    | 1.04 [1.03–1.30]            |
| IPC          | 6.536 [6.418–6.830]    | 6.812 [6.637–7.182]    | 1.04 [1.03–1.08]            |
| WASM syscall | 11.438 [11.173–12.041] | 11.839 [11.324–12.534] | 1.01 [0.99–1.10]            |
| WASM direct  | 12.483 [12.122–14.900] | 13.337 [12.515–15.190] | 1.03 [0.89–1.21]            |

Sampled exclusive ownership, seconds as median [min–max]:

| Backend      | Consumer            | Whole TS layer      | Unattributed        |
| ------------ | ------------------- | ------------------- | ------------------- |
| TS6          | 4.350 [4.200–5.337] | 1.313 [1.228–1.824] | 0.342 [0.309–0.425] |
| IPC          | 4.472 [4.354–4.695] | 1.994 [1.945–2.095] | 0.351 [0.337–0.393] |
| WASM syscall | 5.087 [4.818–5.340] | 5.686 [5.485–6.133] | 1.049 [0.916–1.116] |
| WASM direct  | 5.699 [5.392–6.153] | 5.466 [5.264–6.019] | 2.176 [1.819–3.096] |

Nested SDK/Go timers from controls, milliseconds by median:

| Backend      | SDK round trip | Go handler | Boundary remainder |
| ------------ | -------------- | ---------- | ------------------ |
| IPC          | 980            | 566        | 413                |
| WASM syscall | 4749           | 2825       | 1920               |
| WASM direct  | 4169           | 3345       | 836                |

IPC is about 13% above TS6, syscall about 75% above IPC, and direct about
9% above syscall by control medians. Direct lowers the median boundary remainder
by about 56% relative to syscall while total analysis remains slower. Sampled
consumer medians exceed TS6 by 0.122 s (IPC), 0.737 s (syscall) and 1.349 s
(direct). These differences remain unexplained; **JS-side timing parity is not accepted.**

Host workloads are also visible. TS6 always makes 204 reads returning 3,989,834
bytes; both WASM bridges make 204 returning 4,033,500. IPC normally does the
same as WASM, but its round-8 sampled worker makes 360 reads returning 4,265,316
bytes. Its file-existence probes also vary (283–507 in sampled workers). That
valid worker is retained; identical findings/query counts do not imply identical
filesystem work. Exact per-worker counts and inclusive durations remain in the
comparison report.

All accepted workers preserve **6,524 findings across 157 ag-grid files**, including
full normalized messages, primary/secondary locations, fixes and suppressions.
Source hashes, active rule configurations and selected roots/options/references
match. The separate diagnostic runs also preserve every per-rule creation/listener
count vector and every Go method/batch count vector: 3,227,372 listener calls and
23,728 SDK exchanges per Go worker, including 405 batches with 16,828 logical
queries inside those batches.

Eight fresh control/sample pairs per provider rotate backend positions and
reverse the block; pair order alternates. Controls have no rule/host/V8/allocation
profiling wrappers, but retain the existing SDK timing counters. Tests, builds
and other benchmarks did not overlap measurement. Analysis excludes provider
initialization, cleanup, rich diagnostic normalization and profile processing.
Filesystem/OS caches were left warm. These are fresh-worker batch measurements,
not retained IDE or cold-machine performance.

Sampled ownership follows the [exclusive accounting policy](ownership.md).
Column medians need not sum; each individual worker reconciles. SDK/Go timers
are nested measurements with a narrower scope and must not be added to sampled
whole-layer time. Ratios below one expose run variance and cannot be interpreted
as negative profiler overhead. No valid outliers were discarded.

The historical section-17 batch used the old private TS7 construction route.
Its timings remain evidence for that snapshot, but comparing its medians with
this batch does not isolate the gateway optimization or prove a speedup.

## Allocation and GC evidence

`--allocation-profile` adds V8 weighted allocation sampling, including objects
collected by minor/major GC, plus GC performance entries. It uses the same
canonical ownership policy as CPU sampling. Start/stop and profile processing
sit outside the analysis timer. These diagnostics run separately from the
calibrated timing batch; controls never enable allocation sampling.

| Backend      | Consumer GiB        | Facade/adapters MiB | Major GC count | All GC seconds      |
| ------------ | ------------------- | ------------------- | -------------- | ------------------- |
| TS6          | 6.507 [6.498–6.516] | 2.6 [2.6–2.7]       | 1–1            | 0.263 [0.259–0.267] |
| IPC          | 6.494 [6.487–6.501] | 223.7 [223.1–224.3] | 1–1            | 0.298 [0.297–0.300] |
| WASM syscall | 6.531 [6.525–6.537] | 271.0 [266.9–275.1] | 47–52          | 0.797 [0.734–0.859] |
| WASM direct  | 6.569 [6.554–6.584] | 275.8 [273.8–277.8] | 105–193        | 1.970 [1.601–2.338] |

Allocation values estimate transient JS bytes, not exact allocations, retained
heap, peak memory, Go allocations or WASM linear memory. GC events show observed
activity and durations, without proving which allocator caused a collection.
There are only two diagnostic workers per provider; their ranges describe those
observations, not statistical confidence intervals.

Consumer allocation estimates are similar across providers. Direct WASM allocates
fewer JS bridge objects than syscall, yet exhibits more major collections. Its
cause remains unresolved, and JS-side timing parity is not accepted. The largest
remaining SDK allocation site is `createScanner`, reached by the released parser's
token conversion through SDK child construction. That is a candidate for
compiler-interface/SDK investigation; changing rules is outside this work.

## Isolated gateway allocation change

The facade previously allocated an invocation closure on every function getter
access and another closure per call. It now checks the function cache first,
creates one cached proxy, and calls Reflect directly in its traps. Tests preserve
function identity, provider receivers, constructor/newTarget behavior, recoverable
source errors and sticky TypeScript failures.

Earlier allocation probes preceded the common-construction correction and remain
diagnostic history. The controlled comparison below uses the corrected interface
for both variants.

| Metric                             | Before              | After               |
| ---------------------------------- | ------------------- | ------------------- |
| Analysis seconds, 8 controls       | 6.619 [6.575–6.884] | 6.597 [6.542–6.621] |
| Facade/adapters MiB, 2 diagnostics | 478.5 [477.7–479.3] | 227.3 [226.8–227.7] |

The allocation comparison uses two additional adjacent before/after diagnostic
pairs through the same public factory and hook, at 32 KiB sampling intervals.
It runs separately from all runtime controls.

The isolated IPC experiment uses eight adjacent fresh-worker before/after pairs,
alternating order in ABBA blocks. A load hook restores only the original gateway
getter/function-call block from `9e0a57c323e49396c9a19598ad44139b536b9848` for the
before workers. Both variants use the current public factory, host, routing,
compiler versions, rule inputs and worker code, and both load the same hook.
These workers have no V8, rule or host profiler. Full diagnostics, routing and
23,728 SDK exchanges must match for every worker.

The paired after/before analysis ratio is 0.9959 [0.9534–1.0043].
The median pair improves by about 0.4%, and the unpaired median difference is
22 ms. The distributions overlap and several later pairs are slower after the
change. **This does not establish a meaningful end-to-end speedup.** The isolated
allocation estimate falls about 52.5% (roughly 251 MiB per analysis) in
the facade/adapters bucket, supporting retention as an allocation improvement
within the interface. Sampling remains an estimate; this does not prove a causal
GC reduction.

## Validation and provenance

- 102 focused compiler/provider/benchmark tests passed.
- 16 selected production/channel tests passed with the direct WASM bridge.
- After library-path normalization, all 13 native tests passed separately with
  IPC and direct WASM.
- Bridge compilation and bundling passed; formatting and whitespace checks passed.
- All 64 calibrated workers, eight separate diagnostics, 16 isolated runtime
  workers and four isolated allocation workers pass full diagnostic parity and
  routing. Go SDK counters remain fixed at 23,728 exchanges.
- At the preceding PR head, the remote build failed during npm cache population
  with E401 before
  analyzer tests; local validation does not establish a passing CI build.

Hardware and toolchain match the preceding report: Apple M2 Pro, 10 logical
CPUs, 32 GiB RAM, Darwin 25.5.0, Node 24.16.0; ag-grid 9.1.0 at
jsts-test-sources revision `81a52e2c0180fc6e555b2c3efc44729fb46539d9`;
1,085 frozen rule/language configurations (SHA-256
`dad8468dd5e96a0c73c7a855fff9eb6423b81ad330a6f42f3293f2c1ecf57f5b`).
Private TS6 is 6.0.3 (`050880ce59e30b356b686bd3144efe24f875ebc8`);
Go SDK/compiler is 7.1.0-dev.20261015.1 at
`257e87406c6a8be277cb8cd5ef8d7b458a650390`; released parser is 8.71.1.
Native uses the published macOS arm64 executable built with Microsoft's Go
1.27.2, with `vcs.modified=true`. WASM uses standard Go 1.27.2 and the SonarJS
overlay. Matching revisions do not imply identical/reproducible toolchains.

The measured SonarJS base is `9e0a57c323e49396c9a19598ad44139b536b9848`
plus the candidate patch and source hashes retained with each batch. The isolated
experiment additionally records hashes for its hook, original getter block,
current gateway and newly added untracked source modules.

Raw evidence is preserved in ignored `tools/ts7-benchmark/out/` directories:

- `interface-ag-grid-final/`: all calibrated controls/samples, source/toolchain
  provenance, candidate patch, raw V8 profiles and generated comparison.
- `interface-ag-grid-diagnostics/`: separate two-round allocation, GC, ownership,
  host, query and rule diagnostics, with raw heap/CPU profiles.
- `gateway-abba/`: preparation, hook and runner scripts, every configuration,
  raw worker report/log, manifest and isolated before/after summary.
- `interface-fixture/`: all four providers through the common interface,
  11 identical findings across two source files.
- `interface-validation-final.log`, `interface-wasm-direct-validation.log`,
  `interface-native-portability.log`, `interface-wasm-portability.log`,
  `interface-build.log`, `interface-final-compile.log` and
  `interface-final-bundle.log`: focused validation evidence.

The interrupted `layer-ag-grid-optimized/` batch is explicitly excluded because
it preceded the public-construction correction. Its interruption marker preserves
the reason. Exploratory decoder runs also failed the routing audit before preload
was corrected; they are excluded and no decoding change was retained.
Earlier allocation probes remain diagnostic history only.

## Reproduction and next layer work

After dependency preparation and a matching WASM build, set `CORPUS` to the
ag-grid directory and `SONARJS_TS7_WASM` to the artifact, then use fresh output
names:

```sh
node tools/ts7-benchmark/benchmark.mjs --backends ts6,ts7,wasm,wasm-direct --runs 8 --rule-config tools/ts7-benchmark/out/ownership-ag-grid-rules.json --project "$CORPUS" --restrict-node-modules --layer-profile --calibrate --output tools/ts7-benchmark/out/interface-ag-grid-final
node tools/ts7-benchmark/benchmark.mjs --backends ts6,ts7,wasm,wasm-direct --runs 2 --rule-config tools/ts7-benchmark/out/ownership-ag-grid-rules.json --project "$CORPUS" --restrict-node-modules --profile --layer-profile --allocation-profile --output tools/ts7-benchmark/out/interface-ag-grid-diagnostics
node tools/ts7-benchmark/compare-performance.mjs tools/ts7-benchmark/out/interface-ag-grid-final tools/ts7-benchmark/out/interface-ag-grid-diagnostics
node tools/ts7-benchmark/out/gateway-abba/run.mjs
node tools/ts7-benchmark/out/gateway-abba/run-allocation.mjs
```

The last two commands replay the locally retained isolated experiments and refuse
to overwrite existing reports; the manifest records the exact source substitution.
The frozen ruling configurations are recoverable from saved worker configurations
or the existing `ts6-comparison-worker.mjs` prepare path, which executes the
repository's ruling configuration helper rather than duplicating policy.

Next, investigate SDK child/token allocation and WASM major-GC behavior within the
compiler layer, preserving the result, listener/query, source and routing checks.
TS6 remains the default provider and syscall remains the default WASM bridge.
