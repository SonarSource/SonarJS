# `jsts-go` Analyze-Project Go Sketch

Date: 2026-05-05
Branch: `feat/tsgolint-grpc-poc`

## Goal

This document turns the gap analysis in [node-vs-jsts-go-equivalence-assessment.md](/C:/Users/victor.diez/projects/SonarJS/docs/node-vs-jsts-go-equivalence-assessment.md) into a concrete Go-side starting point.

The intent is to answer one question:

What should the first real Go refactor look like if we want `jsts-go` to progressively match the Node.js `analyze-project` endpoint semantics?

The short answer is:

- start with a normalized internal request model
- make that model consume the full JS/TS-relevant `AnalyzeProject` payload
- build an execution plan from that normalized model
- only then run `jsts-go`

Do not start by growing `service.go` piecemeal around the current `analyzeProject(req)` helper. The current helper starts too low in the stack.

## Current Call Chain

Today the Go side does this in [service.go](/C:/Users/victor.diez/projects/SonarJS/server-go/sonar-server/service.go:87):

```go
func analyzeProject(req *pb.AnalyzeProjectRequest) (...) {
    filePaths := orderedFilePaths(req.GetFiles())
    requestedRules := requestedRuleConfigs(req.GetRules())
    baseFS := bundled.WrapFS(cachedvfs.From(osvfs.FS()))
    resolution := utils.NewTsConfigResolver(baseFS, baseDir).FindTsConfigParallel(filePaths)
    workload := ...
    configuredRules := configuredRulesFor(requestedRules)
    err := linter.RunLinter(...)
    return issuesOnlyResults(...)
}
```

The first refactor should make that look like this instead:

```go
func analyzeProject(ctx context.Context, req *pb.AnalyzeProjectRequest) (
    map[string]*pb.ProjectAnalysisFileResult,
    *pb.ProjectAnalysisMeta,
) {
    input, err := NormalizeAnalyzeProjectRequest(req)
    if err != nil {
        return invalidRequestResults(err)
    }

    fsys := BuildAnalyzeProjectFS(input)

    plan, err := BuildExecutionPlan(ctx, input, fsys)
    if err != nil {
        return runtimeFailureResults(input, err)
    }

    runner := NewAnalyzeProjectRunner(fsys, ruleMetadataIndex())
    return runner.Run(ctx, input, plan)
}
```

That separates four responsibilities that are currently collapsed together:

1. request normalization
2. filesystem model construction
3. execution planning
4. planned execution and result conversion

## Proposed Files

Keep the implementation in `server-go/sonar-server`.

Suggested first split:

- `normalize.go`
- `normalize_config.go`
- `normalize_files.go`
- `normalize_rules.go`
- `plan.go`
- `plan_rules.go`
- `run.go`
- `metadata.go`

The existing files can then shrink to:

- [service.go](/C:/Users/victor.diez/projects/SonarJS/server-go/sonar-server/service.go): RPC wiring + top-level orchestration
- [requested_rules.go](/C:/Users/victor.diez/projects/SonarJS/server-go/sonar-server/requested_rules.go): rule option conversion and Sonar defaults
- [converter.go](/C:/Users/victor.diez/projects/SonarJS/server-go/sonar-server/converter.go): issue/result conversion
- [rules.go](/C:/Users/victor.diez/projects/SonarJS/server-go/sonar-server/rules.go): available rules and Sonar key mapping

## Core Normalized Model

The first concrete target should be an internal model equivalent to the semantic output of Node's normalization layer in [analyze-project-normalize.ts](/C:/Users/victor.diez/projects/SonarJS/packages/grpc/src/analyze-project-normalize.ts:57).

### Internal enums

```go
type AnalysisMode string

const (
    AnalysisModeDefault       AnalysisMode = "DEFAULT"
    AnalysisModeSkipUnchanged AnalysisMode = "SKIP_UNCHANGED"
)

type FileType string

const (
    FileTypeMain FileType = "MAIN"
    FileTypeTest FileType = "TEST"
)

type FileStatus string

const (
    FileStatusSame    FileStatus = "SAME"
    FileStatusChanged FileStatus = "CHANGED"
    FileStatusAdded   FileStatus = "ADDED"
)

type JsTsLanguage string

const (
    LanguageJS JsTsLanguage = "js"
    LanguageTS JsTsLanguage = "ts"
)

type FileProvisioningMode string

const (
    FileProvisioningExplicitFiles FileProvisioningMode = "explicit-files"
    FileProvisioningDiscoverFromFS FileProvisioningMode = "discover-from-fs"
)

type FileContentSource string

const (
    FileContentInline FileContentSource = "inline"
    FileContentFS     FileContentSource = "fs"
)

type ProgramStrategy string

const (
    ProgramStrategyIncrementalTyped ProgramStrategy = "incremental-typed"
    ProgramStrategyBatchTyped       ProgramStrategy = "batch-typed"
    ProgramStrategyUntypedOnly      ProgramStrategy = "untyped-only"
    ProgramStrategyHybrid           ProgramStrategy = "hybrid"
)

type TypedBatchKind string

const (
    TypedBatchTsConfig TypedBatchKind = "tsconfig"
    TypedBatchOrphan   TypedBatchKind = "orphan"
)

type ModuleType string

const (
    ModuleTypeUnknown  ModuleType = "unknown"
    ModuleTypeESM      ModuleType = "module"
    ModuleTypeCommonJS ModuleType = "commonjs"
)
```

