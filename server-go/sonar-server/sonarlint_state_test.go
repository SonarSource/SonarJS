package main

import (
	"context"
	"testing"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/tspath"
)

func TestProjectStoresForAnalysisReusesSonarlintStoresUntilInvalidated(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	packageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	sourcePath := tspath.ResolvePath(baseDir, "src/main.ts")

	writeTestFile(t, tsconfigPath, `{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`)
	writeTestFile(t, packageJSONPath, `{"name":"cache-project"}`)
	writeTestFile(t, sourcePath, `export const value = 42;`)

	state := newSonarlintState()
	firstRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	firstStores, err := projectStoresForAnalysis(firstRequest, BuildAnalyzeProjectFS(firstRequest), state)
	if err != nil {
		t.Fatalf("expected initial SonarLint store discovery to succeed, got %v", err)
	}

	secondStores, err := projectStoresForAnalysis(firstRequest, BuildAnalyzeProjectFS(firstRequest), state)
	if err != nil {
		t.Fatalf("expected SonarLint store reuse to succeed, got %v", err)
	}
	if firstStores != secondStores {
		t.Fatal("expected SonarLint project stores to be reused across requests")
	}

	invalidatingRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
			FsEvents:  []string{tsconfigPath},
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	thirdStores, err := projectStoresForAnalysis(invalidatingRequest, BuildAnalyzeProjectFS(invalidatingRequest), state)
	if err != nil {
		t.Fatalf("expected SonarLint store rebuild to succeed after tsconfig event, got %v", err)
	}
	if thirdStores == firstStores {
		t.Fatal("expected tsconfig fs event to rebuild SonarLint project stores")
	}
}

func TestIncrementalProgramForFileReusesConfiguredProgramAcrossSonarlintRequests(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	sourcePath := tspath.ResolvePath(baseDir, "src/main.ts")

	writeTestFile(t, tsconfigPath, `{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`)
	writeTestFile(t, sourcePath, `export const value: number = 42;`)

	state := newSonarlintState()
	firstRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	firstStores, err := projectStoresForAnalysis(firstRequest, BuildAnalyzeProjectFS(firstRequest), state)
	if err != nil {
		t.Fatalf("expected initial SonarLint store discovery to succeed, got %v", err)
	}

	firstProgram, err := incrementalProgramForFile(
		context.Background(),
		firstRequest.Config,
		sourcePath,
		firstStores,
		BuildAnalyzeProjectFS(firstRequest),
		map[string]*compiler.Program{},
		newCompilerOptionsAccumulator(),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected initial SonarLint configured program creation to succeed, got %v", err)
	}
	if firstProgram == nil {
		t.Fatal("expected initial configured program")
	}

	secondRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	secondStores, err := projectStoresForAnalysis(secondRequest, BuildAnalyzeProjectFS(secondRequest), state)
	if err != nil {
		t.Fatalf("expected cached SonarLint store lookup to succeed, got %v", err)
	}

	secondProgram, err := incrementalProgramForFile(
		context.Background(),
		secondRequest.Config,
		sourcePath,
		secondStores,
		BuildAnalyzeProjectFS(secondRequest),
		map[string]*compiler.Program{},
		newCompilerOptionsAccumulator(),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected cached SonarLint configured program reuse to succeed, got %v", err)
	}
	if secondProgram != firstProgram {
		t.Fatal("expected unchanged SonarLint request to reuse the configured program")
	}
}

