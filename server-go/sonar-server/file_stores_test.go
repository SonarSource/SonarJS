package main

import (
	"os"
	"strings"
	"testing"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/linter"
	"github.com/microsoft/typescript-go/shim/tspath"
)

func TestInitializeProjectFileStoresDiscoversProjectMetadataOnDisk(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	packageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	pnpmWorkspacePath := tspath.ResolvePath(baseDir, "pnpm-workspace.yaml")
	denoJSONPath := tspath.ResolvePath(baseDir, "sub/deno.json")
	sourcePath := tspath.ResolvePath(baseDir, "src/main.ts")

	writeTestFile(t, tsconfigPath, `{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`)
	writeTestFile(t, packageJSONPath, `{"name":"test-project"}`)
	writeTestFile(t, pnpmWorkspacePath, "packages:\n  - packages/*\n")
	writeTestFile(t, denoJSONPath, `{"lock":false}`)
	writeTestFile(t, sourcePath, `const value = 42;`)

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	stores, err := initializeProjectFileStores(input, BuildAnalyzeProjectFS(input))
	if err != nil {
		t.Fatalf("unexpected store initialization error: %v", err)
	}

	if got := stores.tsConfigs(); len(got) != 1 || got[0] != tsconfigPath {
		t.Fatalf("expected tsconfig %q, got %#v", tsconfigPath, got)
	}
	if got, ok := stores.PackageJSONs[baseDir]; !ok || got.Path != packageJSONPath {
		t.Fatalf("expected package.json discovery at %q, got %#v", packageJSONPath, got)
	}
	if got, ok := stores.PnpmWorkspaceYAMLs[baseDir]; !ok || got.Path != pnpmWorkspacePath {
		t.Fatalf("expected pnpm-workspace.yaml discovery at %q, got %#v", pnpmWorkspacePath, got)
	}
	denoDir := tspath.GetDirectoryPath(denoJSONPath)
	if got, ok := stores.DenoJSONs[denoDir]; !ok || got.Path != denoJSONPath {
		t.Fatalf("expected deno.json discovery at %q, got %#v", denoJSONPath, got)
	}

	sourceFile, ok := stores.SourceFiles[sourcePath]
	if !ok {
		t.Fatalf("expected source file %q to be discovered", sourcePath)
	}
	if sourceFile.FileType != pb.FileType_FILE_TYPE_MAIN {
		t.Fatalf("expected discovered source file to be MAIN, got %v", sourceFile.FileType)
	}
}