### Top-level request model

This is the main type the rest of the Go implementation should consume.

```go
type NormalizedAnalyzeProjectInput struct {
    Config         NormalizedProjectConfiguration
    Files          map[string]NormalizedProjectFile      // keyed by canonical path
    OrderedFiles   []string                              // canonical paths, stable order
    PathMap        map[string]string                     // canonical path -> original request key
    VirtualFiles   map[string]string                     // canonical path -> request content
    Rules          []NormalizedJsTsRule
    CssRules       []NormalizedCssRule
    Bundles        []string
    RulesWorkdir   string
}
```

### Normalized configuration

This should mirror the JS/TS-relevant parts of the proto request, not only the tiny subset used today.

```go
type NormalizedProjectConfiguration struct {
    BaseDir                           string
    SonarLint                         bool
    AllowTsParserJsFiles              bool
    AnalysisMode                      AnalysisMode
    SkipAst                           bool
    IgnoreHeaderComments              bool
    MaxFileSize                       *int64
    Environments                      []string
    Globals                           []string
    TsSuffixes                        []string
    JsSuffixes                        []string
    CssSuffixes                       []string
    HtmlSuffixes                      []string
    YamlSuffixes                      []string
    CssAdditionalSuffixes             []string
    TsConfigPaths                     []string
    JsTsExclusions                    []string
    Sources                           []string
    Inclusions                        []string
    Exclusions                        []string
    Tests                             []string
    TestInclusions                    []string
    TestExclusions                    []string
    DetectBundles                     bool
    CanAccessFileSystem               bool
    CreateTSProgramForOrphanFiles     bool
    DisableTypeChecking               bool
    SkipNodeModuleLookupOutsideBaseDir bool
    EcmaScriptVersion                 string
    ClearDependenciesCache            bool
    ClearTsConfigCache                bool
    ReportNclocForTestFiles           bool
    FileProvisioningMode              FileProvisioningMode
}
```

### Normalized files

This is where the current Go path is most incomplete. The normalized file model must preserve:

- canonical path
- original request key
- content source
- inline content when present
- `fileType`
- `fileStatus`

```go
type NormalizedProjectFile struct {
    CanonicalPath string
    OriginalPath  string
    Content       string
    ContentSource FileContentSource
    FileType      FileType
    FileStatus    FileStatus
    Language      JsTsLanguage
}
```

### Normalized rules

This should be the output of the current [requested_rules.go](/C:/Users/victor.diez/projects/SonarJS/server-go/sonar-server/requested_rules.go:34) logic plus the missing request fields already used by Node for filtering.

```go
type NormalizedJsTsRule struct {
    SonarKey              string
    EffectiveRuleName     string
    AdditionalRuleNames   []string
    Language              JsTsLanguage
    Options               any
    FileTypeTargets       []FileType
    AnalysisModes         []AnalysisMode
    BlacklistedExtensions []string
}

type NormalizedCssRule struct {
    Key     string
    Options []any
}
```

### Rule metadata index

Node filtering relies on metadata that is not currently represented in the Go path.

Start with an explicit index rather than scattering these conditions across runners.

```go
type RuleMetadata struct {
    RequiredDependencies []string
    RequiredEcmaVersion  *int
    RequiredModuleType   *ModuleType
}

type RuleMetadataIndex map[string]RuleMetadata // keyed by Sonar rule key
```

For the first iteration this can be hardcoded for migrated/offloaded rules. Later it can be generated from the same source used by Node rule metadata.

## Filesystem Model

The Go side should stop reading request files only from `osvfs`.

Use the existing overlay VFS support in [overlay_vfs.go](/C:/Users/victor.diez/projects/SonarJS/jsts-go/internal/utils/overlay_vfs.go:14) and make it part of the standard request path.

