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
  archivePath: '/workspace/project.fscache',
  rootDir: '/workspace/project',
});
try {
  await analyzeProject();
} finally {
  session.end();
}
```

If the archive does not exist when the session starts, the cache records native filesystem
observations and creates it. If the archive exists, it is treated as an immutable strict cache:
unrecorded reads inside the root fail instead of touching the live filesystem. Delete an archive
explicitly to regenerate it. Corrupt and format-incompatible archives are never replaced silently.

For a long-lived Node process, `beginAnalysis()` selects the archive and root once per request.
Stable wrappers consult that active session; they do not parse environment variables or replace
filesystem functions on each call. `session.end()` flushes a newly created archive and returns the
wrappers to dormant native passthrough. Overlapping sessions are rejected as a lifecycle invariant.

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
otherwise empty per-path nodes. The archive is written atomically when the session ends, during
normal process exit if a session is still active, or when `getFsCacheInstallation().flush()` is
called. Archive storage and transfer by the scanner are intentionally outside the scope of this
hook.

The cache is active only while an analysis session is activated. Requests without
`filesystem_cache` use native `fs`; SonarLint must not request a cache session.
Every callable filesystem operation that the cache does not patch fails when invoked while a
session is active, including operations already
available in Node 22.12 and operations added by a newer runtime. This prevents a dependency update
from silently bypassing recording or replay before the operation's semantics have been explicitly
implemented. `writeSync` passes through only for the stdout and stderr descriptors that Node uses
for diagnostics; archive serialization uses privately captured native primitives. Write-capable
opens, writes to other descriptors, and reads from unknown descriptors fail closed. Synchronous
APIs throw `ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION`. Promise-returning `fs/promises` APIs
return a rejected promise with the same error; `glob` and `watch`, whose native contract returns an
async iterable synchronously, throw immediately instead.

The preload patches Node's builtin `fs` objects directly and synchronizes their ESM exports. It
does not register Node customization hooks: those hooks intercept the entire module graph on a
dedicated loader thread, adding startup and module-loading overhead unrelated to filesystem calls.
