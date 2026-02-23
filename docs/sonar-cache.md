# SonarQube Sensor Cache

This section documents how SonarQube's plugin cache API works and how SonarJS uses it.

### How the SonarQube Cache API works

SonarQube (9.4+) provides a **key-value byte store** that persists between analysis runs. Plugins access it via `SensorContext`:

- `context.previousCache()` — **ReadCache**: read entries written during the previous analysis
- `context.nextCache()` — **WriteCache**: write entries for the next analysis

The API is minimal:

```java
// ReadCache
boolean contains(String key);

InputStream read(String key);

// WriteCache
void write(String key, byte[] data);

void write(String key, InputStream data);

void copyFromPrevious(String key); // forward an unchanged entry
```

**Key contract**: cached data is **not** automatically carried forward between runs. If a plugin doesn't call `nextCache().write()` or `nextCache().copyFromPrevious()` for a key, that entry disappears. This means on a cache hit, the plugin must explicitly call `copyFromPrevious()` to propagate the entries to the next generation.

The cache is completely separate from how SonarQube stores issues, metrics, highlights, and symbols. Those are saved via dedicated `SensorContext` APIs (`newIssue()`, `newMeasure()`, `newHighlighting()`, etc.) and managed by the platform in its own database — not in the plugin cache.

### How the cache is stored internally (SonarQube platform)

On the **scanner side**, the cache lives in the scanner's working directory (`.scannerwork/`). Entries are serialized as protobuf `SensorCacheEntry` messages (key + data) into a single gzip-compressed file (`analysisCache`). The `WriteCacheImpl` writes entries sequentially to this file, and `copyFromPrevious()` is implemented as a read-then-write (reads from `ReadCache`, writes to the output file).

On the **server side**, the cache is stored in the database (`scanner_analysis_cache` table), associated with the branch's last successful analysis. When a new analysis starts, the previous analysis's cache is downloaded and loaded into memory (`AnalysisCacheMemoryStorage`) as the `ReadCache`.

At the end of analysis, the gzip file written by `WriteCacheImpl` is uploaded to the server via the analysis report, becoming the `ReadCache` for the next analysis.

**Critical detail for PR analysis**: The `WriteCache` is a **NoOp** for pull requests (`AnalysisCacheProvider` checks `!branchConfiguration.isPullRequest()`). This means all `write()` and `copyFromPrevious()` calls during PR analysis are silently discarded. The cache is **only populated during branch/full analyses**, never during PRs.

**Design note**: SonarJS still calls `nextCache().write()` and `copyFromPrevious()` during PR analysis even though they're no-ops. This is by design — the plugin API is intentionally simple: plugins always follow the same read/write pattern regardless of context, and the **platform decides** what gets persisted. This avoids leaking branch-type concerns into the plugin. The calls are free (no-op), so there's no need for `if (!isPR)` guards in plugin code.

### What the cache is for

The cache is designed to **skip expensive computations** for unchanged files. In SonarQube's incremental analysis model:

- **DEFAULT mode** (full/branch analysis): every file is analyzed. The cache is populated (`WRITE_ONLY`) but never read. The `WriteCache` is active and entries are persisted.
- **SKIP_UNCHANGED mode** (PR / incremental): unchanged files can use cached data read from the previous branch analysis. The `WriteCache` is a NoOp — PR analysis reads from cache but never writes to it. The platform retains issues, metrics, and highlights from the previous full analysis in its own database. The plugin only needs to re-emit data that the platform doesn't store itself (like CPD tokens for cross-file duplicate detection).

The cache is **not** for storing issues, metrics, or highlights. Those are always re-computed on fresh analysis and the platform handles their persistence independently.

**Note on `canSkipUnchangedFiles()`**: This `SensorContext` method returns `true` only for PR analysis (`branchConfiguration.isPullRequest()`). It signals that the plugin may skip analysis for unchanged files. Separately, `markAsUnchanged()` is a different mechanism only enabled for CFamily and Cobol plugins — SonarJS does not use it.

### Why CPD tokens must be re-emitted even on cache hit

Unlike issues, metrics, highlights, and symbols (which the platform retains per-file in its database), **CPD (Copy-Paste Detection) is a cross-file computation that runs scanner-side, in-memory.** This is why SonarJS must re-emit CPD tokens for every file — even unchanged ones.

The duplication detection pipeline works as follows:

