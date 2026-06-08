package main

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/tspath"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const testTimeout = 2 * time.Second

type testServerStream struct {
	ctx context.Context
}

func (s *testServerStream) SetHeader(metadata.MD) error  { return nil }
func (s *testServerStream) SendHeader(metadata.MD) error { return nil }
func (s *testServerStream) SetTrailer(metadata.MD)       {}
func (s *testServerStream) Context() context.Context {
	if s.ctx == nil {
		return context.Background()
	}
	return s.ctx
}
func (s *testServerStream) SendMsg(any) error { return nil }
func (s *testServerStream) RecvMsg(any) error { return nil }

type testAnalyzeProjectStream struct {
	testServerStream
	sent []*pb.AnalyzeProjectStreamResponse
}

func (s *testAnalyzeProjectStream) Send(response *pb.AnalyzeProjectStreamResponse) error {
	s.sent = append(s.sent, response)
	return nil
}

type testLeaseStream struct {
	testServerStream
	recvFn func() (*pb.LeaseRequest, error)
}

func (s *testLeaseStream) Recv() (*pb.LeaseRequest, error) {
	if s.recvFn == nil {
		return nil, io.EOF
	}
	return s.recvFn()
}

func (s *testLeaseStream) Send(*pb.LeaseResponse) error {
	return nil
}

func TestAnalyzeProjectRejectsConcurrentUnaryWhileStreamActive(t *testing.T) {
	request := createTestAnalyzeProjectRequest(t)
	started := make(chan struct{})
	release := make(chan struct{})
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		close(started)
		<-release
		return createProjectAnalysisRun(input.OrderedFiles, false)
	}, nil)
	stream := &testAnalyzeProjectStream{testServerStream: testServerStream{ctx: context.Background()}}

	errCh := make(chan error, 1)
	go func() {
		errCh <- service.AnalyzeProject(request, stream)
	}()

	waitForSignal(t, started, "stream analysis start")

	_, err := service.AnalyzeProjectUnary(context.Background(), request)
	if status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("expected concurrent unary call to be rejected with RESOURCE_EXHAUSTED, got %v", err)
	}

	close(release)
	if err := waitForError(t, errCh, "stream analysis completion"); err != nil {
		t.Fatalf("expected stream analysis to complete successfully, got %v", err)
	}
}

func TestAnalyzeProjectRejectsConcurrentStreamWhileUnaryActive(t *testing.T) {
	request := createTestAnalyzeProjectRequest(t)
	started := make(chan struct{})
	release := make(chan struct{})
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		close(started)
		<-release
		return createProjectAnalysisRun(input.OrderedFiles, false)
	}, nil)

	responseCh := make(chan *pb.AnalyzeProjectUnaryResponse, 1)
	errCh := make(chan error, 1)
	go func() {
		response, err := service.AnalyzeProjectUnary(context.Background(), request)
		if err != nil {
			errCh <- err
			return
		}
		responseCh <- response
	}()

	waitForSignal(t, started, "unary analysis start")

	stream := &testAnalyzeProjectStream{testServerStream: testServerStream{ctx: context.Background()}}
	err := service.AnalyzeProject(request, stream)
	if status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("expected concurrent stream call to be rejected with RESOURCE_EXHAUSTED, got %v", err)
	}

	close(release)

	select {
	case response := <-responseCh:
		if response == nil {
			t.Fatal("expected unary response")
		}
	case err := <-errCh:
		t.Fatalf("expected unary analysis to succeed, got %v", err)
	case <-time.After(testTimeout):
		t.Fatal("timed out waiting for unary analysis completion")
	}
}

func TestAnalyzeProjectCancelsActiveStreamAndEmitsCancelledMessage(t *testing.T) {
	request := createTestAnalyzeProjectRequest(t)
	started := make(chan struct{})
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		close(started)
		<-ctx.Done()
		return createProjectAnalysisRun(input.OrderedFiles, true)
	}, nil)
	stream := &testAnalyzeProjectStream{testServerStream: testServerStream{ctx: context.Background()}}

	errCh := make(chan error, 1)
	go func() {
		errCh <- service.AnalyzeProject(request, stream)
	}()

	waitForSignal(t, started, "stream analysis start")

	response, err := service.CancelAnalysis(context.Background(), &pb.CancelAnalysisRequest{})
	if err != nil {
		t.Fatalf("expected cancel RPC to succeed, got %v", err)
	}
	if !response.Cancelled {
		t.Fatal("expected cancel RPC to report an active analysis")
	}

	if err := waitForError(t, errCh, "stream analysis completion"); err != nil {
		t.Fatalf("expected stream analysis to complete after cancellation, got %v", err)
	}

	if len(stream.sent) != 2 {
		t.Fatalf("expected one file result plus one cancelled message, got %d message(s)", len(stream.sent))
	}
	if got := stream.sent[0].GetFileResult(); got == nil {
		t.Fatal("expected first message to be a file result")
	}
	if got := stream.sent[1].GetCancelled(); got == nil {
		t.Fatal("expected final message to be cancelled")
	}
	if got := stream.sent[1].GetMeta(); got != nil {
		t.Fatalf("expected no meta after cancellation, got %#v", got)
	}
}

