# Filesystem cache hook

This directory contains a standalone Node preload that caches, records, and replays the read-side
filesystem state used by a process. It has no dependency on the SonarJS analyzer or its file
stores.

Enable it with Node's `--import` option:

```shell
SONARJS_FS_CACHE_MODE=record \
SONARJS_FS_CACHE_ROOT=/workspace/project \
SONARJS_FS_CACHE_ARCHIVE=/workspace/project.fscache \
node --import ./bin/fs-cache/register.mjs ./bin/server.cjs
```

Use `SONARJS_FS_CACHE_MODE=replay` with another `SONARJS_FS_CACHE_ROOT` to restore the recorded
paths relative to that root. Set `SONARJS_FS_CACHE_STRICT=1` to reject unrecorded reads inside the
root instead of passing them through to the live filesystem. An optional
`SONARJS_FS_CACHE_ANALYZER_VERSION` is persisted and checked during replay.

Record mode starts with a cold in-memory cache. The first read of a filesystem fact uses native
`fs`; compatible later operations reuse the consolidated per-path state. For example, file content
is shared by `readFile` and descriptor APIs, metadata by `stat` and `fstat`, and typed directory
entries by `readdir` and `opendir`. This both avoids repeated filesystem work during normal CI
analysis and produces the archive used by replay. The configured root is assumed to remain stable
for the lifetime of the process; mutation tracking and invalidation are intentionally unsupported.

The archive is a versioned gzip-compressed JSON document containing one semantic node per path. It
is written atomically during normal process exit or when
`getFsCacheInstallation().flush()` is called. Archive storage and transfer by the scanner are
intentionally outside the scope of this hook.

The cache exists only when Node is explicitly started with this preload. Standard analyzer code is
unaware of it, and SonarLint must not enable the preload. Callable `fs` exports that did not exist
in the minimum supported Node 22.12 runtime fail when invoked while the hook is active. This
prevents a newer Node filesystem API from silently bypassing recording or replay before its
semantics have been explicitly reviewed. Synchronous APIs throw
`ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION`; `fs/promises` APIs return a rejected promise with the
same error, matching their native call contract. An unhandled rejection therefore terminates Node
normally.
