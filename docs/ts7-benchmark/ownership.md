# Cross-backend ownership accounting

This implements a sampled whole-layer view for the benchmark acceptance work
described in section 16 of the JS-2643 investigation document. It does not declare
outside-layer parity or production readiness.

## Scope and accounting

All providers use the same production `createStandardProgram` factory,
`IncrementalCompilerHost`, `build`/parser route and SonarJS linter. The owned
`ts.createProgram` selects the provider. The benchmark does not call private
native constructors; `typescript/control` returns optional diagnostic metadata
without exposing compiler sessions or raw programs. The host advertises the
selected provider's library directory. Initialization, analysis and worker wall
time remain separate measurements.

V8 sampling observes the complete active stack without wrapping compiler
objects, methods or getters. The canonical ownership policy lives in
[`ownership.mjs`](../../tools/ts7-benchmark/ownership.mjs). It recognizes the owned
module/adapters, native integration, private TS6 implementation, selected native
SDK, WASM bridge/runtime and WASM execution. All remaining worktree sources,
including released parser/rule dependencies, are consumers. Unrecognized source
locations remain unassigned rather than becoming consumer time.

Each sample interval is assigned once, to its innermost known source owner:

- A parser visitor called by a compiler traversal is consumer work.
- A compiler call from that visitor is compiler work, regardless of outer frames.
- Declared compiler-initiated host sources are an explicit nested TS-layer
  subcost. Compiler calls from those hosts return to compiler ownership.
- Native/builtin frames inherit the nearest source caller; they are not all
  automatically classified as compiler or consumer work.
- GC, idle/program-only stacks, unknown locations, measurement code, gaps longer
  than ten requested intervals (at least 10 ms), and the unsampled tail remain
  in the unattributed bucket. GC is not charged to the most recent allocator.

The analysis and phase intervals use the same monotonic clock as the raw V8
profile. Samples are clipped to those bounds. Profiler startup/stop, report
processing, rich diagnostic normalization/sorting, memory sampling and session cleanup are outside analysis. Each raw
worker report reconciles:

```text
analysis wall time
  = consumer sampled time
  + compiler sampled time
  + compiler-initiated host sampled time
  + explicitly unattributed time

whole TS layer = compiler + compiler-initiated host
```

V8 can emit slightly out-of-order timestamps (observed: a 41 µs backward step).
Post-processing reconstructs their cumulative timestamps and orders the events,
recording the inversion count and maximum backward distance. It does not clamp
negative deltas and inflate elapsed coverage. An inversion exceeding one
requested sampling interval fails profiling. Raw analysis/phase boundaries are
saved to allow independent reprocessing.

The host sampled subcost is time in the declared host source files. The exact
callback report also includes delegated work, such as TS6 helpers or compiler
parsing called by a host. Those inclusive callback durations overlap other
measurements. Callback counts and UTF-8 bytes returned by `readFile` help expose
different workloads; callback names need not be identical between providers.

SDK round-trip, Go-handler and residual boundary timers retain their existing
inner scope. They are neither extra top-level costs nor a way to derive consumer
time by subtraction. Go-handler duration can include callbacks, dispatch and GC.
Node CPU usage is recorded separately from elapsed stack residency; Go CPU may
span multiple threads and is not added to Node wall time.

## Calibration and result comparison

`--layer-profile --calibrate` pairs each sampled worker with a fresh control and
alternates their order each round. Backend order rotates, followed by a reversed
block when enough repetitions are requested. Use eight rounds for all four
variants, or six for TS6/native IPC/WASM. Preserve every sample, including slow
controls. Do not run builds, tests or other benchmarks concurrently.

The report shows unprofiled control distributions, paired instrumented/control
ratios, sampled ownership distributions, phase/component/source/function costs,
host callback workloads and nested SDK measurements. It preserves raw profiles,
unknown/GC/gap reasons, interval distributions and code/corpus/compiler metadata.
Column medians need not sum; individual worker totals must reconcile.

The result fingerprint is shared by the runner and both performance reporters.
It checks file selection, source hashes, active rules and compiler inputs as well
as both line arrays and complete normalized issue/suppression objects. Messages,
columns, secondary locations, fixes, suggestions and duplicate counts are
retained. A matching line count with a changed message or fix fails parity.

## What the measurements can establish

Separate `--allocation-profile` diagnostics collect V8 weighted allocation samples,
including objects collected by minor/major GC, and GC performance entries. They
reuse the canonical source-ownership policy and retain raw trees/stacks/events.
Profiler startup/stop and summary processing remain outside the analysis timer;
their sampling window brackets analysis. Diagnostic timing is not a replacement
for controls. These are estimated transient JS bytes, excluding Go allocations,
WASM linear memory and peak/retained heap. Allocation sites do not establish
which allocator caused an observed GC event.

Sampling reaches lazy getters, deferred iterator bodies, cache/conversion work
and callbacks without altering AST/type identities or shapes. Tests exercise
callback ownership and compiler reentry, phase/boundary clipping, unknown/GC/gap
accounting, and a live V8 calibration with compiler work and a consumer callback.
End-to-end tests verify cross-backend results, exact callback counts, raw profile
output and reconciliation.

Sampling is still an estimate. Short operations can fall between ticks, adjacent
samples are correlated, and the reported interval resolution is not a confidence
interval. Inspector frames can include synchronous IPC waits and Go/WASM work;
these profiles are not pure Node CPU profiles. Scheduling, JIT and GC can affect
results. Adjacent controls reveal overhead and drift but do not justify blindly
subtracting a common overhead percentage from every bucket.

The reporter deliberately does not grant an automatic JS-side parity pass.
Persistent consumer differences require identifying the affected code paths and
separate CPU/allocation evidence. Identical findings alone do not prove identical
branches or amounts of work. Cold batch results do not establish retained IDE
performance, peak combined memory, broad framework coverage, or exhaustive
message/fix/suppression equivalence.

See the [benchmark commands](../../tools/ts7-benchmark/README.md#performance-instrumentation)
and the dated measurements recorded alongside this document.