func TestAnalyzeProjectUnaryReturnsPartialResultsWhenCancelled(t *testing.T) {
	request := createTestAnalyzeProjectRequest(t)
	expectedInput, err := NormalizeAnalyzeProjectRequest(request)
	if err != nil {
		t.Fatalf("expected test request to normalize, got %v", err)
	}

	started := make(chan struct{})
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		close(started)
		<-ctx.Done()
		run := createProjectAnalysisRun(input.OrderedFiles, true)
		run.meta = &pb.ProjectAnalysisMeta{Warnings: []string{"partial"}}
		return run
	}, nil)

	type unaryResult struct {
		response *pb.AnalyzeProjectUnaryResponse
		err      error
	}
	resultCh := make(chan unaryResult, 1)
	go func() {
		response, err := service.AnalyzeProjectUnary(context.Background(), request)
		resultCh <- unaryResult{response: response, err: err}
	}()

	waitForSignal(t, started, "unary analysis start")

	cancelResponse, err := service.CancelAnalysis(context.Background(), &pb.CancelAnalysisRequest{})
	if err != nil {
		t.Fatalf("expected cancel RPC to succeed, got %v", err)
	}
	if !cancelResponse.Cancelled {
		t.Fatal("expected cancel RPC to report an active unary analysis")
	}

	select {
	case result := <-resultCh:
		if result.err != nil {
			t.Fatalf("expected unary cancellation to return partial success, got %v", result.err)
		}
		if result.response == nil {
			t.Fatal("expected unary response")
		}
		if got := result.response.Files[expectedInput.OrderedFiles[0]]; got == nil {
			t.Fatalf("expected partial unary response to include %s", expectedInput.OrderedFiles[0])
		}
		if len(result.response.Meta.GetWarnings()) != 1 || result.response.Meta.GetWarnings()[0] != "partial" {
			t.Fatalf("expected partial warning metadata, got %#v", result.response.Meta.GetWarnings())
		}
	case <-time.After(testTimeout):
		t.Fatal("timed out waiting for unary cancellation result")
	}
}

func TestCancelAnalysisReturnsFalseWithoutActiveAnalysis(t *testing.T) {
	service := newAnalyzerService(nil, nil)

	response, err := service.CancelAnalysis(context.Background(), &pb.CancelAnalysisRequest{})
	if err != nil {
		t.Fatalf("expected cancel RPC to succeed, got %v", err)
	}
	if response.Cancelled {
		t.Fatal("expected cancel RPC to report no active analysis")
	}
}

func TestAnalyzeProjectStreamsDiscoveredFilesWhenRequestOmitsFiles(t *testing.T) {
	baseDir := t.TempDir()
	discoveredFile := baseDir + "/discovered.ts"
	service := newAnalyzerService(func(ctx context.Context, input *NormalizedAnalyzeProjectInput) projectAnalysisRun {
		return createProjectAnalysisRun([]string{discoveredFile}, false)
	}, nil)
	stream := &testAnalyzeProjectStream{testServerStream: testServerStream{ctx: context.Background()}}

	err := service.AnalyzeProject(&pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:             baseDir,
			CanAccessFileSystem: testBoolPtr(true),
		},
	}, stream)
	if err != nil {
		t.Fatalf("expected discovered-file stream to succeed, got %v", err)
	}

	if len(stream.sent) != 2 {
		t.Fatalf("expected one file result plus meta, got %d message(s)", len(stream.sent))
	}
	if got := stream.sent[0].GetFileResult(); got == nil || got.FilePath != discoveredFile {
		t.Fatalf("expected discovered file result for %s, got %#v", discoveredFile, got)
	}
	if got := stream.sent[1].GetMeta(); got == nil {
		t.Fatal("expected final meta message")
	}
}

