# Planned TSGo IPC provider

Add a draft PR based on the shared compiler infrastructure in #8206. Register a
`tsgo-ipc` provider alongside TS6; Vercel's implementation in #8209 remains a
separate provider. Keep TS6 as the default in the shared infrastructure PR.

## Execution and contract

- Pin the Go executable and its JavaScript API client to matching versions. Use
  the client's synchronous API for rule queries; ESLint rules cannot await checker
  methods. Keep process creation, protocol framing and remote handles inside the
  provider. The analyzer calls the same owned `typescript` facade.
- Normalize AST kinds, flags, node arrays, parent relationships, types, symbols and
  signatures to the existing contract. Reuse `compat/index.cjs` for stateless
  syntax operations. Audit Vercel's adapters for reusable normalization, but keep
  its private compiler functions and source patches out of the IPC implementation.
- Inventory the required provider operations and the enabled rules' checker usage
  against the pinned client before implementing missing operations. Configuration
  parsing, scanning and module resolution must have an explicit owner. Unsupported
  calls must fail explicitly; do not load TS6 as a compatibility fallback.
- Scope remote object caches to their session/project/snapshot. An edit must not
  silently retarget objects from an older program. Define release, cancellation,
  process-exit and worker-shutdown behavior, including restart after a failed child.
- Translate request filesystem overlays and denied reads into the API's filesystem
  model. Preserve unsaved file content, explicit tsconfig inputs, library selection
  and the shared cross-version option policy without changing analyzed projects.

## Validation and packaging

The shared provider and packaging suites discover registered providers. Run them
against `tsgo-ipc`, followed by frontend, rule, configuration and retained-worker
tests. Add transport-specific checks for process failure, blocked requests, snapshot
release, overlay isolation and cleanup on Linux and Windows. Verify that the IPC
artifact contains the selected native executable and declaration resources without
the TS6 SDK. Keep the current model of one provider per packaged artifact; choosing
one of several providers in a single distributed artifact is a separate extension.

Compare findings with TS6 on the same corpus and rule versions. Record exact
messages, locations, secondaries and fixes on the sequential benchmark sample,
and investigate added/missing corpus findings. Measure cold project analysis,
successive IDE edits and memory for both Node and the Go child. Count IPC queries
and bytes to identify where batching, prefetching or session-local caching is needed.
Use Vercel's recorded comparisons as additional evidence, not as a substitute for
an independent TS6 comparison.

The initial draft should report its supported surface, semantic differences,
transport limitations and measured performance. It should not claim full TypeScript
API coverage or incremental performance parity from cold-analysis results alone.