func TestIncrementalProgramForFileRefreshesConfiguredProgramWhenContentChanges(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	sourcePath := tspath.ResolvePath(baseDir, "src/main.ts")

	writeTestFile(t, tsconfigPath, `{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`)
	writeTestFile(t, sourcePath, `export const value: number = 42;`)

	state := newSonarlintState()
	firstRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	firstStores, err := projectStoresForAnalysis(firstRequest, BuildAnalyzeProjectFS(firstRequest), state)
	if err != nil {
		t.Fatalf("expected initial SonarLint store discovery to succeed, got %v", err)
	}

	firstProgram, err := incrementalProgramForFile(
		context.Background(),
		firstRequest.Config,
		sourcePath,
		firstStores,
		BuildAnalyzeProjectFS(firstRequest),
		map[string]*compiler.Program{},
		newCompilerOptionsAccumulator(),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected initial configured program creation to succeed, got %v", err)
	}
	if firstProgram == nil {
		t.Fatal("expected initial configured program")
	}

	updatedContent := `export const value: string = "forty-two";`
	secondRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileContent: stringPtr(updatedContent),
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	secondStores, err := projectStoresForAnalysis(secondRequest, BuildAnalyzeProjectFS(secondRequest), state)
	if err != nil {
		t.Fatalf("expected cached SonarLint store lookup to succeed, got %v", err)
	}

	secondProgram, err := incrementalProgramForFile(
		context.Background(),
		secondRequest.Config,
		sourcePath,
		secondStores,
		BuildAnalyzeProjectFS(secondRequest),
		map[string]*compiler.Program{},
		newCompilerOptionsAccumulator(),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected configured program refresh to succeed, got %v", err)
	}
	if secondProgram == nil {
		t.Fatal("expected refreshed configured program")
	}
	if secondProgram == firstProgram {
		t.Fatal("expected changed file content to refresh the configured program")
	}

	sourceFile := secondProgram.GetSourceFile(sourcePath)
	if sourceFile == nil {
		t.Fatalf("expected refreshed configured program to include %s", sourcePath)
	}
	if sourceFile.Text() != updatedContent {
		t.Fatalf("expected refreshed source text %q, got %q", updatedContent, sourceFile.Text())
	}
}

func TestIncrementalProgramForFileDiscoversReferencedPropertyTSConfigs(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	solutionTSConfig := tspath.ResolvePath(baseDir, "tsconfig.solution.json")
	projectTSConfig := tspath.ResolvePath(baseDir, "packages/app/tsconfig.json")
	sourcePath := tspath.ResolvePath(baseDir, "packages/app/src/main.ts")

	writeTestFile(t, solutionTSConfig, `{"files":[],"references":[{"path":"./packages/app"}]}`)
	writeTestFile(t, projectTSConfig, `{"compilerOptions":{"composite":true,"strict":true},"include":["src/**/*.ts"]}`)
	writeTestFile(t, sourcePath, `export const value: number = 42;`)

	state := newSonarlintState()
	request := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:       baseDir,
			Sonarlint:     boolPtr(true),
			TsConfigPaths: []string{solutionTSConfig},
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	stores, err := projectStoresForAnalysis(request, BuildAnalyzeProjectFS(request), state)
	if err != nil {
		t.Fatalf("expected SonarLint store discovery to succeed, got %v", err)
	}
	if got := stores.tsConfigs(); len(got) != 1 || got[0] != solutionTSConfig {
		t.Fatalf("expected initial property tsconfig set to contain only %q, got %#v", solutionTSConfig, got)
	}

	program, err := incrementalProgramForFile(
		context.Background(),
		request.Config,
		sourcePath,
		stores,
		BuildAnalyzeProjectFS(request),
		map[string]*compiler.Program{},
		newCompilerOptionsAccumulator(),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected incremental typed program resolution through project references to succeed, got %v", err)
	}
	if program == nil {
		t.Fatal("expected referenced child tsconfig to produce a configured program")
	}
	if program.GetSourceFile(sourcePath) == nil {
		t.Fatalf("expected configured program to include %s", sourcePath)
	}

	if _, ok := state.getConfiguredProgram(projectTSConfig); !ok {
		t.Fatalf("expected referenced child tsconfig %q to be cached", projectTSConfig)
	}

	foundChildConfig := false
	for _, tsconfig := range stores.tsConfigs() {
		if tsconfig == projectTSConfig {
			foundChildConfig = true
			break
		}
	}
	if !foundChildConfig {
		t.Fatalf("expected discovered referenced tsconfig %q in active store, got %#v", projectTSConfig, stores.tsConfigs())
	}
}