func TestLeaseRejectsSecondAcquisition(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	service := newAnalyzerService(nil, nil)
	firstLease := &testLeaseStream{
		testServerStream: testServerStream{ctx: context.Background()},
		recvFn: func() (*pb.LeaseRequest, error) {
			select {
			case <-started:
			default:
				close(started)
			}
			<-release
			return nil, io.EOF
		},
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- service.Lease(firstLease)
	}()

	waitForSignal(t, started, "first lease acquisition")

	secondLease := &testLeaseStream{testServerStream: testServerStream{ctx: context.Background()}}
	err := service.Lease(secondLease)
	if status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("expected second lease acquisition to be rejected with RESOURCE_EXHAUSTED, got %v", err)
	}

	close(release)
	if err := waitForError(t, errCh, "first lease completion"); err != nil {
		t.Fatalf("expected first lease to complete successfully, got %v", err)
	}
}

func TestLeaseCompletionTriggersShutdownCallback(t *testing.T) {
	reasons := make(chan string, 1)
	service := newAnalyzerService(nil, func(reason string) {
		reasons <- reason
	})

	err := service.Lease(&testLeaseStream{testServerStream: testServerStream{ctx: context.Background()}})
	if err != nil {
		t.Fatalf("expected lease to complete successfully, got %v", err)
	}

	select {
	case reason := <-reasons:
		if reason != "lease completed" {
			t.Fatalf("expected shutdown reason 'lease completed', got %q", reason)
		}
	case <-time.After(testTimeout):
		t.Fatal("timed out waiting for lease shutdown callback")
	}
}

func TestCreateConfiguredProgramSkipsAncestorNodeModulesWhenRequested(t *testing.T) {
	rootDir := tspath.NormalizePath(t.TempDir())
	baseDir := tspath.CombinePaths(rootDir, "project")
	sourceFile := tspath.CombinePaths(baseDir, "src", "main.ts")
	tsconfigPath := tspath.CombinePaths(baseDir, "tsconfig.json")
	dependencyFile := tspath.CombinePaths(rootDir, "node_modules", "foo", "index.d.ts")

	writeNormalizedTestFile(t, sourceFile, "import { answer } from \"foo\";\nconst value: number = answer;\n")
	writeNormalizedTestFile(
		t,
		tsconfigPath,
		"{\"compilerOptions\":{\"module\":\"nodenext\",\"moduleResolution\":\"nodenext\",\"target\":\"es2020\"},\"include\":[\"src/main.ts\"]}\n",
	)
	writeNormalizedTestFile(t, dependencyFile, "export declare const answer: number;\n")

	baseConfig := NormalizedProjectConfiguration{BaseDir: baseDir}
	program, diagnostics, err := configuredProgramForTest(baseConfig, tsconfigPath)
	if err != nil {
		t.Fatalf("expected configured program creation without the skip flag to succeed, got %v", err)
	}
	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics without the skip flag, got %#v", diagnostics)
	}
	if program == nil {
		t.Fatal("expected configured program creation without the skip flag to produce a program")
	}
	if program.GetSourceFile(sourceFile) == nil {
		t.Fatalf("expected configured program to include %s", sourceFile)
	}
	if program.GetSourceFile(dependencyFile) == nil {
		t.Fatalf("expected configured program to resolve ancestor dependency %s", dependencyFile)
	}

	skipConfig := baseConfig
	skipConfig.SkipNodeModuleLookupOutsideBaseDir = testBoolPtr(true)
	program, diagnostics, err = configuredProgramForTest(skipConfig, tsconfigPath)
	if err != nil {
		t.Fatalf("expected configured program creation with the skip flag to complete, got %v", err)
	}
	if program == nil {
		t.Fatal("expected configured program creation with the skip flag to still return a program")
	}
	if program.GetSourceFile(dependencyFile) != nil {
		t.Fatalf("expected configured program to stop resolving ancestor dependency %s", dependencyFile)
	}
	source := program.GetSourceFile(sourceFile)
	if source == nil {
		t.Fatalf("expected configured program to include %s", sourceFile)
	}
	if len(diagnostics) != 0 {
		t.Fatalf("expected no internal diagnostics from configured program creation, got %#v", diagnostics)
	}
}

