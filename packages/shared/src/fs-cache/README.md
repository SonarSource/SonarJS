# Filesystem cache hook

This directory contains a standalone Node preload that records and replays the read-side
filesystem observations made by a process. It has no dependency on the SonarJS analyzer or its
file stores.

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

The archive is a versioned gzip-compressed JSON document. It is written atomically during normal
process exit or when `getFsCacheInstallation().flush()` is called. Archive storage and transfer by
the scanner are intentionally outside the scope of this hook.
