# SonarJS A3S context contract

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