func TestCreateConfiguredProgramSupportsLegacyBaseURL(t *testing.T) {
	rootDir := tspath.NormalizePath(t.TempDir())
	sourceDir := tspath.CombinePaths(rootDir, "src")
	sourceFile := tspath.CombinePaths(sourceDir, "main.ts")
	dependencyFile := tspath.CombinePaths(sourceDir, "lib.ts")
	tsconfigPath := tspath.CombinePaths(rootDir, "tsconfig.json")

	writeNormalizedTestFile(t, sourceFile, "import { answer } from \"lib\";\nconst result = \"foo\" < answer;\n")
	writeNormalizedTestFile(t, dependencyFile, "export const answer = \"42\";\n")
	writeNormalizedTestFile(
		t,
		tsconfigPath,
		"{\"compilerOptions\":{\"module\":\"commonjs\",\"baseUrl\":\"./src\"},\"include\":[\"src/**/*.ts\"]}\n",
	)

	program, diagnostics, err := configuredProgramForTest(
		NormalizedProjectConfiguration{BaseDir: rootDir},
		tsconfigPath,
	)
	if err != nil {
		t.Fatalf("expected configured program creation with legacy baseUrl to succeed, got %v", err)
	}
	if len(diagnostics) != 0 {
		t.Fatalf("expected no internal diagnostics from legacy baseUrl compatibility, got %#v", diagnostics)
	}
	if program == nil {
		t.Fatal("expected configured program with legacy baseUrl compatibility")
	}
	if program.GetSourceFile(dependencyFile) == nil {
		t.Fatalf("expected configured program to resolve baseUrl import dependency %s", dependencyFile)
	}
	source := program.GetSourceFile(sourceFile)
	if source == nil {
		t.Fatalf("expected configured program to include %s", sourceFile)
	}
	if hasSemanticDiagnosticContaining(program, source, "Cannot find module 'lib'") {
		t.Fatal("expected configured program to resolve legacy baseUrl import")
	}
}

func TestCreateConfiguredProgramSupportsLegacyBaseURLFromExtendedConfig(t *testing.T) {
	rootDir := tspath.NormalizePath(t.TempDir())
	sourceDir := tspath.CombinePaths(rootDir, "src")
	sourceFile := tspath.CombinePaths(sourceDir, "main.ts")
	dependencyFile := tspath.CombinePaths(sourceDir, "lib.ts")
	baseConfigPath := tspath.CombinePaths(rootDir, "tsconfig.base.json")
	tsconfigPath := tspath.CombinePaths(sourceDir, "tsconfig.json")

	writeNormalizedTestFile(t, sourceFile, "import { answer } from \"lib\";\nconst result = \"foo\" < answer;\n")
	writeNormalizedTestFile(t, dependencyFile, "export const answer = \"42\";\n")
	writeNormalizedTestFile(
		t,
		baseConfigPath,
		"{\"compilerOptions\":{\"module\":\"commonjs\",\"baseUrl\":\"./src\"}}\n",
	)
	writeNormalizedTestFile(
		t,
		tsconfigPath,
		"{\"extends\":\"../tsconfig.base.json\",\"include\":[\"*.ts\"]}\n",
	)

	program, diagnostics, err := configuredProgramForTest(
		NormalizedProjectConfiguration{BaseDir: rootDir},
		tsconfigPath,
	)
	if err != nil {
		t.Fatalf("expected configured program creation with inherited legacy baseUrl to succeed, got %v", err)
	}
	if len(diagnostics) != 0 {
		t.Fatalf("expected no internal diagnostics from inherited legacy baseUrl compatibility, got %#v", diagnostics)
	}
	if program == nil {
		t.Fatal("expected configured program with inherited legacy baseUrl compatibility")
	}
	if program.GetSourceFile(dependencyFile) == nil {
		t.Fatalf("expected configured program to resolve inherited baseUrl import dependency %s", dependencyFile)
	}
	source := program.GetSourceFile(sourceFile)
	if source == nil {
		t.Fatalf("expected configured program to include %s", sourceFile)
	}
	if hasSemanticDiagnosticContaining(program, source, "Cannot find module 'lib'") {
		t.Fatal("expected configured program to resolve inherited legacy baseUrl import")
	}
}