func TestInferredProgramForFileRetainsMultipleSonarlintOrphanPrograms(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	firstPath := tspath.ResolvePath(baseDir, "orphans/first.ts")
	secondPath := tspath.ResolvePath(baseDir, "orphans/second.ts")

	writeTestFile(t, firstPath, `export const first: number = 1;`)
	writeTestFile(t, secondPath, `export const second: number = 2;`)

	state := newSonarlintState()
	firstInput := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			firstPath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})
	secondInput := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			secondPath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	firstProgram, _, err := inferredProgramForFile(
		firstPath,
		[]string{firstPath},
		baseDir,
		BuildAnalyzeProjectFS(firstInput),
		nil,
		nil,
		buildInferredCompilerOptions(firstInput.Config, nil, ""),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected first orphan program creation to succeed, got %v", err)
	}
	if firstProgram == nil {
		t.Fatal("expected first orphan program")
	}

	secondProgram, _, err := inferredProgramForFile(
		secondPath,
		[]string{secondPath},
		baseDir,
		BuildAnalyzeProjectFS(secondInput),
		nil,
		nil,
		buildInferredCompilerOptions(secondInput.Config, nil, ""),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected second orphan program creation to succeed, got %v", err)
	}
	if secondProgram == nil {
		t.Fatal("expected second orphan program")
	}
	if secondProgram == firstProgram {
		t.Fatal("expected different orphan roots to produce distinct cached programs")
	}

	reusedFirstProgram, _, err := inferredProgramForFile(
		firstPath,
		[]string{firstPath},
		baseDir,
		BuildAnalyzeProjectFS(firstInput),
		nil,
		nil,
		buildInferredCompilerOptions(firstInput.Config, nil, ""),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected first orphan program reuse to succeed, got %v", err)
	}
	if reusedFirstProgram != firstProgram {
		t.Fatal("expected SonarLint orphan cache to retain multiple programs and reuse the first one")
	}
}

func TestInferredProgramForFileDoesNotReuseSonarlintOrphanProgramWhenCompilerOptionsChange(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	orphanPath := tspath.ResolvePath(baseDir, "orphans/first.ts")

	writeTestFile(t, orphanPath, `new Promise(async resolve => { resolve(1); });`)

	state := newSonarlintState()
	firstInput := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:           baseDir,
			Sonarlint:         boolPtr(true),
			EcmaScriptVersion: stringPtr("ES2017"),
		},
		Files: map[string]*pb.ProjectFileInput{
			orphanPath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})
	secondInput := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:           baseDir,
			Sonarlint:         boolPtr(true),
			EcmaScriptVersion: stringPtr("ES2015"),
		},
		Files: map[string]*pb.ProjectFileInput{
			orphanPath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	firstOptions := buildInferredCompilerOptions(firstInput.Config, nil, "")
	firstProgram, _, err := inferredProgramForFile(
		orphanPath,
		[]string{orphanPath},
		baseDir,
		BuildAnalyzeProjectFS(firstInput),
		nil,
		nil,
		firstOptions,
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected first orphan program creation to succeed, got %v", err)
	}
	if firstProgram == nil {
		t.Fatal("expected first orphan program")
	}

	secondOptions := buildInferredCompilerOptions(secondInput.Config, nil, "")
	secondProgram, _, err := inferredProgramForFile(
		orphanPath,
		[]string{orphanPath},
		baseDir,
		BuildAnalyzeProjectFS(secondInput),
		nil,
		nil,
		secondOptions,
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected second orphan program creation to succeed, got %v", err)
	}
	if secondProgram == nil {
		t.Fatal("expected second orphan program")
	}
	if secondProgram == firstProgram {
		t.Fatal("expected changed inferred compiler options to avoid reusing the cached orphan program")
	}
	if len(state.orphanPrograms) != 2 {
		t.Fatalf("expected SonarLint orphan cache to keep both option variants, got %d cached program(s)", len(state.orphanPrograms))
	}
}

