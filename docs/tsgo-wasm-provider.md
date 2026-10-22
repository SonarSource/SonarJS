# TSGo WebAssembly provider (experimental)

This draft extends the TSGo IPC POC with a `tsgo-wasm` backend and selects it by
default. It preserves the synchronous JavaScript compiler interface used by the
analyzer and external typed rules. The Go compiler runs in a WebAssembly instance
inside a Node.js worker thread; no compiler child process or TS6 runtime fallback
is used.

## Shared semantics and transport

`packages/typescript/providers/tsgo/` owns the configuration, AST/type/symbol
adaptation, compiler hosts, query caching, snapshot disposal and session lifecycle
used by both TSGo transports. The IPC entry keeps its existing native SDK pin;
the WASM entry injects the matching WASM SDK into the same adapter factory.
Cross-version compiler-option adaptation remains in the existing shared tsconfig
layer. Project sources, tsconfigs, fixtures and ruling expectations are unchanged.

The public synchronous SDK has no transport injection endpoint. Preparation bundles
its API with one explicit replacement: the sync channel uses shared byte streams
instead of native pipes. It retains the SDK's MessagePack framing definitions and
filesystem callback protocol. Two bounded shared buffers stream requests, callbacks
and binary ASTs; responses own their buffers because the SDK decoder uses absolute
ArrayBuffer offsets. Tests include a two-MiB source/AST round trip.

The worker runs the Go runtime distributed with the pinned WASM binary. Preparation
extracts its runtime class with an asserted launcher shape, and substitutes the
filesystem object. Protocol descriptors use shared memory. Project filesystem
operations still call the analyzer host in the caller thread, including overlays
and access restrictions. Only the compiler's `bundled:///libs` namespace uses the
SDK's per-call `serverFS.useOS` sentinel, which reads embedded standard declarations.
The shared adapter preserves that namespace as a rooted compiler URI.

The caller synchronously handles filesystem callbacks while waiting. Filesystem
callbacks cannot re-enter the compiler. A failed callback or closed channel
invalidates the session; stale programs are rejected and subsequent analysis
creates a fresh session. Explicit close terminates the worker. The worker's idle
read has no deadline; active caller I/O has a 180-second inactivity timeout.
This bounds a stalled transport but does not provide request cancellation or a
total execution deadline.

## Pins, preparation and packaging

The registry in `packages/typescript/providers.json` owns SDK, WASM package,
preparation, entry and asset destinations. Package versions and archive integrity
are pinned in `package-lock.json`. Preparation requires the WASM distribution's
`buildInfo.commit` to equal the SDK's `gitHead`; matching version labels alone
are insufficient for the unversioned protocol.

This POC uses `tsgo-wasm@2026.10.22` from sxzz's unofficial distribution and
`typescript@7.1.0-dev.20261022.1`, built from the same Microsoft source commit.
It does not claim to run the 7.1 beta binary used by the IPC POC. No Go toolchain
or source checkout is required to build the analyzer.

`tools/prepare-tsgo-wasm-provider.mjs` emits the adapted provider, worker, Go runtime,
WASM module, matching declarations and notices under `target/tsgo-wasm/`. The
declarations come from the matching SDK's host package; its native executable is
never copied into the WASM bundle. Host IPC assets are also prepared for the common
multi-provider conformance tests. Deployed WASM assets are identical across the
supported Node.js platforms and require no native executable extraction.

The scanner correction is read from the existing IPC beta patch and applied to
the matching scanner in the generated WASM SDK bundle. Preparation fails if its
expected source context changes. There is one canonical correction and no second
patch to synchronize. Remove it after an SDK upgrade fixes the upstream defect.

```sh
npm ci
npm run generate-meta
npm run bridge:compile
npm run bridge:bundle
npx tsx tools/check-typescript-bundle.mts
```

Set `SONARJS_TYPESCRIPT_BACKEND=tsgo-wasm`, `tsgo-ipc` or `ts6` before loading the
facade. Selection remains fixed per process. `compilerVersion` reports the pinned
compiler SDK; the facade's external-rule compatibility version remains separate.

## Limits and validation

This is an experiment, not a complete TypeScript SDK implementation. Watch programs,
project service and true incremental program updates remain unavailable. WASM runs
the Go compiler on one worker thread, with the WebAssembly 32-bit memory ceiling;
native performance and memory parity are not assumed. The SDK transport replacement,
Go runtime extraction and unofficial distribution all require review on upgrades.

The common conformance suite covers config parsing, virtual POSIX/Windows/UNC paths,
typed object identity, overlays and successive edits. Both TSGo transports run the
same external typed-rule, scanner and snapshot/session regressions. The WASM test
blocks native spawning and TS6 imports while checking a large AST, worker termination
and session restart. Packaged checks cover typed/syntax findings, fixes, IDE edits
and unchanged project configurations. Full-suite and comparison results are recorded
in the draft PR; comparison reports are generated from their adjacent canonical JSON.