func TestAnalyzeProjectBatchUsesAllExplicitTSConfigsForMultipleTargets(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	sourceDir := tspath.CombinePaths(baseDir, "src")
	packageJSONPath := tspath.CombinePaths(baseDir, "package.json")
	rootConfigPath := tspath.CombinePaths(baseDir, "tsconfig.json")
	es6ConfigPath := tspath.CombinePaths(baseDir, "tsconfig.es6.json")
	mainPath := tspath.CombinePaths(sourceDir, "main.ts")
	mainES6Path := tspath.CombinePaths(sourceDir, "main.es6.ts")
	libPath := tspath.CombinePaths(sourceDir, "lib.ts")

	writeNormalizedTestFile(
		t,
		rootConfigPath,
		"{\"compilerOptions\":{\"module\":\"commonjs\",\"baseUrl\":\"./\"},\"include\":[\"**/*.ts\"],\"exclude\":[\"**/*.es6.ts\"]}\n",
	)
	writeNormalizedTestFile(
		t,
		es6ConfigPath,
		"{\"compilerOptions\":{\"module\":\"commonjs\",\"baseUrl\":\"./src\",\"target\":\"es6\"},\"include\":[\"**/*.es6.ts\"]}\n",
	)
	writeNormalizedTestFile(
		t,
		packageJSONPath,
		"{\"devDependencies\":{\"@types/node\":\"18.14.6\"}}\n",
	)
	writeNormalizedTestFile(t, libPath, "export const CONSTANT = \"42\";\n")
	writeNormalizedTestFile(
		t,
		mainPath,
		"import { CONSTANT } from './lib';\n\nfunction foo(value: string, logger: (flag: boolean) => void) {\n  logger(value < CONSTANT);\n}\n\nfoo('ES3', flag => console.log(flag ? 'FAILURE' : 'SUCCESS'));\n",
	)
	writeNormalizedTestFile(
		t,
		mainES6Path,
		"import { CONSTANT } from 'lib';\n\nfunction foo(value: string, logger: (flag: boolean) => void) {\n  logger(value < CONSTANT);\n}\n\nfoo('ES6', flag => console.log(flag ? 'FAILURE' : 'SUCCESS'));\n",
	)

	input := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:       baseDir,
			TsConfigPaths: []string{rootConfigPath, es6ConfigPath},
		},
		Rules: []*pb.JsTsRule{{Key: "S3003"}},
	})

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[mainPath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for %s, got %#v", mainPath, results[mainPath].GetIssues())
	}
	if len(results[mainES6Path].GetIssues()) != 1 {
		t.Fatalf("expected one issue for %s, got %#v", mainES6Path, results[mainES6Path].GetIssues())
	}
}

func TestAnalyzeProjectBatchZeroConfigSupportsSharedBaseLegacyBaseURL(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	sourceDir := tspath.CombinePaths(baseDir, "src")
	packageJSONPath := tspath.CombinePaths(baseDir, "package.json")
	baseConfigPath := tspath.CombinePaths(baseDir, "tsconfig.base.json")
	tsconfigPath := tspath.CombinePaths(baseDir, "tsconfig.json")
	mainPath := tspath.CombinePaths(sourceDir, "main.ts")
	libPath := tspath.CombinePaths(sourceDir, "lib.ts")

	writeNormalizedTestFile(
		t,
		baseConfigPath,
		"{\"compilerOptions\":{\"module\":\"commonjs\",\"baseUrl\":\"./src\"}}\n",
	)
	writeNormalizedTestFile(
		t,
		tsconfigPath,
		"{\"extends\":\"./tsconfig.base.json\",\"include\":[\"**/*.ts\"]}\n",
	)
	writeNormalizedTestFile(
		t,
		packageJSONPath,
		"{\"devDependencies\":{\"@types/node\":\"18.14.6\"}}\n",
	)
	writeNormalizedTestFile(t, libPath, "export const CONSTANT = \"42\";\n")
	writeNormalizedTestFile(
		t,
		mainPath,
		"import { CONSTANT } from 'lib';\n\nfunction foo(value: string) {\n  return value < CONSTANT;\n}\n\nconsole.log(foo('10') ? 'SUCCESS' : 'FAILURE');\n",
	)

	input := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
		Rules:         []*pb.JsTsRule{{Key: "S3003"}},
	})

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[mainPath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for shared-base main file, got %#v", results[mainPath].GetIssues())
	}
}

func TestAnalyzeProjectBatchZeroConfigSupportsSolutionTSConfigReferences(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	baseConfigPath := tspath.CombinePaths(baseDir, "tsconfig-base.json")
	rootConfigPath := tspath.CombinePaths(baseDir, "tsconfig.json")
	libraryConfigPath := tspath.CombinePaths(baseDir, "library/tsconfig.json")
	endpointConfigPath := tspath.CombinePaths(baseDir, "endpoint/tsconfig.json")
	libraryIndexPath := tspath.CombinePaths(baseDir, "library/index.ts")
	libraryLibPath := tspath.CombinePaths(baseDir, "library/lib.ts")
	endpointMainPath := tspath.CombinePaths(baseDir, "endpoint/main.ts")

	writeNormalizedTestFile(
		t,
		baseConfigPath,
		"{\"compilerOptions\":{\"rootDir\":\".\",\"outDir\":\"dist\",\"composite\":true,\"module\":\"commonjs\",\"baseUrl\":\"./\"}}\n",
	)
	writeNormalizedTestFile(
		t,
		rootConfigPath,
		"{\"files\":[],\"include\":[],\"references\":[{\"path\":\"library\"},{\"path\":\"endpoint\"}]}\n",
	)
	writeNormalizedTestFile(
		t,
		libraryConfigPath,
		"{\"extends\":\"../tsconfig-base\",\"include\":[\"*.ts\"]}\n",
	)
	writeNormalizedTestFile(
		t,
		endpointConfigPath,
		"{\"extends\":\"../tsconfig-base\",\"include\":[\"*.ts\"],\"references\":[{\"path\":\"../library\"}]}\n",
	)
	writeNormalizedTestFile(t, libraryLibPath, "export const answer = \"42\";\n")
	writeNormalizedTestFile(
		t,
		libraryIndexPath,
		"import { answer } from \"library/lib\";\nexport function foo(value: string) {\n\treturn value < answer;\n}\n",
	)
	writeNormalizedTestFile(t, endpointMainPath, "import { foo } from \"../library\";\nconsole.log(foo(\"10\"));\n")

	input := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
		Rules:         []*pb.JsTsRule{{Key: "S3003"}},
	})

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[libraryIndexPath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for solution-tsconfig library entrypoint, got %#v", results[libraryIndexPath].GetIssues())
	}
	if len(results[endpointMainPath].GetIssues()) != 0 {
		t.Fatalf("expected endpoint file to stay clean, got %#v", results[endpointMainPath].GetIssues())
	}
}

