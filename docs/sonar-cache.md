# SonarQube Sensor Cache

This section documents how SonarQube's plugin cache API works and how SonarJS uses it.

The sensor cache, Node's in-memory caches, and SQAA's recorded context are different mechanisms.
See [Node.js analysis caches](./node-analysis-caches.md) and [the A3S context contract](./a3s-context.md)
for the other two layers. SQAA recording creates fresh context while preserving per-file
sensor-cache reuse. The sensor cache does not transport SQAA context.

Source audit: 2026-11-02, SonarJS `c0037621e1a4c4d027e98f5ad1d2a31037225c65` and
sonar-scanner-engine `a54007566d`. The SonarJS recording path below reflects the
self-contained PR-context changes of 2026-11-10.
Platform details below distinguish Cloud, Server and Light;
they do not establish backend storage or cache-selection policy outside scanner-engine.

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

**Key contract**: a new cache generation contains only entries written or explicitly copied to
it. When the platform publishes a replacement generation, entries omitted from that generation
are not automatically carried forward. A no-op writer, including on PRs, does not replace the
stored branch cache.

Write or copy each key at most once per generation: Cloud and Server reject duplicate keys.
The `InputStream` overload is buffered into a byte array by both implementations; it does not
provide streaming storage. Snapshot size therefore contributes to scanner memory and transport cost.

Issues, metrics, highlights and symbols use dedicated `SensorContext` APIs (`newIssue()`,
`newMeasure()`, `newHighlighting()`, etc.). They are not stored in this plugin cache.

### Platform cache implementations

Both Cloud and Server load previous entries into memory and serialize new entries as delimited
protobuf `SensorCacheEntry` messages. Both provide a no-op writer for PR analysis, even when
the reader has a valid cache. Their transport and enablement differ:

| Aspect                        | SonarQube Cloud                                                                                                                          | SonarQube Server                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Enablement checked by scanner | Both `sonar.sensor.cache.enable` and `sonar.sensor.cache.project.enable`; registered defaults are `true`                                 | `sonar.analysisCache.enabled`, default `true`                                       |
| Read request                  | Analysis API `sensor-cache/prepare-read`, then download from the returned pre-signed URL                                                 | `api/analysis_cache/get` with project and reference branch                          |
| Branch selection              | Branch analysis passes its branch. PR analysis passes a known reference branch, otherwise its PR key for backend selection               | Uses `BranchConfiguration.referenceBranchName()`                                    |
| New entries                   | `ScannerWriteCacheImpl` writes an uncompressed temporary `.dat` file                                                                     | `WriteCacheImpl` writes a gzip `analysisCache` file in the scanner report directory |
| Publication                   | Publisher compresses the file, calls `sensor-cache/prepare-write` and uploads to the returned pre-signed URL, separately from the report | `AnalysisCachePublisher` closes the file for inclusion in the analysis report       |
| Real writer                   | Cache enabled and PR key absent                                                                                                          | Cache enabled and not a PR                                                          |

Cloud publishes its sensor cache after report execution and the `AFTER_SCANNER_REPORT` steps.
Its writer skips publication when no keys were written. The Cloud settings above describe
implementation controls, not a supported workaround for SQAA collection. The read path does
not implement a target-branch-to-main fallback in the scanner; backend selection is outside
this source audit. Scanner-engine also does not establish a universal database table or
backend retention policy for these caches.

In **scanner-engine-light**, `StreamingSensorContext` disables the sensor cache, returns no-op
previous/next caches, and returns `false` from `canSkipUnchangedFiles()`. Replaying a recorded
SQAA context uses a separate snapshot mechanism.

**Design note**: SonarJS still calls `nextCache().write()` and `copyFromPrevious()` during PR analysis even when the platform supplies a no-op writer. The platform decides what gets persisted. A no-op writer avoids persistence, but does not eliminate work performed before the call, such as AST/CPD serialization and file hashing.

### What the cache is for

The cache is designed to **skip expensive computations** for unchanged files. In SonarQube's incremental analysis model:

