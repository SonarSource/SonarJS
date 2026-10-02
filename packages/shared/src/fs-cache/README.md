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

The scanner creates a unique directory below its work directory and sends Node explicit RECORD
mode with two output paths. After successful analysis, the scanner publishes both gzip-compressed
Protocol Buffers artifacts in one context:

- context kind: `javascript`
- item ids: `filesystem-cache` and `analysis-metadata`
- context metadata: `{}`

The filesystem artifact contains observed project inputs. The analysis-metadata artifact contains
recorded analyzer settings and per-file program outcomes: a selected configured/orphan program,
or an explicit no-program decision. Node owns their schemas, decoding, and compatibility checks;
the scanner and SQAA adapter only transport them.

SQAA resolves context for the requested branch (by branch ID or project plus branch name), falling
back to the project's main branch when no contexts are found. The context service selects contexts
from that branch's latest recorded analysis; collection enablement is project/organization based,
not restricted by this integration to main-branch scans.

SQAA restores the pair and sets `sonar.javascript.internal.filesystemCacheArchivePath` and
`sonar.javascript.internal.analysisMetadataPath`. WebSensor sends explicit REPLAY mode and always
includes the submitted source text. That text overrides the recorded file contents, including
when rebuilding the TypeScript program. Recorded project settings are restored without replacing
the request's base directory, file scope, or runtime paths.

Replay should use the same analyzer version as recording: reads outside the analysis root,
including the analyzer installation and bundled TypeScript declarations, deliberately remain native.
The request's existing `rules_workdir` is also the native passthrough tree. Analyzer extensions may
create derived artifacts there (for example, architecture UDG files), and those outputs are neither
project inputs nor part of the portable archive. Filesystem calls whose path or descriptor stays in
that tree remain native. Multi-path operations must keep every target there; crossing into the
archived project tree and mutations elsewhere inside that tree still fail closed.

Context handling distinguishes these cases:

- No context: omit cache configuration and use ordinary source-only analysis, including a basic
  orphan TypeScript program when applicable. Nothing is recorded or replayed.
- Partial, duplicate, empty, or unrestorable items: the SQAA adapter prepares source-only analysis
  and reports `INVALID_CONTEXT`. A direct Node request with a one-sided pair is invalid.
- Corrupt or incompatible serialized context: Node rejects the request as `invalid_request`
  (`INVALID_ARGUMENT` over gRPC), cleans up its session, and does not overwrite the artifacts or
  silently present reduced type-aware coverage as successful restoration.
- Unsupported recorded program selection, including a new file without a recorded outcome:
  warn and fall back to ordinary source-only analysis. An explicit recorded no-program outcome is
  supported and remains no-program rather than creating a replacement program.

CSS-only requests do not restore JavaScript context. HTML and YAML JavaScript analysis can still
use recorded analyzer settings even though their embedded snippets do not use TypeScript programs.
SonarQube for IDE and hosts without the context-collection API use a no-op integration and cannot
activate the filesystem cache, even if the internal property is set.