```
1. During sensor execution:
   Plugins call context.newCpdTokens().onFile(file).addToken(...).save()
     → DefaultSensorStorage.store(NewCpdTokens)
       → PmdBlockChunker chunks tokens into Blocks (hashed sequences)
       → SonarCpdBlockIndex.insert(file, blocks)
         → Blocks stored in PackedMemoryCloneIndex (in-memory)

2. After ALL sensors finish:
   CpdExecutor.execute() runs
     → Iterates ALL blocks in the in-memory SonarCpdBlockIndex
     → SuffixTreeCloneDetectionAlgorithm.detect(index, fileBlocks)
       → Cross-file comparison using suffix tree algorithm
       → Finds duplicated code blocks across the entire project
     → Writes duplication results to scanner report
     → Report uploaded to server
```

The critical point: `CpdExecutor` needs tokens from **every file** in the in-memory index. If a file's tokens are missing, the scanner won't detect any duplications involving that file — neither as source nor as target. This makes CPD fundamentally different from per-file data:

| Data type  | Stored where            | Carried forward by platform?     | Must re-emit on cache hit? |
| ---------- | ----------------------- | -------------------------------- | -------------------------- |
| Issues     | Server database         | Yes                              | No                         |
| Metrics    | Server database         | Yes                              | No                         |
| Highlights | Server database         | Yes                              | No                         |
| Symbols    | Server database         | Yes                              | No                         |
| CPD tokens | Scanner in-memory index | **No** (computed fresh each run) | **Yes**                    |

This is why `AnalysisProcessor.processCacheAnalysis()` only calls `saveCpd()` — it's the only data that the scanner needs from every file to perform its cross-file analysis.

### What SonarJS caches

SonarJS caches **two types of data** per JS/TS file, plus file metadata for change detection:

| Cache key pattern                      | Data             | Format                       | Purpose                               |
| -------------------------------------- | ---------------- | ---------------------------- | ------------------------------------- |
| `js:cpd:DATA:{version}:{file}`         | CPD token data   | Binary (var-length encoding) | Duplicate code detection              |
| `js:cpd:STRING_TABLE:{version}:{file}` | CPD string table | Binary                       | Companion to CPD data                 |
| `js:ast:{version}:{file}`              | AST              | Protobuf                     | Analysis consumers (e.g. sonar-armor) |
| `js:filemetadata:{version}:{file}`     | File hash + size | JSON                         | Change detection (SHA-256)            |

The **plugin version** is embedded in every cache key, so upgrading the plugin automatically invalidates all cached entries.

**JS/TS files** get the full cache treatment (read + write + CPD re-emission). **HTML and YAML files** also use the cache strategy to skip analysis on unchanged files, but they do not re-emit CPD tokens on cache hit — the file is silently skipped. **CSS files** are always analyzed fresh (never cached).

### Cache strategy decision flow

`CacheStrategies.getStrategyFor()` determines the strategy per file:

```
1. Is SonarQube >= 9.4 and not SonarLint?
   NO  → NO_CACHE (reason: RUNTIME_API_INCOMPATIBLE)

2. Is analysis mode DEFAULT (full analysis)?
   YES → WRITE_ONLY (reason: ANALYSIS_MODE_INELIGIBLE)

3. Is file metadata in cache and does SHA-256 match?
   NO  → WRITE_ONLY (reason: FILE_CHANGED)

4. Are CPD + AST entries present in previousCache?
   NO  → WRITE_ONLY (reason: FILE_NOT_IN_CACHE)

5. Can cached data be deserialized successfully?
   NO  → WRITE_ONLY (reason: CACHE_CORRUPTED)

6. All checks pass → READ_AND_WRITE (cache hit)
```

Note: `isInCache()` checks for CPD + AST presence but **not** file metadata (metadata is checked separately in step 3).

### What happens on cache hit vs cache miss

**Cache hit** (`READ_AND_WRITE` — file unchanged, data valid):

```
CacheStrategies.readFromCache(serialization)
  → CacheAnalysisSerialization.readFromCache() → CacheAnalysis (CPD tokens + AST)
  → CacheAnalysisSerialization.copyFromPrevious() → forwards CPD + AST to nextCache
    (Note: on PR analysis, these writes go to NoOpWriteCache and are discarded)
    (Note: file metadata is NOT forwarded by copyFromPrevious — only CPD + AST)

For JS/TS files:
  AnalysisProcessor.processCacheAnalysis(context, file, cacheAnalysis)
    → Saves CPD tokens to SonarQube (for cross-file duplicate detection)
  WebSensor.acceptAstResponse(ast, file)
    → Passes AST to registered consumers (e.g. sonar-armor)

For HTML/YAML files:
  File is silently skipped — not analyzed, not re-emitted
  (no processCacheAnalysis, no CPD, no AST forwarding)
```