func TestInitializeProjectFileStoresWalksVirtualOverlayWhenHostFilesystemDisabled(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	packageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	sourcePath := tspath.ResolvePath(baseDir, "src/file.ts")
	canAccessFileSystem := false

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: &canAccessFileSystem,
		},
		Files: map[string]*pb.ProjectFileInput{
			tsconfigPath: {
				FileContent: stringPtr(`{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`),
			},
			packageJSONPath: {
				FileContent: stringPtr(`{"name":"overlay-project"}`),
			},
			sourcePath: {
				FileContent: stringPtr(`const value = 42;`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	stores, err := initializeProjectFileStores(input, BuildAnalyzeProjectFS(input))
	if err != nil {
		t.Fatalf("unexpected store initialization error: %v", err)
	}

	if got := stores.tsConfigs(); len(got) != 1 || got[0] != tsconfigPath {
		t.Fatalf("expected overlay tsconfig %q, got %#v", tsconfigPath, got)
	}
	if got, ok := stores.PackageJSONs[baseDir]; !ok || got.Path != packageJSONPath {
		t.Fatalf("expected overlay package.json discovery at %q, got %#v", packageJSONPath, got)
	}
}

func TestInitializeProjectFileStoresBuildsDependencySignalsFromPackageJSON(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	packageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	sourcePath := tspath.ResolvePath(baseDir, "src/file.ts")

	writeTestFile(t, packageJSONPath, `{
  "name": "example-app",
  "type": "module",
  "dependencies": { "react": "^19.0.0" },
  "devDependencies": { "@types/node": "^22.0.0" },
  "_moduleAliases": { "@app": "src" }
}`)
	writeTestFile(t, sourcePath, `export const value = 42;`)

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	stores, err := initializeProjectFileStores(input, BuildAnalyzeProjectFS(input))
	if err != nil {
		t.Fatalf("unexpected store initialization error: %v", err)
	}

	signals := stores.activationSignalsForFile(sourcePath)
	assertHasDependency(t, signals.Dependencies, "example-app")
	assertHasDependency(t, signals.Dependencies, "react")
	assertHasDependency(t, signals.Dependencies, "node")
	assertHasDependency(t, signals.Dependencies, "@app")
	if signals.DetectedModuleType != moduleTypeModule {
		t.Fatalf("expected module type %q, got %q", moduleTypeModule, signals.DetectedModuleType)
	}
}

func TestInitializeProjectFileStoresMergesParentDependenciesAndUsesClosestModuleType(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	rootPackageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	nestedPackageJSONPath := tspath.ResolvePath(baseDir, "packages/app/package.json")
	sourcePath := tspath.ResolvePath(baseDir, "packages/app/src/file.ts")

	writeTestFile(t, rootPackageJSONPath, `{
  "type": "module",
  "dependencies": { "react": "^19.0.0" }
}`)
	writeTestFile(t, nestedPackageJSONPath, `{
  "dependencies": { "vue": "^3.0.0" }
}`)
	writeTestFile(t, sourcePath, `export const value = 42;`)

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	stores, err := initializeProjectFileStores(input, BuildAnalyzeProjectFS(input))
	if err != nil {
		t.Fatalf("unexpected store initialization error: %v", err)
	}

	signals := stores.activationSignalsForFile(sourcePath)
	assertHasDependency(t, signals.Dependencies, "react")
	assertHasDependency(t, signals.Dependencies, "vue")
	if signals.DetectedModuleType != moduleTypeCommonJS {
		t.Fatalf("expected closest package.json to force %q, got %q", moduleTypeCommonJS, signals.DetectedModuleType)
	}
}

func TestInitializeProjectFileStoresTracksClosestNodeVersionSignal(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	rootPackageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	legacyPackageJSONPath := tspath.ResolvePath(baseDir, "packages/legacy/package.json")
	rootSourcePath := tspath.ResolvePath(baseDir, "src/root.ts")
	inheritedSourcePath := tspath.ResolvePath(baseDir, "packages/inherited/src/file.ts")
	legacySourcePath := tspath.ResolvePath(baseDir, "packages/legacy/src/file.ts")

	writeTestFile(t, rootPackageJSONPath, `{
  "devDependencies": { "@types/node": "^22.0.0" }
}`)
	writeTestFile(t, legacyPackageJSONPath, `{
  "engines": { "node": "12.x" }
}`)
	writeTestFile(t, rootSourcePath, `export const root = 42;`)
	writeTestFile(t, inheritedSourcePath, `export const inherited = 42;`)
	writeTestFile(t, legacySourcePath, `export const legacy = 42;`)

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	stores, err := initializeProjectFileStores(input, BuildAnalyzeProjectFS(input))
	if err != nil {
		t.Fatalf("unexpected store initialization error: %v", err)
	}

	if got := stores.nodeVersionSignalForPath(rootSourcePath); got != "^22.0.0" {
		t.Fatalf("expected root node version signal ^22.0.0, got %q", got)
	}
	if got := stores.nodeVersionSignalForPath(inheritedSourcePath); got != "^22.0.0" {
		t.Fatalf("expected inherited node version signal ^22.0.0, got %q", got)
	}
	if got := stores.nodeVersionSignalForPath(legacySourcePath); got != "12.x" {
		t.Fatalf("expected closest node version signal 12.x, got %q", got)
	}
}

func TestInitializeProjectFileStoresUsesPnpmWorkspaceCatalogForNodeVersionSignals(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	packageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	pnpmWorkspacePath := tspath.ResolvePath(baseDir, "pnpm-workspace.yaml")
	sourcePath := tspath.ResolvePath(baseDir, "src/file.ts")

	writeTestFile(t, packageJSONPath, `{
  "devDependencies": { "@types/node": "catalog:" }
}`)
	writeTestFile(t, pnpmWorkspacePath, "catalog:\n  '@types/node': ^22.14.0\n")
	writeTestFile(t, sourcePath, `export const value = 42;`)

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	stores, err := initializeProjectFileStores(input, BuildAnalyzeProjectFS(input))
	if err != nil {
		t.Fatalf("unexpected store initialization error: %v", err)
	}

	if got := stores.nodeVersionSignalForPath(sourcePath); got != "^22.14.0" {
		t.Fatalf("expected pnpm workspace catalog node version signal ^22.14.0, got %q", got)
	}
}

func TestInitializeProjectFileStoresUsesClosestParentPackageJSONCatalogsForNodeVersionSignals(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	rootPackageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	intermediatePackageJSONPath := tspath.ResolvePath(baseDir, "packages/package.json")
	appPackageJSONPath := tspath.ResolvePath(baseDir, "packages/app/package.json")
	sourcePath := tspath.ResolvePath(baseDir, "packages/app/src/file.ts")

	writeTestFile(t, rootPackageJSONPath, `{
  "workspaces": {
    "packages": ["packages/*"],
    "catalogs": {
      "runtime": {
        "@types/node": "20.x"
      }
    }
  }
}`)
	writeTestFile(t, intermediatePackageJSONPath, `{"name":"packages-intermediate"}`)
	writeTestFile(t, appPackageJSONPath, `{
  "devDependencies": { "@types/node": "catalog:runtime" }
}`)
	writeTestFile(t, sourcePath, `export const value = 42;`)

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	stores, err := initializeProjectFileStores(input, BuildAnalyzeProjectFS(input))
	if err != nil {
		t.Fatalf("unexpected store initialization error: %v", err)
	}

	if got := stores.nodeVersionSignalForPath(sourcePath); got != "20.x" {
		t.Fatalf("expected closest parent catalog node version signal 20.x, got %q", got)
	}
}

func TestInitializeProjectFileStoresUsesDenoManifestSignals(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	packageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	denoJSONPath := tspath.ResolvePath(baseDir, "deno/deno.json")
	sourcePath := tspath.ResolvePath(baseDir, "deno/file.ts")

	writeTestFile(t, packageJSONPath, `{
  "type": "commonjs",
  "dependencies": { "lodash": "^4.17.0" }
}`)
	writeTestFile(t, denoJSONPath, `{
  "imports": {
    "react": "npm:react@19.0.0",
    "@scope/pkg": "npm:@scope/pkg@1.2.3/subpath"
  }
}`)
	writeTestFile(t, sourcePath, `export const value = 42;`)

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	stores, err := initializeProjectFileStores(input, BuildAnalyzeProjectFS(input))
	if err != nil {
		t.Fatalf("unexpected store initialization error: %v", err)
	}

	signals := stores.activationSignalsForFile(sourcePath)
	assertHasDependency(t, signals.Dependencies, "lodash")
	assertHasDependency(t, signals.Dependencies, "react")
	assertHasDependency(t, signals.Dependencies, "@scope/pkg")
	if signals.DetectedModuleType != moduleTypeModule {
		t.Fatalf("expected deno manifest to force %q, got %q", moduleTypeModule, signals.DetectedModuleType)
	}
}

func TestAnalyzeProjectBatchProgramsAlsoAnalyzeOrphans(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	includedPath := tspath.ResolvePath(baseDir, "src/included.ts")
	orphanPath := tspath.ResolvePath(baseDir, "orphan.ts")
	canAccessFileSystem := false
	source := "const arr: number[] = []; delete arr[0];"

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: &canAccessFileSystem,
		},
		Files: map[string]*pb.ProjectFileInput{
			tsconfigPath: {
				FileContent: stringPtr(`{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`),
			},
			includedPath: {
				FileContent: stringPtr(source),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
			orphanPath: {
				FileContent: stringPtr(source),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S2870"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[includedPath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for tsconfig-managed file, got %#v", results[includedPath].GetIssues())
	}
	if len(results[orphanPath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for orphan file, got %#v", results[orphanPath].GetIssues())
	}
}

func TestAnalyzeProjectBatchOrphanProgramUsesDiscoveredCompilerOptionsForRuleGating(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	includedPath := tspath.ResolvePath(baseDir, "a/included.ts")
	orphanPath := tspath.ResolvePath(baseDir, "z-orphan.ts")
	canAccessFileSystem := false

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: &canAccessFileSystem,
		},
		Files: map[string]*pb.ProjectFileInput{
			tsconfigPath: {
				FileContent: stringPtr(`{"compilerOptions":{"strict":true,"lib":["es2015","dom"]},"include":["a/**/*.ts"]}`),
			},
			includedPath: {
				FileContent: stringPtr(`export const value: number = 42;`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
			orphanPath: {
				FileContent: stringPtr(`new Promise(async resolve => { resolve(1); });`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S6544"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[orphanPath].GetIssues()) != 0 {
		t.Fatalf("expected discovered ES2015 compiler options to filter out S6544 on orphan file, got %#v", results[orphanPath].GetIssues())
	}
}

func TestAnalyzeProjectBatchConfiguredProgramUsesClosestNodeVersionSignalForRuleGating(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	rootPackageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	legacyPackageJSONPath := tspath.ResolvePath(baseDir, "packages/legacy/package.json")
	legacyTSConfigPath := tspath.ResolvePath(baseDir, "packages/legacy/tsconfig.json")
	legacyFilePath := tspath.ResolvePath(baseDir, "packages/legacy/src/file.ts")
	canAccessFileSystem := false

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: &canAccessFileSystem,
		},
		Files: map[string]*pb.ProjectFileInput{
			rootPackageJSONPath: {
				FileContent: stringPtr(`{"devDependencies":{"@types/node":"^22.0.0"}}`),
			},
			legacyPackageJSONPath: {
				FileContent: stringPtr(`{"engines":{"node":"12.x"}}`),
			},
			legacyTSConfigPath: {
				FileContent: stringPtr(`{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`),
			},
			legacyFilePath: {
				FileContent: stringPtr(`const x: null | undefined = undefined; const y = x || '';`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S6606"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[legacyFilePath].GetIssues()) != 0 {
		t.Fatalf("expected closest Node 12 signal to filter out S6606, got %#v", results[legacyFilePath].GetIssues())
	}
}

func TestAnalyzeProjectBatchOrphanProgramsUsePerPackageNodeVersionSignals(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	rootPackageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	legacyPackageJSONPath := tspath.ResolvePath(baseDir, "packages/legacy/package.json")
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	includedPath := tspath.ResolvePath(baseDir, "src/included.ts")
	rootOrphanPath := tspath.ResolvePath(baseDir, "orphans/root.ts")
	legacyOrphanPath := tspath.ResolvePath(baseDir, "packages/legacy/orphan.ts")
	canAccessFileSystem := false

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: &canAccessFileSystem,
		},
		Files: map[string]*pb.ProjectFileInput{
			rootPackageJSONPath: {
				FileContent: stringPtr(`{"devDependencies":{"@types/node":"^22.0.0"}}`),
			},
			legacyPackageJSONPath: {
				FileContent: stringPtr(`{"engines":{"node":"12.x"}}`),
			},
			tsconfigPath: {
				FileContent: stringPtr(`{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`),
			},
			includedPath: {
				FileContent: stringPtr(`export const included = 42;`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
			rootOrphanPath: {
				FileContent: stringPtr(`const x: null | undefined = undefined; const y = x || '';`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
			legacyOrphanPath: {
				FileContent: stringPtr(`const x: null | undefined = undefined; const y = x || '';`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S6606"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[rootOrphanPath].GetIssues()) != 1 {
		t.Fatalf("expected root orphan to keep S6606 enabled, got %#v", results[rootOrphanPath].GetIssues())
	}
	if len(results[legacyOrphanPath].GetIssues()) != 0 {
		t.Fatalf("expected legacy orphan Node 12 signal to filter out S6606, got %#v", results[legacyOrphanPath].GetIssues())
	}
}

func TestAnalyzeProjectBatchProcessesReferencedPropertyTSConfigsDuringIteration(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	solutionTSConfig := tspath.ResolvePath(baseDir, "tsconfig.solution.json")
	projectTSConfig := tspath.ResolvePath(baseDir, "packages/app/tsconfig.json")
	sourcePath := tspath.ResolvePath(baseDir, "packages/app/src/main.ts")
	canAccessFileSystem := false
	createTsProgramForOrphanFiles := false
	source := "const arr: number[] = []; delete arr[0];"

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:                       baseDir,
			CanAccessFileSystem:           &canAccessFileSystem,
			CreateTsProgramForOrphanFiles: &createTsProgramForOrphanFiles,
			TsConfigPaths:                 []string{solutionTSConfig},
		},
		Files: map[string]*pb.ProjectFileInput{
			solutionTSConfig: {
				FileContent: stringPtr(`{"files":[],"references":[{"path":"./packages/app"}]}`),
			},
			projectTSConfig: {
				FileContent: stringPtr(`{"compilerOptions":{"composite":true,"strict":true},"include":["src/**/*.ts"]}`),
			},
			sourcePath: {
				FileContent: stringPtr(source),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S2870"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[sourcePath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for referenced tsconfig-managed file, got %#v", results[sourcePath].GetIssues())
	}
}

func TestAnalyzeProjectSonarLintProgramsAlsoAnalyzeOrphans(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	includedPath := tspath.ResolvePath(baseDir, "src/incremental.ts")
	orphanPath := tspath.ResolvePath(baseDir, "orphan.ts")
	canAccessFileSystem := false
	sonarLint := true
	source := "const arr: number[] = []; delete arr[0];"

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: &canAccessFileSystem,
			Sonarlint:           &sonarLint,
		},
		Files: map[string]*pb.ProjectFileInput{
			tsconfigPath: {
				FileContent: stringPtr(`{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`),
			},
			includedPath: {
				FileContent: stringPtr(source),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
			orphanPath: {
				FileContent: stringPtr(source),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S2870"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[includedPath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for SonarLint tsconfig-managed file, got %#v", results[includedPath].GetIssues())
	}
	if len(results[orphanPath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for SonarLint orphan file, got %#v", results[orphanPath].GetIssues())
	}
}

func TestAnalyzeProjectSonarLintOrphanProgramUsesDiscoveredCompilerOptionsForRuleGating(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	includedPath := tspath.ResolvePath(baseDir, "a/included.ts")
	orphanPath := tspath.ResolvePath(baseDir, "z-orphan.ts")
	canAccessFileSystem := false
	sonarLint := true

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: &canAccessFileSystem,
			Sonarlint:           &sonarLint,
		},
		Files: map[string]*pb.ProjectFileInput{
			tsconfigPath: {
				FileContent: stringPtr(`{"compilerOptions":{"strict":true,"lib":["es2015","dom"]},"include":["a/**/*.ts"]}`),
			},
			includedPath: {
				FileContent: stringPtr(`export const value: number = 42;`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
			orphanPath: {
				FileContent: stringPtr(`new Promise(async resolve => { resolve(1); });`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S6544"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[orphanPath].GetIssues()) != 0 {
		t.Fatalf("expected SonarLint orphan program to inherit discovered ES2015 compiler options and filter out S6544, got %#v", results[orphanPath].GetIssues())
	}
}

func TestAnalyzeProjectSonarLintOrphanProgramsUsePerPackageNodeVersionSignals(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	rootPackageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	legacyPackageJSONPath := tspath.ResolvePath(baseDir, "packages/legacy/package.json")
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	includedPath := tspath.ResolvePath(baseDir, "src/included.ts")
	rootOrphanPath := tspath.ResolvePath(baseDir, "orphans/root.ts")
	legacyOrphanPath := tspath.ResolvePath(baseDir, "packages/legacy/orphan.ts")
	canAccessFileSystem := false
	sonarLint := true

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: &canAccessFileSystem,
			Sonarlint:           &sonarLint,
		},
		Files: map[string]*pb.ProjectFileInput{
			rootPackageJSONPath: {
				FileContent: stringPtr(`{"devDependencies":{"@types/node":"^22.0.0"}}`),
			},
			legacyPackageJSONPath: {
				FileContent: stringPtr(`{"engines":{"node":"12.x"}}`),
			},
			tsconfigPath: {
				FileContent: stringPtr(`{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`),
			},
			includedPath: {
				FileContent: stringPtr(`export const included = 42;`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
			rootOrphanPath: {
				FileContent: stringPtr(`const x: null | undefined = undefined; const y = x || '';`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
			legacyOrphanPath: {
				FileContent: stringPtr(`const x: null | undefined = undefined; const y = x || '';`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S6606"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[rootOrphanPath].GetIssues()) != 1 {
		t.Fatalf("expected SonarLint root orphan to keep S6606 enabled, got %#v", results[rootOrphanPath].GetIssues())
	}
	if len(results[legacyOrphanPath].GetIssues()) != 0 {
		t.Fatalf("expected SonarLint legacy orphan Node 12 signal to filter out S6606, got %#v", results[legacyOrphanPath].GetIssues())
	}
}

func TestAnalyzeProjectBatchFallsBackToAstOnlyRulesWhenNoProgramCanBeCreated(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	orphanPath := tspath.ResolvePath(baseDir, "orphan.js")
	canAccessFileSystem := false
	createTsProgramForOrphanFiles := false
	source := "new Promise(async resolve => { resolve(1); });"

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:                       baseDir,
			CanAccessFileSystem:           &canAccessFileSystem,
			CreateTsProgramForOrphanFiles: &createTsProgramForOrphanFiles,
		},
		Files: map[string]*pb.ProjectFileInput{
			orphanPath: {
				FileContent: stringPtr(source),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S6544"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[orphanPath].GetIssues()) != 1 {
		t.Fatalf("expected one AST-only fallback issue, got %#v", results[orphanPath].GetIssues())
	}
}

func TestAnalyzeProjectSonarLintFallsBackToAstOnlyRulesWhenNoProgramCanBeCreated(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	orphanPath := tspath.ResolvePath(baseDir, "orphan.js")
	canAccessFileSystem := false
	createTsProgramForOrphanFiles := false
	sonarLint := true
	source := "new Promise(async resolve => { resolve(1); });"

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:                       baseDir,
			CanAccessFileSystem:           &canAccessFileSystem,
			CreateTsProgramForOrphanFiles: &createTsProgramForOrphanFiles,
			Sonarlint:                     &sonarLint,
		},
		Files: map[string]*pb.ProjectFileInput{
			orphanPath: {
				FileContent: stringPtr(source),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{{Key: "S6544"}},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[orphanPath].GetIssues()) != 1 {
		t.Fatalf("expected one SonarLint AST-only fallback issue, got %#v", results[orphanPath].GetIssues())
	}
}

func TestAnalyzeProjectBatchDisableTypeCheckingRunsOnlyAstOnlyRules(t *testing.T) {
	t.Parallel()

	testAnalyzeProjectDisableTypeCheckingRunsOnlyAstOnlyRules(t, false)
}

func TestAnalyzeProjectSonarLintDisableTypeCheckingRunsOnlyAstOnlyRules(t *testing.T) {
	t.Parallel()

	testAnalyzeProjectDisableTypeCheckingRunsOnlyAstOnlyRules(t, true)
}

func testAnalyzeProjectDisableTypeCheckingRunsOnlyAstOnlyRules(t *testing.T, sonarLint bool) {
	t.Helper()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	typedPath := tspath.ResolvePath(baseDir, "src/typed.ts")
	astOnlyPath := tspath.ResolvePath(baseDir, "src/ast-only.js")
	canAccessFileSystem := false
	disableTypeChecking := true

	input, err := NormalizeAnalyzeProjectRequest(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:                       baseDir,
			CanAccessFileSystem:           &canAccessFileSystem,
			DisableTypeChecking:           &disableTypeChecking,
			Sonarlint:                     &sonarLint,
			EcmaScriptVersion:             stringPtr("ES2017"),
			TsConfigPaths:                 []string{tsconfigPath},
			CreateTsProgramForOrphanFiles: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			tsconfigPath: {
				FileContent: stringPtr(`{"compilerOptions":{"allowJs":true,"checkJs":true},"include":["src/**/*"]}`),
			},
			typedPath: {
				FileContent: stringPtr(`const arr: number[] = []; delete arr[0];`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
			astOnlyPath: {
				FileContent: stringPtr(`new Promise(async resolve => { resolve(1); });`),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
		Rules: []*pb.JsTsRule{
			{Key: "S2870"},
			{Key: "S6544"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[typedPath].GetIssues()) != 0 {
		t.Fatalf("expected typed-only rule to be skipped without a program, got %#v", results[typedPath].GetIssues())
	}
	if len(results[astOnlyPath].GetIssues()) != 1 {
		t.Fatalf("expected one AST-only issue when type checking is disabled, got %#v", results[astOnlyPath].GetIssues())
	}
}

func TestRuleAppliesToFileFiltersOnRequiredDependency(t *testing.T) {
	t.Parallel()

	ruleConfig := NormalizedJsTsRule{}
	file := NormalizedProjectFile{CanonicalPath: "/project/file.ts"}

	if ruleAppliesToFile(
		ruleConfig,
		ruleMetadata{RequiredDependencies: []string{"react"}},
		NormalizedProjectConfiguration{},
		file,
		ruleActivationSignals{Dependencies: map[string]struct{}{"vue": {}}, DetectedModuleType: ""},
	) {
		t.Fatal("expected rule to be filtered out when required dependency is missing")
	}

	if !ruleAppliesToFile(
		ruleConfig,
		ruleMetadata{RequiredDependencies: []string{"react"}},
		NormalizedProjectConfiguration{},
		file,
		ruleActivationSignals{Dependencies: map[string]struct{}{"react": {}}, DetectedModuleType: ""},
	) {
		t.Fatal("expected rule to stay enabled when required dependency is present")
	}
}

func TestNormalizeProjectFilesDefaultsMissingFileStatusToSame(t *testing.T) {
	t.Parallel()

	baseDir := "/project"
	filePath := "src/file.ts"
	normalizedFiles, _, _, _ := NormalizeProjectFiles(
		map[string]*pb.ProjectFileInput{
			filePath: {},
		},
		baseDir,
	)

	normalizedPath := normalizeProjectPath(baseDir, filePath)
	if got := normalizedFiles[normalizedPath].FileStatus; got != pb.FileStatus_FILE_STATUS_SAME {
		t.Fatalf("expected missing fileStatus to default to SAME, got %#v", got)
	}
}

func TestRuleAppliesToFileUsesRequestedAnalysisModeOnlyForSameFiles(t *testing.T) {
	t.Parallel()

	ruleConfig := NormalizedJsTsRule{
		AnalysisModes: []pb.AnalysisMode{pb.AnalysisMode_ANALYSIS_MODE_SKIP_UNCHANGED},
	}
	analysisConfig := NormalizedProjectConfiguration{
		AnalysisMode: pb.AnalysisMode_ANALYSIS_MODE_SKIP_UNCHANGED,
	}

	if !ruleAppliesToFile(
		ruleConfig,
		ruleMetadata{},
		analysisConfig,
		NormalizedProjectFile{
			CanonicalPath: "/project/same.ts",
			FileStatus:    pb.FileStatus_FILE_STATUS_SAME,
		},
		ruleActivationSignals{},
	) {
		t.Fatal("expected SAME file to keep the requested analysis mode")
	}

	if !ruleAppliesToFile(
		ruleConfig,
		ruleMetadata{},
		analysisConfig,
		NormalizedProjectFile{CanonicalPath: "/project/unspecified.ts"},
		ruleActivationSignals{},
	) {
		t.Fatal("expected missing fileStatus to behave like SAME")
	}

	if ruleAppliesToFile(
		ruleConfig,
		ruleMetadata{},
		analysisConfig,
		NormalizedProjectFile{
			CanonicalPath: "/project/changed.ts",
			FileStatus:    pb.FileStatus_FILE_STATUS_CHANGED,
		},
		ruleActivationSignals{},
	) {
		t.Fatal("expected CHANGED file to force DEFAULT analysis mode")
	}

	if ruleAppliesToFile(
		ruleConfig,
		ruleMetadata{},
		analysisConfig,
		NormalizedProjectFile{
			CanonicalPath: "/project/added.ts",
			FileStatus:    pb.FileStatus_FILE_STATUS_ADDED,
		},
		ruleActivationSignals{},
	) {
		t.Fatal("expected ADDED file to force DEFAULT analysis mode")
	}
}

func TestRuleAppliesToFileFiltersOnDetectedModuleTypeOnlyWhenKnown(t *testing.T) {
	t.Parallel()

	ruleConfig := NormalizedJsTsRule{}
	file := NormalizedProjectFile{CanonicalPath: "/project/file.ts"}
	metadata := ruleMetadata{RequiredModuleType: moduleTypeModule}

	if ruleAppliesToFile(
		ruleConfig,
		metadata,
		NormalizedProjectConfiguration{},
		file,
		ruleActivationSignals{Dependencies: map[string]struct{}{}, DetectedModuleType: moduleTypeCommonJS},
	) {
		t.Fatal("expected rule to be filtered out when detected module type does not match")
	}

	if !ruleAppliesToFile(
		ruleConfig,
		metadata,
		NormalizedProjectConfiguration{},
		file,
		ruleActivationSignals{Dependencies: map[string]struct{}{}, DetectedModuleType: ""},
	) {
		t.Fatal("expected unknown module type to keep the rule enabled")
	}

	if !ruleAppliesToFile(
		ruleConfig,
		metadata,
		NormalizedProjectConfiguration{},
		file,
		ruleActivationSignals{Dependencies: map[string]struct{}{}, DetectedModuleType: moduleTypeModule},
	) {
		t.Fatal("expected matching module type to keep the rule enabled")
	}
}

func TestRuleAppliesToFileFiltersOnRequiredEcmaVersionOnlyWhenKnown(t *testing.T) {
	t.Parallel()

	ruleConfig := NormalizedJsTsRule{}
	file := NormalizedProjectFile{CanonicalPath: "/project/file.ts"}
	metadata := ruleMetadata{RequiredEcmaVersion: 2020}

	if ruleAppliesToFile(
		ruleConfig,
		metadata,
		NormalizedProjectConfiguration{},
		file,
		ruleActivationSignals{Dependencies: map[string]struct{}{}, DetectedEcmaVersion: 2017},
	) {
		t.Fatal("expected rule to be filtered out when detected ECMAScript version is too low")
	}

	if !ruleAppliesToFile(
		ruleConfig,
		metadata,
		NormalizedProjectConfiguration{},
		file,
		ruleActivationSignals{Dependencies: map[string]struct{}{}, DetectedEcmaVersion: 0},
	) {
		t.Fatal("expected unknown ECMAScript version to keep the rule enabled")
	}

	if !ruleAppliesToFile(
		ruleConfig,
		metadata,
		NormalizedProjectConfiguration{},
		file,
		ruleActivationSignals{Dependencies: map[string]struct{}{}, DetectedEcmaVersion: 2020},
	) {
		t.Fatal("expected matching ECMAScript version to keep the rule enabled")
	}
}

func TestConfiguredRulesForFileKeepsSameSonarKeyEnabledForJsAndTs(t *testing.T) {
	t.Parallel()

	requestedRules := requestedJsTsRulesByKey([]NormalizedJsTsRule{
		{
			Key:      "S2870",
			Language: pb.JsTsLanguage_JS_TS_LANGUAGE_JS,
		},
		{
			Key:      "S2870",
			Language: pb.JsTsLanguage_JS_TS_LANGUAGE_TS,
		},
	})
	configuredRules := []linter.ConfiguredRule{{Name: "no-array-delete"}}

	jsRules := configuredRulesForFile(
		configuredRules,
		requestedRules,
		NormalizedProjectConfiguration{},
		NormalizedProjectFile{CanonicalPath: "/project/file.js"},
		ruleActivationSignals{},
	)
	if len(jsRules) != 1 {
		t.Fatalf("expected JS file to keep S2870 enabled, got %#v", jsRules)
	}

	tsRules := configuredRulesForFile(
		configuredRules,
		requestedRules,
		NormalizedProjectConfiguration{},
		NormalizedProjectFile{CanonicalPath: "/project/file.ts"},
		ruleActivationSignals{},
	)
	if len(tsRules) != 1 {
		t.Fatalf("expected TS file to keep S2870 enabled, got %#v", tsRules)
	}
}

func TestGeneratedRuleMetadataIncludesBridgeFilterFields(t *testing.T) {
	t.Parallel()

	s131 := ruleMetadataBySonarKey["S131"]
	if !strings.Contains(s131.DefaultOptionsJSON, "\"requireDefaultForNonUnion\":true") {
		t.Fatalf("expected S131 to include generated default options, got %#v", s131)
	}

	s6544 := ruleMetadataBySonarKey["S6544"]
	if s6544.RequiredEcmaVersion != 2017 {
		t.Fatalf("expected S6544 to require ECMAScript 2017, got %#v", s6544)
	}
	if !strings.Contains(s6544.DefaultOptionsJSON, "\"checksVoidReturn\"") {
		t.Fatalf("expected S6544 to include generated default options, got %#v", s6544)
	}

	s1441 := ruleMetadataBySonarKey["S1441"]
	if !strings.Contains(s1441.ConfigurationTransformsJSON, "singleQuotesToQuoteStyle") {
		t.Fatalf("expected S1441 to include primitive configuration transforms, got %#v", s1441)
	}

	s6418 := ruleMetadataBySonarKey["S6418"]
	if !strings.Contains(s6418.ConfigurationTransformsJSON, "randomnessSensibility") {
		t.Fatalf("expected S6418 to include object configuration transforms, got %#v", s6418)
	}

	s7785 := ruleMetadataBySonarKey["S7785"]
	if s7785.RequiredModuleType != moduleTypeModule {
		t.Fatalf("expected S7785 to require %q module type, got %#v", moduleTypeModule, s7785)
	}

	s4423 := ruleMetadataBySonarKey["S4423"]
	if len(s4423.RequiredDependencies) != 1 || s4423.RequiredDependencies[0] != "aws-cdk-lib" {
		t.Fatalf("expected S4423 to require aws-cdk-lib, got %#v", s4423)
	}
}

func writeTestFile(t *testing.T, filePath string, content string) {
	t.Helper()

	if err := os.MkdirAll(tspath.GetDirectoryPath(filePath), 0o755); err != nil {
		t.Fatalf("could not create parent directory for %q: %v", filePath, err)
	}
	if err := os.WriteFile(filePath, []byte(content), 0o600); err != nil {
		t.Fatalf("could not write test file %q: %v", filePath, err)
	}
}

func stringPtr(value string) *string {
	return &value
}

func boolPtr(value bool) *bool {
	return &value
}

func assertHasDependency(t *testing.T, dependencies map[string]struct{}, dependency string) {
	t.Helper()

	if _, ok := dependencies[dependency]; !ok {
		t.Fatalf("expected dependency %q to be present in %#v", dependency, dependencies)
	}
}