```go
type AnalyzeProjectFS struct {
    BaseFS    vfs.FS
    OverlayFS vfs.FS
}

func BuildAnalyzeProjectFS(input *NormalizedAnalyzeProjectInput) vfs.FS
```

Proposed behavior:

- start from `bundled.WrapFS(cachedvfs.From(osvfs.FS()))`
- if any normalized file has inline content, overlay those files
- if `CanAccessFileSystem == false`, the overlay must still expose enough directory structure and files for tsconfig lookup and parent traversal semantics to work

The current minimum implementation can be:

```go
func BuildAnalyzeProjectFS(input *NormalizedAnalyzeProjectInput) vfs.FS {
    baseFS := bundled.WrapFS(cachedvfs.From(osvfs.FS()))
    if len(input.VirtualFiles) == 0 {
        return baseFS
    }
    return utils.NewOverlayVFS(baseFS, input.VirtualFiles)
}
```

That is not enough for full parity, but it is the correct starting boundary.

## Execution Plan

The plan must mirror Node's top-level branching in [analyzeProject.ts](/C:/Users/victor.diez/projects/SonarJS/packages/analysis/src/analyzeProject.ts:56), not the current single `FindTsConfigParallel -> RunLinter` path.

```go
type ExecutionPlan struct {
    Strategy        ProgramStrategy
    TypedBatches    []TypedBatch
    UntypedFiles    []string
    Warnings        []string
    TelemetrySeed   TelemetrySeed
}

type TypedBatch struct {
    Kind          TypedBatchKind
    TsConfigPath  string
    RootFiles     []string
    DetectedESYear *int
}

type TelemetrySeed struct {
    TypeScriptVersionSignals []string
    HasNativePreview         bool
}
```

### Planner entrypoint

```go
func BuildExecutionPlan(
    ctx context.Context,
    input *NormalizedAnalyzeProjectInput,
    fsys vfs.FS,
) (*ExecutionPlan, error)
```

Expected behavior:

- if `DisableTypeChecking`, return `ProgramStrategyUntypedOnly`
- else if `SonarLint` and there are JS/TS rules, return `ProgramStrategyIncrementalTyped`
- else if there are JS/TS rules, return `ProgramStrategyHybrid` or `ProgramStrategyBatchTyped`
- any files not covered by typed batches become `UntypedFiles`
- orphan-file behavior respects `CreateTSProgramForOrphanFiles`

### Helper functions

```go
func BuildTypedBatchesFromTsConfigResolution(
    input *NormalizedAnalyzeProjectInput,
    fsys vfs.FS,
) ([]TypedBatch, []string, []string, error)

func BuildOrphanTypedBatch(
    input *NormalizedAnalyzeProjectInput,
    orphanFiles []string,
) (*TypedBatch, error)

func ComputeUntypedFallbackFiles(
    input *NormalizedAnalyzeProjectInput,
    typedBatches []TypedBatch,
) []string
```

## Rule Activation Context

Node does not execute the same rule list on every file. The Go side needs an equivalent filter boundary before calling any rule runner.

```go
type RuleActivationContext struct {
    FilePath           string
    Extension          string
    FileType           FileType
    FileStatus         FileStatus
    RequestedMode      AnalysisMode
    EffectiveMode      AnalysisMode
    Language           JsTsLanguage
    DetectedESYear     *int
    DetectedModuleType ModuleType
    Dependencies       map[string]struct{}
}
```

The `EffectiveMode` field is important because Node treats `CHANGED` and `ADDED` files as effectively `DEFAULT` for rule filtering even when the overall analysis mode is `SKIP_UNCHANGED`.

### Context builder

```go
func BuildRuleActivationContext(
    input *NormalizedAnalyzeProjectInput,
    file NormalizedProjectFile,
    detectedESYear *int,
    moduleType ModuleType,
    dependencies map[string]struct{},
) RuleActivationContext
```

### Rule filtering

```go
func FilterRulesForFile(
    rules []NormalizedJsTsRule,
    metadata RuleMetadataIndex,
    ctx RuleActivationContext,
) []NormalizedJsTsRule
```

The filtering order should match Node:

1. file type
2. analysis mode
3. language
4. blacklisted extensions
5. required dependency
6. React-on-Vue suppression
7. required ECMAScript version
8. required module type

For the first Go step, implement 1-5. Then add ECMAScript/module/React-Vue once the necessary metadata and signals exist.

## Proposed Top-Level Functions

These are the concrete functions I would introduce first.