func TestAnalyzeProjectBatchWithExplicitFilesUsesAllExplicitTSConfigsForMultipleTargets(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	sourceDir := tspath.CombinePaths(baseDir, "src")
	packageJSONPath := tspath.CombinePaths(baseDir, "package.json")
	rootConfigPath := tspath.CombinePaths(baseDir, "tsconfig.json")
	es6ConfigPath := tspath.CombinePaths(baseDir, "tsconfig.es6.json")
	mainPath := tspath.CombinePaths(sourceDir, "main.ts")
	mainES6Path := tspath.CombinePaths(sourceDir, "main.es6.ts")
	libPath := tspath.CombinePaths(sourceDir, "lib.ts")

	writeNormalizedTestFile(
		t,
		rootConfigPath,
		"{\"compilerOptions\":{\"module\":\"commonjs\",\"baseUrl\":\"./\"},\"include\":[\"**/*.ts\"],\"exclude\":[\"**/*.es6.ts\"]}\n",
	)
	writeNormalizedTestFile(
		t,
		es6ConfigPath,
		"{\"compilerOptions\":{\"module\":\"commonjs\",\"baseUrl\":\"./src\",\"target\":\"es6\"},\"include\":[\"**/*.es6.ts\"]}\n",
	)
	writeNormalizedTestFile(
		t,
		packageJSONPath,
		"{\"devDependencies\":{\"@types/node\":\"18.14.6\"}}\n",
	)
	writeNormalizedTestFile(t, libPath, "export const CONSTANT = \"42\";\n")
	writeNormalizedTestFile(
		t,
		mainPath,
		"import { CONSTANT } from './lib';\n\nfunction foo(value: string, logger: (flag: boolean) => void) {\n  logger(value < CONSTANT);\n}\n\nfoo('ES3', flag => console.log(flag ? 'FAILURE' : 'SUCCESS'));\n",
	)
	writeNormalizedTestFile(
		t,
		mainES6Path,
		"import { CONSTANT } from 'lib';\n\nfunction foo(value: string, logger: (flag: boolean) => void) {\n  logger(value < CONSTANT);\n}\n\nfoo('ES6', flag => console.log(flag ? 'FAILURE' : 'SUCCESS'));\n",
	)

	input := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir:       baseDir,
			TsConfigPaths: []string{rootConfigPath, es6ConfigPath},
		},
		Files: map[string]*pb.ProjectFileInput{
			libPath:     {FileType: pb.FileType_FILE_TYPE_MAIN},
			mainPath:    {FileType: pb.FileType_FILE_TYPE_MAIN},
			mainES6Path: {FileType: pb.FileType_FILE_TYPE_MAIN},
		},
		Rules: []*pb.JsTsRule{{Key: "S3003"}},
	})

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[mainPath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for %s, got %#v", mainPath, results[mainPath].GetIssues())
	}
	if len(results[mainES6Path].GetIssues()) != 1 {
		t.Fatalf("expected one issue for %s, got %#v", mainES6Path, results[mainES6Path].GetIssues())
	}
}