- **DEFAULT mode**: eligible files normally use `WRITE_ONLY`. Context collection does not override the scanner's mode.
- **SKIP_UNCHANGED mode**: eligible files can use cached data if metadata and payload checks pass. On a miss, Node's rule filtering still depends on file status and mode. This mode does not itself determine whether the platform persists the attempted writes.

The sensor cache stores neither issues nor measures nor highlighting. On a cache hit SonarJS
does not emit them. This is separate from the scanner's result-storage rules described below.

**Note on `canSkipUnchangedFiles()`**: Cloud and Server return `true` for PR analysis,
independently of cache enablement or downloaded entries. This permits skipping; it does not
promise a cache hit. Cloud's `markAsUnchanged()` is a no-op. Server's separate mechanism
requires `sonar.unchangedFiles.optimize` (default `false`), a non-PR analysis with the same
branch and reference branch, and an allowed sensor (CFamily/Cobol, plus test sensors).
SonarJS does not use `markAsUnchanged()`.

### SQAA context recording and per-file cache reuse

`JsTsContext.getAnalysisMode()` maps `canSkipUnchangedFiles()` to `SKIP_UNCHANGED` or
`DEFAULT`. Context collection preserves that decision.

On supported hosts, `DefaultFilesystemCacheContext.isEnabled()` delegates to
`A3SContextCollector.isEnabled()`. If collection is enabled and no restored context is being
replayed, `WebSensor` sets `recordFilesystemCache = true`. There is no PR exception. Java handles
per-file cache hits, while Node records fresh filesystem observations and program selections.
Cloud obtains this enablement from its collection-config API; see
[platform collection policy](./a3s-context.md#platform-collection-policy).

The override introduced by [JS-932 / #7986](https://github.com/SonarSource/SonarJS/pull/7986)
in 14.1 forced `DEFAULT` and made collection-enabled PRs report `ANALYSIS_MODE_INELIGIBLE`
even with valid per-file caches. It is removed. Missing context is not a reason to force rules
to execute on independently reusable files.

Recording uses this path:

1. Java handles per-file cache hits normally: copy cached entries and re-emit CPD/AST where
   applicable. During recording it also sends every current input to Node, marking actual hits
   with `skip_analysis`. `file_status` remains independent: a `SAME` file can have a cache miss.
2. Node records current source contents, configuration and filesystem observations. It visits
   configured programs in the normal discovery order, including references, until all eligible
   inputs have a configured, orphan or no-program outcome. No earlier SQAA context is restored.
3. Cached files participate in program construction but execute no rules and emit no file results.
   An all-cached PR still constructs the programs needed for its fresh context. Orphan programs
   include current cached peers, so a changed file can gain type information and additional findings.
4. After successful analysis and archive persistence, Node writes a local completion marker. Java
   publishes the two archives and collector JSON metadata through the existing collector API.
   The marker is not published and does not assert that every filesystem path was observed.

This supports fresh context without a compatible branch snapshot, including source additions,
deletions and configuration changes. Only current observations are recorded; project and dependency
files read while building programs can participate even when they are not analysis inputs. No
whole-context entry is read or written through the sensor cache. Its per-file API and the
platform's PR no-op writer are unchanged.

Fresh construction adds source reads and compiler work solely for context. Broader current orphan
roots and their improved findings are accepted; a numeric time/memory budget remains open.
Context initialization, persistence or publication failure must not fail otherwise successful
analysis. A runtime file error prevents context publication. Dependency-aware cache invalidation
remains separate work (JS-2815), and wildcard ambient-package discovery remains in JS-2853.
Fresh context does not re-run cached rules or guarantee fresh-full-analysis findings. TypeScript
program objects are not persisted. Both Cloud and Server must support this path; local sensor
recording/replay does not establish successful backend publication.

### Why CPD tokens must be re-emitted even on cache hit

**CPD (Copy-Paste Detection) needs an index of blocks from the relevant MAIN files in the
current analysis.** SonarJS must re-emit cached CPD tokens for participating unchanged files
so they can take part in scanner-side duplication detection.

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

Missing blocks prevent those files from participating in the current in-project comparison.
Server also has a cross-project duplication index; the diagram describes the in-project path.

The scanner does not treat all other result types alike:

| Data type                              | Observed scanner behavior for unchanged PR files                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Ordinary issues, highlighting, symbols | Storage skips files with status `SAME`; Cloud applies this to non-`LONG` branch types, including PRs |
| Measures                               | Storage does not apply that same skip predicate; submitted measures can be written to the report     |
| External issues                        | Use a separate storage path from ordinary issues                                                     |
| CPD tokens                             | Still chunked and inserted into the current scanner index                                            |

These storage checks are independent of whether SonarJS reads its sensor cache or executes
rules. Backend issue tracking and result reuse are separate from this scanner-side behavior;
do not infer that every omitted result is universally copied from a previous analysis.

This is why `AnalysisProcessor.processCacheAnalysis()` calls `saveCpd()`. That method skips TEST
files and IDE analyses. Separately, `WebSensor` forwards a cached AST to registered consumers
when the AST is present.

### What SonarJS caches

SonarJS caches **two types of data** per JS/TS file, plus file metadata for change detection:

| Cache key pattern                      | Data             | Format                       | Purpose                               |
| -------------------------------------- | ---------------- | ---------------------------- | ------------------------------------- |
| `js:cpd:DATA:{version}:{file}`         | CPD token data   | Binary (var-length encoding) | Duplicate code detection              |
| `js:cpd:STRING_TABLE:{version}:{file}` | CPD string table | Binary                       | Companion to CPD data                 |
| `js:ast:{version}:{file}`              | AST              | Protobuf                     | Analysis consumers (e.g. sonar-armor) |
| `js:filemetadata:{version}:{file}`     | File hash + size | JSON                         | Change detection (SHA-256)            |

The **plugin version** is embedded in every cache key, so upgrading the plugin automatically invalidates all cached entries.

An AST entry must exist, but an empty byte array is a valid representation of an absent AST
(for example when no consumer requested one). It does not force a cache miss.

Cache eligibility is based on `InputFile.language()`, not the extension alone. Files identified
as JS/TS get read/write caching, CPD re-emission for MAIN files, and optional AST forwarding.
Files identified as `web` or `yaml` also use the strategy, but do not re-emit CPD or forward ASTs
on a hit. CSS files and files included only through additional extension predicates bypass the
sensor cache and are sent to Node on every run.

### Cache strategy decision flow

`CacheStrategies.getStrategyFor()` determines the strategy per file:

```
1. Is SonarQube >= 9.4 and not SonarLint?
   NO  → NO_CACHE (reason: RUNTIME_API_INCOMPATIBLE)

2. Is the sensor cache enabled?
   NO  → NO_CACHE (reason: CACHE_DISABLED)

3. Is the effective analysis mode DEFAULT?
   YES → WRITE_ONLY (reason: ANALYSIS_MODE_INELIGIBLE)

4. Is file metadata in cache and does SHA-256 match?
   NO  → WRITE_ONLY (reason: FILE_CHANGED)

5. Are CPD + AST entries present in previousCache?
   NO  → WRITE_ONLY (reason: FILE_NOT_IN_CACHE)

6. Can cached data be deserialized successfully?
   NO  → WRITE_ONLY (reason: CACHE_CORRUPTED)

7. All checks pass → READ_AND_WRITE (Java handles the hit; recording also sends it with skip_analysis)
```

Note: `isInCache()` checks for CPD + AST presence but **not** file metadata (checked in step 4).

The metadata comparison checks encoded byte size and SHA-256. It does not directly check
`InputFile.status()`. Missing metadata also produces `FILE_CHANGED`; after an analyzer upgrade
the versioned metadata key is missing even if the source bytes did not change. `CACHE_CORRUPTED`
is the fallback for an `IOException` while reading/copying AST or CPD payloads. Metadata reading
happens before that recovery block, so not every malformed cache entry is recovered this way.

### What happens on cache hit vs cache miss

**Cache hit** (`READ_AND_WRITE` — file unchanged, data valid):

```
CacheStrategies.readFromCache(serialization)
  → CacheAnalysisSerialization.readFromCache() → CacheAnalysis (CPD tokens + AST)
  → CacheAnalysisSerialization.copyFromPrevious() → forwards CPD + AST + metadata to nextCache
    (Note: on PR analysis, these writes go to NoOpWriteCache and are discarded)

For JS/TS files:
  AnalysisProcessor.processCacheAnalysis(context, file, cacheAnalysis)
    → Saves CPD tokens to SonarQube (for cross-file duplicate detection)
  WebSensor.acceptAstResponse(ast, file)
    → Passes AST to registered consumers (e.g. sonar-armor)

For HTML/YAML files:
  File is silently skipped — not analyzed, not re-emitted
  (no processCacheAnalysis, no CPD, no AST forwarding)
```

Without recording, the file is omitted from the Node.js request. During recording, it is sent
with `skip_analysis` for fresh context construction. Node emits no file results for it; SonarJS
emits no issues, measures, highlights or symbols on a hit. The scanner's result-storage rules
are separate from this cache hit.

**Analysis required** (`WRITE_ONLY` or `NO_CACHE` — for example a changed file, missing entry,
ineligible mode or incompatible runtime):

```
File sent to Node.js bridge for analysis (rule selection still depends on status and mode)
  → Node.js returns: issues, metrics, highlights, symbols, CPD tokens, AST

AnalysisProcessor.processResponse(context, checks, file, response)
  → Saves issues to SonarQube
  → Saves metrics (NCLOC, complexity, functions, etc.)
  → Saves highlights (syntax coloring)
  → Saves symbol references
  → Saves CPD tokens

CacheStrategy.writeAnalysisToCache(CacheAnalysis.fromResponse(cpdTokens, ast), file)
  → WRITE_ONLY: writes CPD tokens, AST and file metadata (SHA-256 + size) to nextCache
  → NO_CACHE: no serialization or sensor-cache write
  (Note: on PR analysis, these writes go to NoOpWriteCache and are discarded)
```

### Which file types use caching

| File type                                                       | Cache strategy applied? | Skip analysis on hit? | CPD re-emitted on hit? | AST forwarded on hit? | Cache written on miss? | Notes                                                        |
| --------------------------------------------------------------- | ----------------------- | --------------------- | ---------------------- | --------------------- | ---------------------- | ------------------------------------------------------------ |
| JavaScript (.js, .jsx, .mjs, .cjs)                              | Yes                     | Yes                   | Yes                    | Yes                   | Yes                    | Full cache support via `processCacheAnalysis()`              |
| TypeScript (.ts, .tsx)                                          | Yes                     | Yes                   | Yes                    | Yes                   | Yes                    | Full cache support via `processCacheAnalysis()`              |
| HTML identified as `web`                                        | Yes                     | Yes                   | No                     | No                    | Yes                    | File silently skipped on cache hit                           |
| YAML identified as `yaml`                                       | Yes                     | Yes                   | No                     | No                    | Yes                    | File silently skipped on cache hit; CPD handled by sonar-iac |
| CSS (.css, .less, .scss, .sass)                                 | No                      | N/A                   | N/A                    | N/A                   | No                     | Always analyzed fresh; bypasses cache entirely               |
| Additional-extension files with another language or no language | No                      | N/A                   | N/A                    | N/A                   | No                     | Included by an extension predicate; sent to Node each run    |

### Cache lifecycle across analysis types

Understanding the interplay between analysis types is critical:

```
Full branch analysis (DEFAULT mode):
  → ReadCache: loaded from previous analysis (if any)
  → WriteCache: active if platform caching is enabled
  → All files analyzed fresh (cache never read)
  → Cache populated with CPD + AST + metadata for all JS/TS/HTML/YAML files
  → Publish via Cloud's direct upload or Server's report

PR analysis without SQAA recording (SKIP_UNCHANGED mode):
  → ReadCache: loaded for the reference selected by the platform, if available
  → WriteCache: NoOp (all writes silently discarded!)
  → Unchanged JS/TS files: cache HIT → CPD re-emitted, AST forwarded, skip Node.js
  → Unchanged HTML/YAML files: cache HIT → silently skipped entirely
  → Changed files: cache MISS → full analysis via Node.js
  → copyFromPrevious() calls are no-ops (WriteCache is NoOp)
  → No cache uploaded to server (PR doesn't update the stored cache)
```

With these platform providers, `copyFromPrevious()` persists entries only when a real branch
writer is supplied; PR copies do not persist anything.

The current SonarJS branch path is `WRITE_ONLY`, so it does not normally take the hit/copy path.
`copyFromPrevious()` is part of the generic cache contract, not evidence that SonarJS currently
reuses its sensor-cache results during branch analysis. Recording-enabled PRs handle valid hits
in Java too; their no-op writer still discards attempted copies and writes.

### AnalysisMode and rule filtering

Each ESLint rule declares which analysis modes it supports via `analysisModes: AnalysisMode[]` (in `RuleConfig`). The linter filters rules at execution time: only rules whose `analysisModes` array includes the current mode will run.

**Rule mode declaration**: All built-in SonarJS rules have `analysisModes: ['DEFAULT']`. The default in the `EslintHook` Java interface is `List.of(AnalysisMode.DEFAULT)`. However, **external plugins register hooks with `SKIP_UNCHANGED` support** via the `EslintHook` SPI:

- **sonar-security** (removed Nov 2025): declared `[DEFAULT, SKIP_UNCHANGED]` on its taint analysis rules — they ran on both changed and unchanged files. This was the original reason UCFG caching existed.
- **sonar-architecture**: declares `SKIP_UNCHANGED` on `ArchitectureJsEslintHook` — it runs on unchanged files to collect architectural data (import graphs, dependency analysis). AST caching was added in May 2025 for sonar-armor (the architecture analysis backend), which consumes ASTs via the `JsFile` consumer SPI.

This means the "unchanged file, cache miss" path is not idle: while zero SonarJS rules run, external hooks with `SKIP_UNCHANGED` DO execute on the Node.js side.

**How the linter applies the mode** (`Linter.lint()` in `linter.ts`):

```typescript
// The key decision
rules: Linter.getRulesForFile(
  filePath,
  fileType,
  fileStatus === 'SAME' ? analysisMode : 'DEFAULT',  // ← KEY LINE
  language,
),

// Rule filtering (simplified; current code also caches rule-selection results)
return (
  fileTypeTargets.includes(fileType) &&
  analysisModes.includes(analysisMode) &&  // ← only rules matching the mode run
  fileLanguage === language && ...
);
```

If `fileStatus` is `SAME` (unchanged), the configured `analysisMode` is used. If the file is `CHANGED` or `ADDED`, the mode is forced to `DEFAULT` regardless of context — ensuring all rules run on changed files.

### Analysis paths and limits

| Analysis / file path                                        | Effective mode                  | Node and cache behavior                                                                                              |
| ----------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Branch analysis, cache-eligible file                        | DEFAULT                         | Analyze through Node; attempt CPD, AST and metadata writes; no sensor-cache reads                                    |
| PR with SQAA recording, cache-eligible file                 | Scanner-selected mode           | Send all current inputs; mark actual hits skip_analysis; construct fresh filesystem/program context; analyze misses  |
| PR with or without recording, JS/TS cache hit               | SKIP_UNCHANGED                  | Skip rules; recording still maps the file; re-emit CPD for MAIN files and forward cached AST; cache copies are no-op |
| PR with or without recording, SAME JS/TS cache miss         | SKIP_UNCHANGED                  | Send to Node; built-in DEFAULT-only rules are filtered out, while hooks declaring SKIP_UNCHANGED can run             |
| PR with or without recording, CHANGED/ADDED JS/TS file      | SKIP_UNCHANGED at request level | Send to Node; linter selects DEFAULT rules for that file                                                             |
| PR with or without recording, web/yaml cache hit            | SKIP_UNCHANGED                  | Skip rules; recording still captures the file; no CPD re-emission or AST forwarding by SonarJS                       |
| CSS or additional-extension file with another/null language | Either                          | Bypass sensor cache; send to Node                                                                                    |

These are implementation paths, not a claim that every mode produces equivalent data.
In particular:

- SQAA recording reuses independently valid per-file entries and builds fresh context without
  a compatible snapshot. Cached files skip rules, but recording reads current source/configuration
  inputs and constructs programs to map all eligible files. Broader orphan roots can improve findings.
- HTML/YAML hits provide no cached CPD or AST to consumers through SonarJS. Other sensors
  have their own processing paths for these files.
- On a hit, SonarJS emits no measures. Scanner measure storage does not itself skip SAME PR
  files, so issue-storage behavior cannot justify a blanket claim about measure reuse.
- CSS and additional-extension files bypass the sensor cache; their cost depends on the project.

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

Emitted miss reasons are `RUNTIME_API_INCOMPATIBLE`, `CACHE_DISABLED`,
`ANALYSIS_MODE_INELIGIBLE`, `FILE_CHANGED`, `FILE_NOT_IN_CACHE` and `CACHE_CORRUPTED`. A zero-hit report
must be interpreted using the reason, not just the hit count.

### History

| Date     | Commit       | Change                                                                                                                                                   |
| -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sep 2022 | `c57c9df1`   | Foundation: `AnalysisMode` class added; sensors skip unchanged files when analysis allows it                                                             |
| Sep 2022 | `e998b0c5`   | Initial caching with SonarQube Cache API — cached UCFG files for SonarSecurity via `CacheStrategy` + `CacheSerialization`                                |
| Sep 2022 | `9ffffc48`   | Refactored: extracted `CacheStrategies`, `CacheKey`, `UCFGFilesSerialization`, `JsonSerialization` from monolithic class                                 |
| Sep 2022 | `17a9c51c`   | Added `CacheReporter` for hit/miss statistics logging                                                                                                    |
| Sep 2022 | `3987a921`   | Simplified: removed `CacheReader`/`CacheWriter` interfaces                                                                                               |
| Oct 2022 | `ed9433d5`   | Bundle version added to cache key (invalidate on rule bundle changes)                                                                                    |
| Jan 2023 | `b9e5111f`   | CPD tokens added to cache; `CacheAnalysis` + `processCacheAnalysis()` created; `isInCache()` now requires UCFG + CPD                                     |
| Jan 2023 | `d4c9430b`   | File hash (SHA-256) validation via `FileMetadata` for change detection                                                                                   |
| Jan 2023 | `ed62d04f`   | Efficient binary encoding for CPD tokens (var-length integers + string table deduplication)                                                              |
| Apr 2023 | `00b1ab08`   | JS and TS sensors merged into single `JsTsSensor`; caching logic unified                                                                                 |
| Apr 2024 | `0e5e9239`   | Error handling: ignore runtime errors when saving CPD tokens                                                                                             |
| Apr 2024 | `5950215f`   | Skip file when CPD token save fails                                                                                                                      |
| Jun 2024 | `4df23d00`   | Catch `IllegalStateException` when saving highlights and CPD tokens                                                                                      |
| May 2025 | `1ec7c001`   | AST (protobuf) added to cache for sonar-armor consumers; `isInCache()` now requires CPD + AST                                                            |
| Nov 2025 | `9324ae34`   | SonarSecurity UCFG caching removed; cache now stores only CPD + AST                                                                                      |
| Feb 2026 | `03f479ad`   | WebSensor consolidation: HTML/CSS/YAML sensors merged into WebSensor; CSS bypasses cache entirely; HTML/YAML use cache strategy but don't re-emit on hit |
| Oct 2026 | `da2c402238` | SQAA context recording forces `DEFAULT`, including PR analyses; introduced in SonarJS 14.1                                                               |

### Key source files

| File                                                | Purpose                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `cache/CacheStrategies.java`                        | Decides cache strategy per file (NO_CACHE / WRITE_ONLY / READ_AND_WRITE); calls `copyFromPrevious()` on hit |
| `cache/CacheStrategy.java`                          | Strategy object: holds cached data (if hit) and serialization reference                                     |
| `cache/CacheAnalysis.java`                          | Container for cached data: CPD tokens + AST                                                                 |
| `cache/CacheAnalysisSerialization.java`             | Orchestrates read/write and copy of AST + CPD + metadata                                                    |
| `cache/AstProtobufSerialization.java`               | AST protobuf serialization                                                                                  |
| `cache/CpdSerialization.java`                       | CPD binary serialization (data + string table)                                                              |
| `cache/CpdSerializer.java` / `CpdDeserializer.java` | Binary encoding/decoding with var-length integers and string table                                          |
| `cache/FileMetadata.java`                           | SHA-256 hash + file size for change detection                                                               |
| `cache/CacheKey.java`                               | Hierarchical cache key builder                                                                              |
| `cache/CacheReporter.java`                          | Hit/miss statistics logging                                                                                 |
| `cache/CacheSerialization.java`                     | Base class wrapping SonarQube's ReadCache/WriteCache API                                                    |
| `AnalysisProcessor.java`                            | `processResponse()` (full save) vs `processCacheAnalysis()` (CPD only)                                      |
| `WebSensor.java`                                    | Entry point: applies cache strategy, routes to analysis or cache path                                       |

### Scanner-engine source files

Links are pinned to the audited revision.

| Purpose                                      | Source                                                                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud writer eligibility                     | [SensorCacheWriterProvider.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/cloud/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/cache/SensorCacheWriterProvider.java)         |
| Cloud entry serialization                    | [ScannerWriteCacheImpl.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/cloud/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/cache/ScannerWriteCacheImpl.java)                 |
| Cloud cache download and reference selection | [DefaultSensorCacheLoader.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/cloud/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/cache/DefaultSensorCacheLoader.java)           |
| Cloud direct cache publication               | [SensorCachePublisherImpl.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/cloud/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/cache/SensorCachePublisherImpl.java)           |
| Cloud enablement                             | [SonarCloudCoreSensorCacheFlag.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/cloud/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/cache/SonarCloudCoreSensorCacheFlag.java) |
| Cloud skip flag and no-op markAsUnchanged    | [AbstractSensorContext.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/cloud/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/AbstractSensorContext.java)                       |
| Cloud result storage                         | [DefaultSensorStorage.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/cloud/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/DefaultSensorStorage.java)                         |
| Server reader/writer eligibility             | [AnalysisCacheProvider.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/server/sonar-scanner-engine/src/main/java/org/sonar/scanner/cache/AnalysisCacheProvider.java)                       |
| Server enablement                            | [AnalysisCacheEnabled.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/server/sonar-scanner-engine/src/main/java/org/sonar/scanner/cache/AnalysisCacheEnabled.java)                         |
| Server cache download                        | [DefaultAnalysisCacheLoader.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/server/sonar-scanner-engine/src/main/java/org/sonar/scanner/cache/DefaultAnalysisCacheLoader.java)             |
| Server gzip writer                           | [WriteCacheImpl.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/server/sonar-scanner-engine/src/main/java/org/sonar/scanner/cache/WriteCacheImpl.java)                                     |
| Server report integration                    | [AnalysisCachePublisher.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/server/sonar-scanner-engine/src/main/java/org/sonar/scanner/report/AnalysisCachePublisher.java)                    |
| Server PR skip flag                          | [ProjectSensorContext.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/server/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/ProjectSensorContext.java)                        |
| Server markAsUnchanged policy                | [UnchangedFilesHandler.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/server/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/UnchangedFilesHandler.java)                      |
| Server result storage                        | [DefaultSensorStorage.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/server/sonar-scanner-engine/src/main/java/org/sonar/scanner/sensor/DefaultSensorStorage.java)                        |
| Light sensor context                         | [StreamingSensorContext.java](https://github.com/SonarSource/sonar-scanner-engine/blob/a54007566d/a3s/sonar-scanner-engine-light/src/main/java/org/sonar/scanner/engine/light/internal/StreamingSensorContext.java)  |