The file is **not** sent to Node.js. Issues, metrics, highlights, and symbols are **not** re-emitted — the platform retains them from the previous full analysis.

**Cache miss** (`WRITE_ONLY` or `NO_CACHE` — file changed or first analysis):

```
File sent to Node.js bridge for full analysis
  → Node.js returns: issues, metrics, highlights, symbols, CPD tokens, AST

AnalysisProcessor.processResponse(context, checks, file, response)
  → Saves issues to SonarQube
  → Saves metrics (NCLOC, complexity, functions, etc.)
  → Saves highlights (syntax coloring)
  → Saves symbol references
  → Saves CPD tokens

CacheStrategy.writeAnalysisToCache(CacheAnalysis.fromResponse(cpdTokens, ast), file)
  → Writes CPD tokens to nextCache
  → Writes AST to nextCache
  → Writes file metadata (SHA-256 + size) to nextCache
  (Note: on PR analysis, these writes go to NoOpWriteCache and are discarded)
```

### Which file types use caching

| File type                          | Cache strategy applied? | Skip analysis on hit? | CPD re-emitted on hit? | AST forwarded on hit? | Cache written on miss? | Notes                                                        |
| ---------------------------------- | ----------------------- | --------------------- | ---------------------- | --------------------- | ---------------------- | ------------------------------------------------------------ |
| JavaScript (.js, .jsx, .mjs, .cjs) | Yes                     | Yes                   | Yes                    | Yes                   | Yes                    | Full cache support via `processCacheAnalysis()`              |
| TypeScript (.ts, .tsx)             | Yes                     | Yes                   | Yes                    | Yes                   | Yes                    | Full cache support via `processCacheAnalysis()`              |
| HTML (.html, .htm, .xhtml)         | Yes                     | Yes                   | No                     | No                    | Yes                    | File silently skipped on cache hit                           |
| YAML (.yml, .yaml)                 | Yes                     | Yes                   | No                     | No                    | Yes                    | File silently skipped on cache hit; CPD handled by sonar-iac |
| CSS (.css, .less, .scss, .sass)    | No                      | N/A                   | N/A                    | N/A                   | No                     | Always analyzed fresh; bypasses cache entirely               |

### Cache lifecycle across analysis types

Understanding the interplay between analysis types is critical:

```
Full branch analysis (DEFAULT mode):
  → ReadCache: loaded from previous analysis (if any)
  → WriteCache: ACTIVE (writes to .scannerwork/analysisCache)
  → All files analyzed fresh (cache never read)
  → Cache populated with CPD + AST + metadata for all JS/TS/HTML/YAML files
  → Upload cache to server → becomes ReadCache for next analysis

PR analysis (SKIP_UNCHANGED mode):
  → ReadCache: loaded from last successful branch analysis
  → WriteCache: NoOp (all writes silently discarded!)
  → Unchanged JS/TS files: cache HIT → CPD re-emitted, AST forwarded, skip Node.js
  → Unchanged HTML/YAML files: cache HIT → silently skipped entirely
  → Changed files: cache MISS → full analysis via Node.js
  → copyFromPrevious() calls are no-ops (WriteCache is NoOp)
  → No cache uploaded to server (PR doesn't update the stored cache)
```

This means `copyFromPrevious()` only matters for branch-to-branch scenarios, not PR analysis.

### AnalysisMode and rule filtering

Each ESLint rule declares which analysis modes it supports via `analysisModes: AnalysisMode[]` (in `RuleConfig`). The linter filters rules at execution time: only rules whose `analysisModes` array includes the current mode will run.

**Rule mode declaration**: All built-in SonarJS rules have `analysisModes: ['DEFAULT']`. The default in the `EslintHook` Java interface is `List.of(AnalysisMode.DEFAULT)`. However, **external plugins register hooks with `SKIP_UNCHANGED` support** via the `EslintHook` SPI:

