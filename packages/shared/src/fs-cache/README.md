# Filesystem cache preload

This directory contains a standalone Node preload that caches, records, and replays the read-side
filesystem state used by a process. It has no dependency on the SonarJS analyzer or its file
stores.

Enable it with Node's `--import` option:

```shell
SONARJS_FS_CACHE_MODE=record \
SONARJS_FS_CACHE_ROOT=/workspace/project \
SONARJS_FS_CACHE_ARCHIVE=/workspace/project.fscache \
SONARJS_FS_CACHE_ARCHIVE_BACKEND=disk \
node --import ./bin/fs-cache/register.mjs ./bin/server.cjs
```

Use `SONARJS_FS_CACHE_MODE=replay` with another `SONARJS_FS_CACHE_ROOT` to restore the recorded
paths relative to that root. Set `SONARJS_FS_CACHE_STRICT=1` to reject unrecorded reads inside the
root instead of passing them through to the live filesystem. An optional
`SONARJS_FS_CACHE_ANALYZER_VERSION` is persisted and checked during replay.

`SONARJS_FS_CACHE_ARCHIVE_BACKEND` selects the interchangeable persistence implementation:

- `json` (the default) preserves the original implementation. It retains semantic nodes and
  base64 file contents in memory, then writes one gzip-compressed JSON document at flush time.
- `disk` compresses each observed file content immediately into a private spool file. It retains
  semantic metadata, blob offsets, and a bounded hot-content cache in memory, and finalizes one
  archive containing the compressed blobs, a compressed protobuf index, and a fixed footer locating
  that index. Replay seeks to and decompresses only the requested blob. Protobuf supplies the
  versioned index encoding; compression is per content blob so that the archive remains randomly
  readable.

The disk backend's raw-content LRU is disabled by default. Set
`SONARJS_FS_CACHE_DISK_MEMORY_LIMIT_MB` to a positive size to trade a bounded amount of memory for
hot content reads. The default forces every content hit through the compressed archive and keeps
retained content memory independent of project size. The setting does not change which filesystem
observations are recorded.

Record and replay must use the same backend. Keeping the selection outside the hook contract lets
the storage implementation change without making the analyzer or its file stores aware of it.

Record mode starts with a cold cache. The first read of a filesystem fact uses native
`fs`; compatible later operations reuse the consolidated per-path state. For example, file content
is shared by `readFile` and descriptor APIs, metadata by `stat` and `fstat`, and typed directory
entries by `readdir` and `opendir`. This both avoids repeated filesystem work during normal CI
analysis and produces the archive used by replay. The configured root is assumed to remain stable
for the lifetime of the process; mutation tracking and invalidation are intentionally unsupported.

Both archive formats contain one consolidated semantic node per path and are written atomically
during normal process exit or when
`getFsCacheInstallation().flush()` is called. Archive storage and transfer by the scanner are
intentionally outside the scope of this hook.

The cache exists only when Node is explicitly started with this preload. Standard analyzer code is
unaware of it, and SonarLint must not enable the preload. Every callable filesystem operation that
the cache does not patch fails when invoked while the hook is active, including operations already
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
