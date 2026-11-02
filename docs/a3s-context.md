# SonarJS A3S context contract

## Recording and the sensor cache

The SQAA collector context and the persistent [sensor cache](./sonar-cache.md) have separate
publication lifecycles. The sensor cache also transports a baseline for incremental recording.
`DefaultFilesystemCacheContext.isEnabled()` delegates to the platform's
`A3SContextCollector.isEnabled()`. On a supported host, when collection is enabled and this is
not a restored-context request, `WebSensor` records a new context.

Recording keeps `AnalysisMode.DEFAULT` so cold fallback runs all rules. Since SonarJS 14.1,
this override prevented per-file cache reuse during collection, including PRs. The snapshot
reuse implementation allows confirmed cache hits while retaining all request files.

A completed recording writes a versioned sensor-cache entry containing both archives, the
collector JSON metadata and a compatibility manifest. During PR recording, `previousCache()`
provides the platform-selected reference baseline. Node validates settings/rules and input
paths/types, refreshes every baseline filesystem observation from the current checkout and
seeds compatible program selections before skipping accepted files. Java waits for Node's
`cacheHit` acknowledgment before copying cached results and re-emitting CPD/AST.

The resulting PR context includes unchanged inputs and current changed-file contents. Missing
or incompatible baselines fall back to full recording, including changes to dependencies,
configuration, file lists or source dependency directives. Request-provided contents and
unsupported filesystem observations also fall back. Validation still reads filesystem inputs.

The scanner owns cache enablement, reference selection and persistence. PR `nextCache()`
writes are no-op; they do not overwrite the branch baseline. There are still two collector
attachments: the compatibility manifest exists only inside the sensor-cache bundle.
See `ContextSnapshotCache`, `WebSensor` and `packages/grpc/src/incremental-context.ts`.

### Platform collection policy

The collection decision is separate from sensor-cache enablement. In the scanner-engine
revision audited on 2026-11-02 (`a54007566d`):

- **Cloud:** [A3SContextImpl](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/cloud/sonar-scanner-extension-a3s/src/main/java/org/sonar/scanner/a3s/A3SContextImpl.java)
  fetches `collection-config` with organization and project keys, caches the response for the
  scan and returns its `enabled` value. It has no PR exclusion or local collection toggle.
- **Server:** [A3SServerContextCollector](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/server/private/core-extension-a3s-scanner/src/main/java/com/sonarsource/a3s/scanner/A3SServerContextCollector.java)
  requires both the local collection setting and the API's enabled response. The local
  `sonar.vortex.collection.enabled` setting defaults to `true`; it is not a Cloud control.
- **Light:** [NoOpA3SContextCollector](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/a3s/sonar-scanner-engine-light/src/main/java/org/sonar/scanner/engine/light/internal/NoOpA3SContextCollector.java)
  returns `false`. This host can replay an existing context without recording a new CI context
  or enabling the sensor cache.

For Cloud diagnosis, debug logs include
`A3S collection configuration fetched from API and cached: true`; publication logs include
`Collecting context of kind 'javascript'`. These establish collection activity separately from
sensor-cache download and hit/miss messages. `ANALYSIS_MODE_INELIGIBLE` alone identifies the
effective mode, not the reason collection was enabled for a particular customer.

## Stored context and replay

SonarJS owns the context of kind `javascript`. Shared context information is carried in the
collector's JSON metadata, not in a file attachment:

```json
{
  "configuration": {
    "baseDir": "C:/ci/project",
    "sources": ["src"],
    "disableTypeChecking": false
  }
}
```

Java saves its complete raw `ProjectConfiguration` request using the standard Protobuf JSON
serializer. The request schema is the single source of truth for recorded fields; recording has
no setting whitelist or Node sanitization. `baseDir` lives only inside that configuration.
Explicit booleans, omitted versus empty wrapped lists, repeated fields and numeric values retain
their protocol semantics (64-bit integers use JSON strings).

WebSensor creates this JSON before sending the analysis request and publishes it through
`A3SContextCollector` after the two attachments are produced. Node returns no collector metadata.
SQAA forwards the stored string
using `sonar.javascript.internal.contextMetadata`. WebSensor validates the metadata structure and
project root, reconstructs logical request paths, and forwards the same JSON in
`filesystem_cache.context_metadata`. Node restores the captured settings, rebasing project-owned
absolute paths together when replay crosses operating systems. Paths remain Unix-normalized.

Node's replayable-field list controls restoration only, not recording. It restores saved analysis
settings before invoking the same normalization used during CI, including resetting omitted
settings rather than inheriting SQAA defaults. Runtime-only flags (`sonarlint`, `skipAst`,
`canAccessFileSystem`, incremental events/mode) and submitted contents/active rules belong to the
current request. Recorded `tsConfigPaths` remain available in raw metadata, but recorded program
selection determines which program is restored. Java and SQAA do not duplicate the restore list.

There are still exactly two attachments:

- `filesystem-cache`: observed project filesystem inputs.
- `analysis-metadata`: program selection only (configured/orphan programs, compiler options,
  file mappings and explicit no-program outcomes). The item ID is retained, although shared
  analysis metadata now lives in JSON.

Only Node decodes these gzip/Protobuf attachments. Java and SQAA inspect their existence and size
but never decompress or parse them. Java no longer generates classes from the snapshot schema.
The removed configuration, derived scope and project-root Protobuf fields are reserved.

SQAA can forward a context collected by an earlier analyzer release. SonarJS validates the
filesystem archive format version; this does not guarantee that the current analyzer can replay
every operation it needs from an older context.

Missing or old `{}` collector metadata and unrecorded program selections use source-only analysis.
If replay fails with a missing filesystem observation or an unsupported filesystem operation,
SonarJS ends both replay sessions and retries once using the original request settings and submitted
contents in the runtime project directory. Logs and response metadata warn that type information
and dependency context may be incomplete for the remaining files. Results are streamed immediately.
Replay and source-only analysis share the same file-processing code, pending-file set, and result
collection. If replay fails, the catch block restores the source-only context, translates the pending
work to the runtime namespace, and resumes unfinished files, including the file that failed. Already
analyzed files remain available as submitted dependency inputs without being analyzed or emitted
again. Results are not buffered for streaming, and unary results produced before the failure are
also retained. The final stream can therefore contain context-backed results followed by source-only
results and one final metadata event with the fallback warning. Cancellation applies throughout.

Malformed metadata, incomplete attachment pairs, corrupt snapshots, invalid paths and unrelated
analyzer errors remain failures. A source-only retry failure also propagates. Fallback is explicitly
reported, rather than presented as successful context restoration. The real Java/Node
recording-replay test checks the context contract, while SQAA's adapter test verifies lossless
forwarding without interpreting either attachment.

Project reproducibility remains bounded by `baseDir`. External CI dependencies and runtime files
are not captured as portable project inputs. The filesystem/program-selection pairing and
authoritative submitted contents are unchanged.