func TestAnalyzeProjectBatchWithExplicitFilesSupportsSharedBaseLegacyBaseURL(t *testing.T) {
	t.Parallel()

	baseDir := tspath.NormalizePath(t.TempDir())
	sourceDir := tspath.CombinePaths(baseDir, "src")
	packageJSONPath := tspath.CombinePaths(baseDir, "package.json")
	baseConfigPath := tspath.CombinePaths(baseDir, "tsconfig.base.json")
	tsconfigPath := tspath.CombinePaths(baseDir, "tsconfig.json")
	mainPath := tspath.CombinePaths(sourceDir, "main.ts")
	libPath := tspath.CombinePaths(sourceDir, "lib.ts")

	writeNormalizedTestFile(
		t,
		baseConfigPath,
		"{\"compilerOptions\":{\"module\":\"commonjs\",\"baseUrl\":\"./src\"}}\n",
	)
	writeNormalizedTestFile(
		t,
		tsconfigPath,
		"{\"extends\":\"./tsconfig.base.json\",\"include\":[\"**/*.ts\"]}\n",
	)
	writeNormalizedTestFile(
		t,
		packageJSONPath,
		"{\"devDependencies\":{\"@types/node\":\"18.14.6\"}}\n",
	)
	writeNormalizedTestFile(t, libPath, "export const CONSTANT = \"42\";\n")
	writeNormalizedTestFile(
		t,
		mainPath,
		"import { CONSTANT } from 'lib';\n\nfunction foo(value: string) {\n  return value < CONSTANT;\n}\n\nconsole.log(foo('10') ? 'SUCCESS' : 'FAILURE');\n",
	)

	input := mustNormalizeAnalyzeProjectRequest(t, &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{BaseDir: baseDir},
		Files: map[string]*pb.ProjectFileInput{
			libPath:  {FileType: pb.FileType_FILE_TYPE_MAIN},
			mainPath: {FileType: pb.FileType_FILE_TYPE_MAIN},
		},
		Rules: []*pb.JsTsRule{{Key: "S3003"}},
	})

	results, meta := analyzeProject(input)
	if len(meta.GetWarnings()) != 0 {
		t.Fatalf("expected no warnings, got %#v", meta.GetWarnings())
	}
	if len(results[mainPath].GetIssues()) != 1 {
		t.Fatalf("expected one issue for shared-base main file, got %#v", results[mainPath].GetIssues())
	}
}

func TestCreateInferredProgramSkipsAncestorNodeModulesWhenRequested(t *testing.T) {
	rootDir := tspath.NormalizePath(t.TempDir())
	baseDir := tspath.CombinePaths(rootDir, "project")
	sourceFile := tspath.CombinePaths(baseDir, "src", "main.ts")
	dependencyFile := tspath.CombinePaths(rootDir, "node_modules", "foo", "index.d.ts")

	writeNormalizedTestFile(t, sourceFile, "import { answer } from \"foo\";\nconst value: number = answer;\n")
	writeNormalizedTestFile(t, dependencyFile, "export declare const answer: number;\n")

	baseConfig := NormalizedProjectConfiguration{BaseDir: baseDir}
	options := buildInferredCompilerOptions(baseConfig, nil, "")
	options.Target = core.ScriptTargetES2020
	options.Module = core.ModuleKindNodeNext
	options.ModuleResolution = core.ModuleResolutionKindNodeNext

	program, err := createInferredProgram(
		baseConfig,
		[]string{sourceFile},
		options.Clone(),
		BuildAnalyzeProjectFS(&NormalizedAnalyzeProjectInput{Config: baseConfig}),
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected inferred program creation without the skip flag to succeed, got %v", err)
	}
	if program == nil {
		t.Fatal("expected inferred program creation without the skip flag to produce a program")
	}
	if program.GetSourceFile(dependencyFile) == nil {
		t.Fatalf("expected inferred program to resolve ancestor dependency %s", dependencyFile)
	}
	source := program.GetSourceFile(sourceFile)
	if source == nil {
		t.Fatalf("expected inferred program to include %s", sourceFile)
	}
	if hasSemanticDiagnosticContaining(program, source, "Cannot find module 'foo'") {
		t.Fatal("expected inferred program creation without the skip flag to resolve the dependency")
	}

	skipConfig := baseConfig
	skipConfig.SkipNodeModuleLookupOutsideBaseDir = testBoolPtr(true)
	program, err = createInferredProgram(
		skipConfig,
		[]string{sourceFile},
		options.Clone(),
		BuildAnalyzeProjectFS(&NormalizedAnalyzeProjectInput{Config: skipConfig}),
		func(d diagnostic.Internal) {},
	)
	if err != nil {
		t.Fatalf("expected inferred program creation with the skip flag to complete, got %v", err)
	}
	if program == nil {
		t.Fatal("expected inferred program creation with the skip flag to still return a program")
	}
	if program.GetSourceFile(dependencyFile) != nil {
		t.Fatalf("expected inferred program to stop resolving ancestor dependency %s", dependencyFile)
	}
	source = program.GetSourceFile(sourceFile)
	if source == nil {
		t.Fatalf("expected inferred program to include %s", sourceFile)
	}
}

