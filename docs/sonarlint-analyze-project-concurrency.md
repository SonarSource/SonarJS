# SonarLint Analyze-Project Concurrency

## Purpose

This note documents how SonarLint Core scheduling, Java gRPC transport cancellation, and the
SonarJS Node.js analysis queue interact. It explains why a replacement analysis can reach the
Node.js runtime while a cancelled analysis is still finishing even though SonarLint executes
analyzer sensors sequentially.

The behavior was verified on 2026-08-27 against:

- SonarJS merge commit [`9af9910b52`](https://github.com/SonarSource/SonarJS/commit/9af9910b5269d0b8c8eef8ae4263498b7943244b)
- SonarLint Core commit [`90a566d827`](https://github.com/SonarSource/sonarlint-core/commit/90a566d827e473d2b497d60455011b8e58db42f3)
- Scanner Engine commit [`718d6c9463`](https://github.com/SonarSource/sonar-scanner-engine/commit/718d6c9463abbb3f6ecf09da9565875fc7904bdf)

## Component Boundary

SonarLint Core does not call the SonarJS analyze-project gRPC service directly. It loads analyzer
plugins and executes their `Sensor` implementations. The SonarJS sensor calls `BridgeServerImpl`,
which owns the gRPC request to the Node.js runtime and translates `SensorContext` cancellation into
transport cancellation.

### Relationship To Scanner Engine

SonarLint Core historically replaced the Scanner Engine's role for IDE analysis by loading and
executing analyzer plugins itself. It does not implement or depend on the current Scanner Engine API.
Both runtimes instead implement the `sonar-plugin-api` abstractions needed by analyzer sensors.

Scanner Engine Light has a separate concurrency model: concurrent `analyze()` calls on one engine
are serialized with a fair lock, and its `SensorContext.isCancelled()` currently always returns
`false`. It is therefore not involved in the SonarLint cancellation handoff described below.

## SonarLint Core Scheduling

### Scheduler Topology

An `AnalysisScheduler` owns one analysis thread and executes one command at a time. SonarLint Core
normally maintains one scheduler for standalone analysis and one scheduler per connected-mode
connection. Configuration scopes sharing a connection also share its scheduler.

Consequently:

- sensor executions do not overlap within one scheduler;
- different schedulers can execute concurrently;
- different schedulers normally own different `BridgeServer` instances and Node.js processes; and
- one scheduler can contribute at most one request waiting behind an older execution in the same
  Node.js runtime, because its analysis thread blocks while consuming the gRPC response.

The last two properties change when `SONARJS_EXISTING_NODE_PROCESS_PORT` is used: multiple Java
bridge instances can be pointed at the same externally managed Node.js runtime. The Node.js queue
must therefore remain the final single-flight authority.

### RPC Dispatch And Ordering

The RPC executor named `SonarLint Server RPC sequential executor` preserves the initial ordering of
requests and notifications, but request bodies are then dispatched to a cached executor. Multiple
request bodies can reach scheduling code concurrently, and forced analyses are not guaranteed to be
posted in their original RPC arrival order. The analysis scheduler still executes the resulting
commands one at a time.

Automatic analyses queued for the same configuration scope and trigger type can be batched. Forced
analyses are not batched.

## SonarLint Cancellation Sources

An executing analysis can be cancelled when:

- the client cancels its tracked progress task or RPC request;
- a newly posted analysis has the same trigger type, file set, and extra properties as the executing
  analysis;
- the corresponding configuration scope is unregistered; or
- the scheduler is stopped.

Cancellation marks the SonarLint cancellation monitor and completes the command's result future as
cancelled. The scheduler does not execute the next command until the current sensor invocation has
returned.

## Cancellation Handoff To Node.js

The apparent overlap happens across the Java/Node.js boundary:

1. SonarLint Core cancels the current analysis.
2. `SensorContext.isCancelled()` becomes true.
3. `BridgeServerImpl` detects this with its cancellation watcher and cancels the gRPC context of that
   specific `AnalyzeProject` call. SonarLint does not call the public `CancelAnalysis` RPC for this
   flow.
4. The Java streaming iterator unblocks and the sensor invocation returns.
5. The SonarLint scheduler is now free to execute the replacement analysis.
6. The Node.js worker may still be unwinding because cancellation is cooperative and is observed only
   at analysis checkpoints.
7. The replacement request can therefore reach the same Node.js runtime before the cancelled worker
   execution has settled.

This is an expected handoff, not concurrent sensor execution. Rejecting the replacement would lose
the newest analysis request and reproduce the `RESOURCE_EXHAUSTED: Another analysis is already
running` failure. The bounded Node.js queue acts as the synchronization barrier: it admits the
replacement but does not start it until the previous worker execution has actually finished.

## Node.js Queue Contract

- At most one analysis executes in the worker.
- Up to four additional requests wait in FIFO order of arrival at the Node.js server.
- A request beyond that capacity receives gRPC `RESOURCE_EXHAUSTED`.
- Cancelling a pending transport removes only its queue entry.
- Cancelling the active transport asks the worker to stop, but the active slot remains owned until
  that worker execution settles.
- Repeated cancellation signals for the same active entry are deduplicated. A failed or unacknowledged
  signal can be retried.
- Worker failure or server shutdown closes the queue and rejects both active and pending requests;
  completion of the abandoned execution cannot start another entry.

## Race And Corner-Case Audit

### Request-Scoped Transport Cancellation

Transport cancellation is tied to a queue entry, so a late or repeated cancellation from an older
call cannot cancel its successor. Node.js processes queue admission and transport event callbacks on
one event loop, which prevents an event from interleaving inside the synchronous admission-to-
submission handoff.

If a pending request becomes active at the same time its transport is cancelled, event-loop ordering
produces one of two valid outcomes: it is removed while still pending, or it owns the active slot and
its own worker execution is cancelled.

### Identity-Free `CancelAnalysis`

`CancelAnalysis` intentionally targets whichever entry is active when the RPC is processed; it does
not carry request identity and never targets a pending entry. At the completion boundary the queue
can transfer ownership to the successor before the previous handler's result is delivered. An
explicit `CancelAnalysis` processed after that transfer therefore cancels the successor by design.

Clients that need to cancel a particular analysis must cancel that analysis's transport. Adding a
request identifier to `CancelAnalysis` would be necessary before using it for request-scoped
cancel-then-submit workflows.

### Cooperative Cancellation

A worker acknowledgement means that the cancellation flag was set, not that analysis execution has
ended. TypeScript program construction and request normalization are not preempted in the middle of
their work. Cancellation received during normalization is retained and observed later, but
normalization itself still runs to completion.

If execution never reaches another checkpoint, the active entry and every queued successor remain
blocked. The server deliberately stays alive; recovery would require supervised worker replacement.

### SonarLint Core Follow-Ups

The audit found SonarLint Core implementation risks that do not change the SonarJS queue contract:

- `SonarLintCancelMonitor` writes its cancellation flag from synchronized code but reads the plain,
  non-`volatile` boolean without synchronization. This is a Java memory-visibility race for polling
  readers such as the Java bridge cancellation watcher.
- Concurrent forced RPC request bodies can post in a different order from their original RPC arrival.
- A task-cancellation notification that runs before `AnalyzeCommand` registers its task ID is ignored;
  clients normally reduce this window by waiting for the progress-start notification.
- Similar-analysis cancellation compares trigger type, file set, and extra properties, but not the
  configuration scope/module key. Scopes sharing a scheduler can therefore cancel each other if the
  compared values are identical.
- An already-cancelled newly posted command reports that it should cancel the executing command before
  the new command is later discarded from the queue.

These should be addressed or explicitly accepted in SonarLint Core rather than worked around in the
SonarJS gRPC server.

### Java Bridge Follow-Up

There is also a narrow existing Java bridge path worth regression-testing: if cancellation reaches the
gRPC context while the blocking streaming call is creating its response iterator, a `CANCELLED`
status is handled by the initial generic exception mapping instead of the later normal-cancellation
mapping. The SonarLint command future is already cancelled, so this does not allow worker overlap, but
it can misreport cancellation as an unresponsive bridge.