- **sonar-security** (removed Nov 2025): declared `[DEFAULT, SKIP_UNCHANGED]` on its taint analysis rules — they ran on both changed and unchanged files. This was the original reason UCFG caching existed.
- **sonar-architecture**: declares `SKIP_UNCHANGED` on `ArchitectureJsEslintHook` — it runs on unchanged files to collect architectural data (import graphs, dependency analysis). AST caching was added in May 2025 for sonar-armor (the architecture analysis backend), which consumes ASTs via the `JsFile` consumer SPI.

This means the "unchanged file, cache miss" path is not idle: while zero SonarJS rules run, external hooks with `SKIP_UNCHANGED` DO execute on the Node.js side.

**How the linter applies the mode** (`Linter.lint()` in `linter.ts`):

```typescript
// Line 203: The key decision
rules: Linter.getRulesForFile(
  filePath,
  fileType,
  fileStatus === 'SAME' ? analysisMode : 'DEFAULT',  // ← KEY LINE
  language,
),

// Line 280: Rule filtering
return (
  fileTypeTargets.includes(fileType) &&
  analysisModes.includes(analysisMode) &&  // ← only rules matching the mode run
  fileLanguage === language && ...
);
```

If `fileStatus` is `SAME` (unchanged), the configured `analysisMode` is used. If the file is `CHANGED` or `ADDED`, the mode is forced to `DEFAULT` regardless of context — ensuring all rules run on changed files.

### Complete file analysis paths

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FULL BRANCH ANALYSIS (master)                        │
│                    AnalysisMode = DEFAULT                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Every JS/TS file:                                                      │
│    Cache strategy: WRITE_ONLY (cache never read)                        │
│    → Sent to Node.js bridge                                             │
│    → All rules run (analysisModes includes DEFAULT)                     │
│    → Full response: issues + metrics + highlights + symbols + CPD + AST │
│    → All data saved to SonarQube                                        │
│    → CPD + AST + metadata written to cache (WriteCache active)          │
│                                                                         │
│  Every HTML/YAML file:                                                  │
│    Cache strategy: WRITE_ONLY                                           │
│    → Sent to Node.js bridge                                             │
│    → Full analysis                                                      │
│    → CPD + AST + metadata written to cache                              │
│                                                                         │
│  Every CSS file:                                                        │
│    No cache strategy (bypassed)                                         │
│    → Sent to Node.js bridge                                             │
│    → Full analysis (metrics + highlights + issues)                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    PR ANALYSIS                                          │
│                    AnalysisMode = SKIP_UNCHANGED                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Unchanged JS/TS file (cache HIT):                                      │
│    Cache strategy: READ_AND_WRITE                                       │
│    → NOT sent to Node.js (skipped entirely)                             │
│    → No rules run                                                       │
│    → CPD tokens re-emitted from cache (for cross-file duplication)      │
│    → AST forwarded to consumers (sonar-armor)                 │
│    → Issues/metrics/highlights: platform retains from previous analysis │
│    → copyFromPrevious() called (NoOp on PR — writes discarded)          │
│                                                                         │
│  Unchanged JS/TS file (cache MISS — e.g. first PR after upgrade):       │
│    Cache strategy: WRITE_ONLY                                           │
│    → Sent to Node.js bridge with fileStatus=SAME                        │
│    → Linter mode: SKIP_UNCHANGED                                        │
│    → Zero SonarJS rules match (all are DEFAULT-only)                    │
│    → BUT: external hooks with SKIP_UNCHANGED DO run                     │
│      (sonar-architecture collects import/dependency data)               │
│    → Response: metrics + CPD tokens + AST (no SonarJS issues)           │
│    → Metrics/CPD/AST saved to SonarQube                                 │
│    → Cache write attempted (but NoOp on PR — discarded)                 │
│                                                                         │
│  Changed JS/TS file:                                                    │
│    Cache strategy: WRITE_ONLY (file changed → cache miss)               │
│    → Sent to Node.js bridge with fileStatus=CHANGED                     │
│    → Linter mode forced to DEFAULT (regardless of analysisMode)         │
│    → ALL rules run (full analysis)                                      │
│    → Full response: issues + metrics + highlights + symbols + CPD + AST │
│    → All data saved to SonarQube                                        │
│    → Cache write attempted (but NoOp on PR — discarded)                 │
│                                                                         │
│  Unchanged HTML/YAML file (cache HIT):                                  │
│    → Silently skipped (not analyzed, nothing re-emitted)                 │
│    → Platform retains previous analysis data                            │
│                                                                         │
│  Changed HTML/YAML file:                                                │
│    → Sent to Node.js bridge for full analysis                           │
│                                                                         │
│  CSS file (always):                                                     │
│    → Sent to Node.js bridge for full analysis (no caching)              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Compliance verdict

