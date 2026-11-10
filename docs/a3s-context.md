# SonarJS A3S context contract

## Recording and the sensor cache

The SQAA collector context and the persistent [sensor cache](./sonar-cache.md) have separate
publication lifecycles. The sensor cache also transports a baseline for incremental recording.
`DefaultFilesystemCacheContext.isEnabled()` delegates to the platform's
`A3SContextCollector.isEnabled()`. On a supported host, when collection is enabled and this is
not a restored-context request, `WebSensor` records a new context.

Recording preserves the scanner's analysis mode. The override introduced in SonarJS 14.1
forced `AnalysisMode.DEFAULT` and prevented per-file cache reuse during collection, including
PRs. Cache eligibility is now independent of context availability: missing context must not
force analysis of otherwise reusable files.

A successful recording writes a versioned sensor-cache entry containing both archives, the
collector JSON metadata and a small completion marker. The marker is transported as gzip binary;
Java restores plain JSON before passing its path to Node. The filesystem and program-selection
archives are already compressed and are transported unchanged.

During PR recording, Java handles per-file cache hits exactly as it does without recording:
it copies cached results, re-emits CPD/AST where applicable, and omits those files from the
Java-to-Node request. Node receives only files requiring analysis. An all-cached request has
an empty files map. The normal file-store walk still discovers project configuration and records
directory listings, but does not analyze source files or create TypeScript programs.

The filesystem layer passively retains the platform-selected `previousCache()` baseline.
In RECORD mode every intercepted filesystem call uses the native filesystem; its result updates
the snapshot. Supplied source contents are recorded too. Program-selection outcomes are carried
forward and replaced when actual analysis learns a new outcome. Baseline entries are not served
as filesystem answers during CI analysis. In SQAA REPLAY, by contrast, the archive is authoritative.

There is no separate snapshot-entry validation walk. Fresh, complete directory listings remove
inherited paths that no longer exist, including removed subtrees. Discovered `tsconfig.json` files,
explicit tsconfig-path matches and dependency manifests refresh their contents during the normal
file-store walk, including all-cached requests. Unchanged source contents remain in the baseline
without being reread solely for context.

Reconciliation covers directories visited by normal discovery. Untouched dependency observations
may remain stale. An arbitrary extended config outside tsconfig discovery is refreshed only when
normal analysis reads it; this change does not add eager config-graph resolution. Program metadata
is retained and updated by actual analysis, but never expands CI program roots. PR snapshots do
not promise the semantics of a fresh full analysis.

Dependency-aware reanalysis after imported files or TypeScript configuration changes is a separate
improvement tracked by JS-2815. This regression fix preserves the previous cache trust boundary.

Without a usable baseline, cache hits still work. If Java reused any hits, it omits context
publication instead of reanalyzing those files to reconstruct context. A completion marker only
confirms successful analysis and archive persistence; it is not a filesystem-completeness check.
Context initialization, serialization and publication errors do not fail successful analysis.

The scanner owns cache enablement, reference selection and persistence. PR `nextCache()`
writes are no-op; they do not overwrite the branch baseline. There are still two collector
attachments: the completion marker exists only inside the sensor-cache bundle.
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