func createTestAnalyzeProjectRequest(t *testing.T) *pb.AnalyzeProjectRequest {
	t.Helper()

	baseDir := t.TempDir()
	content := "const answer: number = 42;\n"
	return &pb.AnalyzeProjectRequest{
		Configuration: &pb.ProjectConfiguration{
			BaseDir: baseDir,
		},
		Files: map[string]*pb.ProjectFileInput{
			"src/main.ts": {
				FileContent: &content,
				FileType:    pb.FileType_FILE_TYPE_MAIN,
			},
		},
	}
}

func createProjectAnalysisRun(filePaths []string, cancelled bool) projectAnalysisRun {
	results := make(map[string]*pb.ProjectAnalysisFileResult, len(filePaths))
	for _, filePath := range filePaths {
		results[filePath] = &pb.ProjectAnalysisFileResult{}
	}
	return projectAnalysisRun{
		orderedFiles: append([]string(nil), filePaths...),
		results:      results,
		meta:         &pb.ProjectAnalysisMeta{},
		cancelled:    cancelled,
	}
}

func waitForSignal(t *testing.T, ch <-chan struct{}, label string) {
	t.Helper()

	select {
	case <-ch:
	case <-time.After(testTimeout):
		t.Fatalf("timed out waiting for %s", label)
	}
}

func waitForError(t *testing.T, ch <-chan error, label string) error {
	t.Helper()

	select {
	case err := <-ch:
		return err
	case <-time.After(testTimeout):
		t.Fatalf("timed out waiting for %s", label)
		return nil
	}
}

func testBoolPtr(value bool) *bool {
	return &value
}

func configuredProgramForTest(
	config NormalizedProjectConfiguration,
	tsconfigPath string,
) (*compiler.Program, []string, error) {
	messages := []string{}
	program, err := createConfiguredProgram(
		config,
		tsconfigPath,
		"",
		BuildAnalyzeProjectFS(&NormalizedAnalyzeProjectInput{Config: config}),
		func(d diagnostic.Internal) {
			messages = append(messages, d.Help)
		},
	)
	return program, messages, err
}

func containsSubstring(values []string, target string) bool {
	for _, value := range values {
		if strings.Contains(value, target) {
			return true
		}
	}
	return false
}

func TestCreateConfiguredProgramSupportsFixtureOutDirWithoutExplicitRootDir(t *testing.T) {
	t.Parallel()

	testCases := []string{
		"multiple-targets",
		"shared-base",
	}

	for _, project := range testCases {
		t.Run(project, func(t *testing.T) {
			t.Parallel()

			baseDir, err := filepath.Abs("../../its/plugin/projects/typechecker-config/" + project)
			if err != nil {
				t.Fatalf("failed to resolve %s fixture path: %v", project, err)
			}
			baseDir = tspath.NormalizePath(baseDir)

			program, diagnostics, err := configuredProgramForTest(
				NormalizedProjectConfiguration{BaseDir: baseDir},
				tspath.CombinePaths(baseDir, "tsconfig.json"),
			)
			if err != nil {
				t.Fatalf("expected fixture %s configured program creation to succeed, got %v", project, err)
			}
			if len(diagnostics) != 0 {
				t.Fatalf("expected no diagnostics for fixture %s, got %#v", project, diagnostics)
			}
			if program == nil {
				t.Fatalf("expected fixture %s configured program", project)
			}
		})
	}
}

func hasSemanticDiagnosticContaining(program *compiler.Program, sourceFile *ast.SourceFile, target string) bool {
	return containsSubstring(semanticDiagnosticMessages(program, sourceFile), target)
}

func diagnosticMessages(diagnostics []*ast.Diagnostic) []string {
	messages := make([]string, 0, len(diagnostics))
	for _, diagnostic := range diagnostics {
		messages = append(messages, utils.GetDiagnosticMessage(diagnostic))
	}
	return messages
}

func semanticDiagnosticMessages(program *compiler.Program, sourceFile *ast.SourceFile) []string {
	if program == nil || sourceFile == nil {
		return nil
	}
	return diagnosticMessages(compiler.Program_GetSemanticDiagnostics(program, context.Background(), sourceFile))
}

func writeNormalizedTestFile(t *testing.T, normalizedPath string, content string) {
	t.Helper()

	nativePath := filepath.FromSlash(normalizedPath)
	if err := os.MkdirAll(filepath.Dir(nativePath), 0o755); err != nil {
		t.Fatalf("failed to create %s: %v", normalizedPath, err)
	}
	if err := os.WriteFile(nativePath, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write %s: %v", normalizedPath, err)
	}
}