**Is SonarJS compliant with the SonarQube caching expectations for plugins?**

**Yes, with caveats.** SonarJS correctly implements the core caching contract:

| Expectation                                            | Status        | Notes                                                                                       |
| ------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------- |
| Skip unchanged files in PR analysis                    | **Compliant** | Unchanged JS/TS files with cache hits skip Node.js entirely                                 |
| Re-emit CPD tokens for unchanged files                 | **Compliant** | `processCacheAnalysis()` re-emits CPD from cache for cross-file duplication                 |
| Forward AST to consumers for unchanged files           | **Compliant** | `acceptAstResponse()` passes cached AST to architecture consumers                           |
| Cache data written during full/branch analysis         | **Compliant** | CPD + AST + file metadata written for JS/TS/HTML/YAML files                                 |
| Cache invalidation on plugin upgrade                   | **Compliant** | Plugin version embedded in cache keys                                                       |
| File change detection                                  | **Compliant** | SHA-256 hash comparison via `FileMetadata`                                                  |
| WriteCache NoOp during PR analysis                     | **Compliant** | SonarJS calls `write()`/`copyFromPrevious()` but the platform silently discards them on PRs |
| Not re-emitting issues/metrics/highlights on cache hit | **Compliant** | Platform retains these from previous full analysis                                          |

**Caveats / areas for improvement:**

1. **HTML/YAML files are silently skipped on cache hit** — no CPD re-emission, no AST forwarding. This is intentional (CPD handled by other plugins) but means zero data is provided for these files on cache hit. If the platform ever needs something from SonarJS for unchanged HTML/YAML files, this would need to change.

2. **No SonarJS rules run on unchanged files** — all built-in rules have `analysisModes: ['DEFAULT']`. However, external plugins (sonar-architecture) register hooks with `SKIP_UNCHANGED` that DO run on unchanged files via the `EslintHook` SPI. The platform retains SonarJS issues from the previous full analysis, so re-running SonarJS rules on unchanged files would be redundant.

3. **CSS files are never cached** — always analyzed fresh. This is acceptable because CSS analysis is lightweight (no ESLint, just stylelint) and CSS files are typically small.

### Cache key structure

Keys use colon-separated segments: `{prefix}:{prefix}:{pluginVersion}:{fileKey}`

The `CacheKey` class builds keys hierarchically:

```java
CacheKey.forFile(inputFile, pluginVersion)  // base key
  .forCpd()          // → js:cpd:{version}:{file}
  .forAst()          // → js:ast:{version}:{file}
  .forFileMetadata()  // → js:filemetadata:{version}:{file}
```

CPD additionally splits into `DATA` and `STRING_TABLE` sub-keys for efficient serialization.

### Cache statistics

`CacheReporter` tracks and logs hit/miss statistics at the end of each analysis:

```
Hit the cache for 45 out of 100
Miss the cache for 55 out of 100: FILE_CHANGED [10/100], FILE_NOT_IN_CACHE [45/100]
```

Miss reasons: `RUNTIME_API_INCOMPATIBLE`, `CACHE_DISABLED`, `ANALYSIS_MODE_INELIGIBLE`, `FILE_CHANGED`, `FILE_NOT_IN_CACHE`, `CACHE_CORRUPTED`.

### History