func TestProjectStoresForAnalysisClearsConfiguredProgramsOnTsconfigReset(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	sourcePath := tspath.ResolvePath(baseDir, "src/main.ts")

	writeTestFile(t, tsconfigPath, `{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`)
	writeTestFile(t, sourcePath, `export const value = 42;`)

	state := newSonarlintState()
	firstRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	firstStores, err := projectStoresForAnalysis(firstRequest, BuildAnalyzeProjectFS(firstRequest), state)
	if err != nil {
		t.Fatalf("expected initial SonarLint store discovery to succeed, got %v", err)
	}

	_, err = incrementalProgramForFile(
		context.Background(),
		firstRequest.Config,
		sourcePath,
		firstStores,
		BuildAnalyzeProjectFS(firstRequest),
		map[string]*compiler.Program{},
		newCompilerOptionsAccumulator(),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected initial configured program creation to succeed, got %v", err)
	}
	if len(state.configuredPrograms) == 0 {
		t.Fatal("expected configured program cache to be populated")
	}

	resetRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
			FsEvents:  []string{tsconfigPath},
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	_, err = projectStoresForAnalysis(resetRequest, BuildAnalyzeProjectFS(resetRequest), state)
	if err != nil {
		t.Fatalf("expected SonarLint store rebuild to succeed, got %v", err)
	}
	if len(state.configuredPrograms) != 0 {
		t.Fatal("expected tsconfig reset to clear configured program cache")
	}
}

func TestProjectStoresForAnalysisClearsProgramsOnDependencyReset(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	tsconfigPath := tspath.ResolvePath(baseDir, "tsconfig.json")
	packageJSONPath := tspath.ResolvePath(baseDir, "package.json")
	sourcePath := tspath.ResolvePath(baseDir, "src/main.ts")
	orphanPath := tspath.ResolvePath(baseDir, "orphans/file.ts")

	writeTestFile(t, tsconfigPath, `{"compilerOptions":{"strict":true},"include":["src/**/*.ts"]}`)
	writeTestFile(t, packageJSONPath, `{"devDependencies":{"@types/node":"^22.0.0"}}`)
	writeTestFile(t, sourcePath, `export const value = 42;`)
	writeTestFile(t, orphanPath, `export const orphan = 42;`)

	state := newSonarlintState()
	firstRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
			orphanPath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	firstStores, err := projectStoresForAnalysis(firstRequest, BuildAnalyzeProjectFS(firstRequest), state)
	if err != nil {
		t.Fatalf("expected initial SonarLint store discovery to succeed, got %v", err)
	}

	_, err = incrementalProgramForFile(
		context.Background(),
		firstRequest.Config,
		sourcePath,
		firstStores,
		BuildAnalyzeProjectFS(firstRequest),
		map[string]*compiler.Program{},
		newCompilerOptionsAccumulator(),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected initial configured program creation to succeed, got %v", err)
	}

	_, _, err = inferredProgramForFile(
		orphanPath,
		[]string{orphanPath},
		baseDir,
		BuildAnalyzeProjectFS(firstRequest),
		nil,
		nil,
		buildInferredCompilerOptions(firstRequest.Config, nil, ""),
		state,
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected initial orphan program creation to succeed, got %v", err)
	}
	if len(state.configuredPrograms) == 0 {
		t.Fatal("expected configured program cache to be populated")
	}
	if len(state.orphanPrograms) == 0 {
		t.Fatal("expected orphan program cache to be populated")
	}

	resetRequest := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:   baseDir,
			Sonarlint: boolPtr(true),
			FsEvents:  []string{packageJSONPath},
		},
		Files: map[string]*pb.ProjectFileInput{
			sourcePath: {
				FileType: pb.FileType_FILE_TYPE_MAIN,
			},
		},
	})

	_, err = projectStoresForAnalysis(resetRequest, BuildAnalyzeProjectFS(resetRequest), state)
	if err != nil {
		t.Fatalf("expected SonarLint store rebuild to succeed, got %v", err)
	}
	if len(state.configuredPrograms) != 0 {
		t.Fatal("expected dependency reset to clear configured program cache")
	}
	if len(state.orphanPrograms) != 0 {
		t.Fatal("expected dependency reset to clear orphan program cache")
	}
}

func mustNormalizeAnalyzeProjectRequest(t *testing.T, req *pb.AnalyzeProjectRequest) *NormalizedAnalyzeProjectInput {
	t.Helper()

	input, err := NormalizeAnalyzeProjectRequest(req)
	if err != nil {
		t.Fatalf("unexpected request normalization error: %v", err)
	}
	return input
}
