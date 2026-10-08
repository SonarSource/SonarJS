# Filesystem cache hook

This directory contains a Node filesystem hook that caches, records, and replays the read-side
filesystem state used by one analysis at a time. It has no dependency on SonarJS file stores or
individual filesystem call sites.

The AnalyzeProject worker installs the stable filesystem wrappers before loading analyzer
dependencies. With no cache request configuration, the hook stays dormant and every call uses
native `fs`. The request handler activates one archive session when its optional
`filesystem_cache` configuration is present, and ends that session before completing the response.
Java and SQAA do not need to change the Node command line.

Call `beginAnalysis()` with the analysis root and archive path to activate the cache explicitly:

```js
const session = installFsCache().beginAnalysis({
  archivePath: '/workspace/filesystem.pb.gz',
  mode: 'record',
  rootDir: '/workspace/project',
});
try {
  await analyzeProject();
} finally {
  session.end();
}
```

In `record` mode, the cache records native filesystem observations and creates a new archive.
In `replay` mode, the existing archive is treated as an immutable strict cache:
unrecorded reads inside the root fail instead of touching the live filesystem. Delete an archive
explicitly to regenerate it. Corrupt and format-incompatible archives are never replaced silently.
The standalone hook API can infer the mode from archive existence when `mode` is omitted, but
AnalyzeProject requests must explicitly select RECORD or REPLAY.

For a long-lived Node process, `beginAnalysis()` selects the archive and root once per request.
Stable wrappers consult that active session; they do not parse environment variables or replace
filesystem functions on each call. `session.end()` flushes a newly created archive and returns the
wrappers to dormant native passthrough. Overlapping sessions are rejected as a lifecycle invariant.
An asynchronous read completing after its session ends cannot record into a later session.
An outstanding native open is closed before its caller receives
`ERR_SONARJS_FS_CACHE_SESSION_ENDED`, preventing descriptor leaks and cross-request ownership.

Creating an archive starts with a cold in-memory cache. The first read of a filesystem fact uses
native `fs`; compatible later operations reuse the consolidated per-path state. For example, file
content is shared by `readFile` and descriptor APIs, metadata by `stat` and `fstat`, and typed
directory entries by `readdir` and `opendir`. This both avoids repeated filesystem work during
normal CI analysis and produces the archive used by later sessions. The configured root is assumed
to remain stable for the lifetime of the session; mutation tracking and invalidation are
intentionally unsupported.

The archive is a versioned gzip-compressed Protocol Buffers document. Its typed schema stores raw
file bytes, filesystem errors, stats, directory entries, paths, and link observations without JSON
or Base64 serialization. Paths observed only as missing use a compact, canonical list instead of
otherwise empty per-path nodes. The archive is written atomically when the session ends or during
normal process exit if a session is still active. Archive storage and transfer by the scanner are
intentionally outside the scope of this hook.

The cache is active only while an analysis session is activated. Requests without
`filesystem_cache` use native `fs`; SonarLint must not request a cache session.
Every callable filesystem operation that the cache does not patch fails when invoked while a
session is active, including operations already
available in Node 22.12 and operations added by a newer runtime. This prevents a dependency update
from silently bypassing recording or replay before the operation's semantics have been explicitly
implemented. `writeSync` passes through only for the stdout and stderr descriptors that Node uses
for diagnostics; archive serialization uses privately captured native primitives. Write-capable
opens, writes to other descriptors, and reads from unknown descriptors fail closed. Synchronous
APIs throw `ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION`. The explicitly configured native
passthrough directories are the exception: their writes and write-capable opens remain native.
Promise-returning `fs/promises` APIs
return a rejected promise with the same error; `glob` and `watch`, whose native contract returns an
async iterable synchronously, throw immediately instead.

The preload patches Node's builtin `fs` objects directly and synchronizes their ESM exports. It
does not register Node customization hooks: those hooks intercept the entire module graph on a
dedicated loader thread, adding startup and module-loading overhead unrelated to filesystem calls.

## SQAA context contract

On supported SonarQube versions, CI records context only when the A3S context collector is enabled.
Collection-enabled scans analyze unchanged files too: a scanner analysis-cache hit cannot provide
the filesystem observations or program-selection outcomes needed for replay. Scans without
collection retain the ordinary incremental-analysis behavior.

The scanner sends Node explicit RECORD mode with two output paths and publishes the resulting
gzip-compressed Protocol Buffers attachments under context kind `javascript`:

- `filesystem-cache`: observed project filesystem inputs.
- `analysis-metadata`: TypeScript program selections, compiler options, file mappings and explicit
  no-program outcomes.

Shared CI settings, including the recorded project root, are published separately in collector
JSON metadata as `{ "configuration": ... }`. They are not stored in either attachment. Only Node
decodes the attachments; Java and SQAA transport them.

The authoritative recording, restoration, path translation and fallback contract is
[SonarJS A3S context contract](../../../../docs/a3s-context.md). Consult that document when
integrating or validating context restoration rather than treating a successful source-only
analysis as proof that context was restored.

SQAA resolves context for the requested branch (by branch ID or project plus branch name), falling
back to the project's main branch when no contexts are found. The context service selects contexts
from that branch's latest recorded analysis; collection enablement is project/organization based,
not restricted by this integration to main-branch scans.

SQAA forwards the collector JSON through `sonar.javascript.internal.contextMetadata`, alongside
`sonar.javascript.internal.filesystemCacheArchivePath` and
`sonar.javascript.internal.analysisMetadataPath`. With compatible context, WebSensor sends explicit
REPLAY mode and includes the submitted source text, which takes precedence over archived contents.
Missing or legacy `{}` collector metadata uses the logged no-context fallback, even when both
attachments exist.