### Normalization

```go
func NormalizeAnalyzeProjectRequest(req *pb.AnalyzeProjectRequest) (*NormalizedAnalyzeProjectInput, error)

func NormalizeProjectConfiguration(cfg *pb.ProjectConfiguration) (NormalizedProjectConfiguration, error)

func NormalizeProjectFiles(
    files map[string]*pb.ProjectFileInput,
    cfg NormalizedProjectConfiguration,
    fsys vfs.FS,
) (
    normalized map[string]NormalizedProjectFile,
    ordered []string,
    pathMap map[string]string,
    virtualFiles map[string]string,
    err error,
)

func NormalizeJsTsRules(rules []*pb.JsTsRule) ([]NormalizedJsTsRule, error)

func NormalizeCssRules(rules []*pb.CssRule) ([]NormalizedCssRule, error)
```

### Planning

```go
func BuildExecutionPlan(
    ctx context.Context,
    input *NormalizedAnalyzeProjectInput,
    fsys vfs.FS,
) (*ExecutionPlan, error)
```

### Execution

```go
type AnalyzeProjectRunner struct {
    fsys         vfs.FS
    metadata     RuleMetadataIndex
}

func NewAnalyzeProjectRunner(
    fsys vfs.FS,
    metadata RuleMetadataIndex,
) *AnalyzeProjectRunner

func (r *AnalyzeProjectRunner) Run(
    ctx context.Context,
    input *NormalizedAnalyzeProjectInput,
    plan *ExecutionPlan,
) (map[string]*pb.ProjectAnalysisFileResult, *pb.ProjectAnalysisMeta)
```

### Typed execution

```go
func (r *AnalyzeProjectRunner) RunTypedBatch(
    ctx context.Context,
    input *NormalizedAnalyzeProjectInput,
    batch TypedBatch,
) (map[string][]*pb.Issue, []string, error)
```

### Untyped fallback

This can initially be a stub returning a warning so the architecture is ready even before untyped support exists.

```go
func (r *AnalyzeProjectRunner) RunUntypedFiles(
    ctx context.Context,
    input *NormalizedAnalyzeProjectInput,
    files []string,
) (map[string][]*pb.Issue, []string, error)
```

## First Refactor In `service.go`

The first implementation change should be small and structural:

```go
func analyzeProject(
    ctx context.Context,
    req *pb.AnalyzeProjectRequest,
) (map[string]*pb.ProjectAnalysisFileResult, *pb.ProjectAnalysisMeta) {
    input, err := NormalizeAnalyzeProjectRequest(req)
    if err != nil {
        return invalidRequestResults(err)
    }

    fsys := BuildAnalyzeProjectFS(input)

    plan, err := BuildExecutionPlan(ctx, input, fsys)
    if err != nil {
        return runtimeFailureResultsFor(input, err)
    }

    runner := NewAnalyzeProjectRunner(fsys, ruleMetadataIndex())
    return runner.Run(ctx, input, plan)
}
```

That first step does not need to add parity immediately. It just creates the correct seams.

## Suggested Implementation Order

### Step 1

Add the normalized structs and `NormalizeAnalyzeProjectRequest`.

Success criteria:

- `service.go` stops reading `req` directly
- `fileContent`, `fileType`, `fileStatus`, `analysisMode`, `sonarlint`, `disableTypeChecking`, `createTSProgramForOrphanFiles`, `tsConfigPaths`, `canAccessFileSystem` are all preserved in the normalized input

### Step 2

Replace direct `osvfs` use with `BuildAnalyzeProjectFS(input)`.

Success criteria:

- inline request content is actually readable through the filesystem abstraction
- canonical file paths and original request keys are both preserved

### Step 3

Add `BuildExecutionPlan`.

Success criteria:

- the Go side distinguishes typed batch, typed incremental, and untyped fallback modes
- orphan handling becomes configurable instead of always typed

### Step 4

Add rule activation context and filtering.

Success criteria:

- rule list is no longer global per process
- per-file rule activation can differ based on request semantics and file metadata

### Step 5

Move actual `RunLinter` invocation behind the runner.

Success criteria:

- `service.go` becomes transport/orchestration only
- typed and untyped execution paths can evolve independently

## Why This Is The Right Starting Point

This approach keeps the first implementation step aligned with how Node is structured:

- Node first normalizes the request
- then initializes file stores / filesystem semantics
- then decides execution mode
- then filters rules per file
- then runs analysis

If we skip straight to program creation tweaks in Go, we will keep accumulating behavior in the wrong layer and still miss the real contract mismatch with Node.
