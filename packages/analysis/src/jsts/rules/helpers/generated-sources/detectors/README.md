# Generated-Source Detectors

This folder isolates tool-specific generated-source detection behind a small plugin contract.

Each detector must:

- Declare a single `family` identifier.
- Declare any basename-only config files through `watchedFilenames` so `GeneratedSourceStore` knows when cached metadata is stale.
- Implement `detect(context)` and return only project-local paths rooted under `baseDir`.
- Report inferred `configPaths` and `outputDirectories` so cache invalidation stays aligned with detection.

Detector-facing config and output discovery helpers live in `../detector-api.ts`. Lower-level script parsing, path safety, and directory traversal helpers live in `../shared.ts`. Tool-specific heuristics and config parsing stay in the detector module for that tool.

Scope policy for new detectors:

- Add a detector only when there is demonstrated noise reduction on real projects or Peach.
- Prefer tools that expose stable committed metadata such as package dependencies, scripts, or config files.
- Keep ownership explicit: each detector must stay small, focused, and independently testable.