| Date     | Commit     | Change                                                                                                                                                   |
| -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sep 2022 | `c57c9df1` | Foundation: `AnalysisMode` class added; sensors skip unchanged files when analysis allows it                                                             |
| Sep 2022 | `e998b0c5` | Initial caching with SonarQube Cache API — cached UCFG files for SonarSecurity via `CacheStrategy` + `CacheSerialization`                                |
| Sep 2022 | `9ffffc48` | Refactored: extracted `CacheStrategies`, `CacheKey`, `UCFGFilesSerialization`, `JsonSerialization` from monolithic class                                 |
| Sep 2022 | `17a9c51c` | Added `CacheReporter` for hit/miss statistics logging                                                                                                    |
| Sep 2022 | `3987a921` | Simplified: removed `CacheReader`/`CacheWriter` interfaces                                                                                               |
| Oct 2022 | `ed9433d5` | Bundle version added to cache key (invalidate on rule bundle changes)                                                                                    |
| Jan 2023 | `b9e5111f` | CPD tokens added to cache; `CacheAnalysis` + `processCacheAnalysis()` created; `isInCache()` now requires UCFG + CPD                                     |
| Jan 2023 | `d4c9430b` | File hash (SHA-256) validation via `FileMetadata` for change detection                                                                                   |
| Jan 2023 | `ed62d04f` | Efficient binary encoding for CPD tokens (var-length integers + string table deduplication)                                                              |
| Apr 2023 | `00b1ab08` | JS and TS sensors merged into single `JsTsSensor`; caching logic unified                                                                                 |
| Apr 2024 | `0e5e9239` | Error handling: ignore runtime errors when saving CPD tokens                                                                                             |
| Apr 2024 | `5950215f` | Skip file when CPD token save fails                                                                                                                      |
| Jun 2024 | `4df23d00` | Catch `IllegalStateException` when saving highlights and CPD tokens                                                                                      |
| May 2025 | `1ec7c001` | AST (protobuf) added to cache for sonar-armor consumers; `isInCache()` now requires CPD + AST                                                            |
| Nov 2025 | `9324ae34` | SonarSecurity UCFG caching removed; cache now stores only CPD + AST                                                                                      |
| Feb 2026 | `03f479ad` | WebSensor consolidation: HTML/CSS/YAML sensors merged into WebSensor; CSS bypasses cache entirely; HTML/YAML use cache strategy but don't re-emit on hit |

### Key source files

| File                                                | Purpose                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `cache/CacheStrategies.java`                        | Decides cache strategy per file (NO_CACHE / WRITE_ONLY / READ_AND_WRITE); calls `copyFromPrevious()` on hit |
| `cache/CacheStrategy.java`                          | Strategy object: holds cached data (if hit) and serialization reference                                     |
| `cache/CacheAnalysis.java`                          | Container for cached data: CPD tokens + AST                                                                 |
| `cache/CacheAnalysisSerialization.java`             | Orchestrates read/write of AST + CPD + metadata; `copyFromPrevious()` forwards AST + CPD (not metadata)     |
| `cache/AstProtobufSerialization.java`               | AST protobuf serialization                                                                                  |
| `cache/CpdSerialization.java`                       | CPD binary serialization (data + string table)                                                              |
| `cache/CpdSerializer.java` / `CpdDeserializer.java` | Binary encoding/decoding with var-length integers and string table                                          |
| `cache/FileMetadata.java`                           | SHA-256 hash + file size for change detection                                                               |
| `cache/CacheKey.java`                               | Hierarchical cache key builder                                                                              |
| `cache/CacheReporter.java`                          | Hit/miss statistics logging                                                                                 |
| `cache/CacheSerialization.java`                     | Base class wrapping SonarQube's ReadCache/WriteCache API                                                    |
| `AnalysisProcessor.java`                            | `processResponse()` (full save) vs `processCacheAnalysis()` (CPD only)                                      |
| `WebSensor.java`                                    | Entry point: applies cache strategy, routes to analysis or cache path                                       |

### SonarQube platform source files (sonar-enterprise)

| File                                                             | Purpose                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `sonar-scanner-engine/.../cache/AnalysisCacheProvider.java`      | Creates ReadCache/WriteCache beans; **WriteCache is NoOp for PRs**           |
| `sonar-scanner-engine/.../cache/WriteCacheImpl.java`             | Writes entries as protobuf to gzip file; `copyFromPrevious()` = read + write |
| `sonar-scanner-engine/.../cache/ReadCacheImpl.java`              | Reads from in-memory `AnalysisCacheMemoryStorage`                            |
| `sonar-scanner-engine/.../cache/AnalysisCacheMemoryStorage.java` | Loads previous cache into memory from server download                        |
| `sonar-scanner-engine/.../cache/AnalysisCacheEnabled.java`       | Checks `sonar.analysisCache.enabled` property (default: true)                |
| `sonar-scanner-engine/.../report/AnalysisCachePublisher.java`    | Closes the cache file for upload in the analysis report                      |
| `sonar-scanner-engine/.../sensor/ProjectSensorContext.java`      | `canSkipUnchangedFiles()` returns `true` only for PRs                        |
| `sonar-scanner-engine/.../sensor/UnchangedFilesHandler.java`     | `markAsUnchanged()` — only enabled for CFamily and Cobol, not SonarJS        |
