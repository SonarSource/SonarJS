package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"path"
	"strconv"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/linter"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/parser"
	"github.com/microsoft/typescript-go/shim/tsoptions"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
)

type fileRuleCacheKey struct {
	FilePath            string
	DetectedEcmaVersion int
}

type compilerOptionsGroup struct {
	filePaths       []string
	compilerOptions *core.CompilerOptions
}

func (s *analyzerService) AnalyzeProject(
	req *pb.AnalyzeProjectRequest,
	stream pb.AnalyzeProjectService_AnalyzeProjectServer,
) error {
	analysis, err := s.beginAnalysis(stream.Context())
	if err != nil {
		return err
	}
	defer s.finishAnalysis(analysis)

	input, err := NormalizeAnalyzeProjectRequest(req)
	if err != nil {
		return err
	}

	run := s.analyze(analysis.ctx, input)
	if err := grpcCallCancelled(stream.Context()); err != nil {
		return err
	}

	for _, filePath := range run.orderedFiles {
		if err := stream.Send(&pb.AnalyzeProjectStreamResponse{
			Message: &pb.AnalyzeProjectStreamResponse_FileResult{
				FileResult: &pb.FileResultMessage{
					FilePath: filePath,
					Result:   run.results[filePath],
				},
			},
		}); err != nil {
			return err
		}
	}

	if run.cancelled {
		return stream.Send(&pb.AnalyzeProjectStreamResponse{
			Message: &pb.AnalyzeProjectStreamResponse_Cancelled{
				Cancelled: &emptypb.Empty{},
			},
		})
	}

	return stream.Send(&pb.AnalyzeProjectStreamResponse{
		Message: &pb.AnalyzeProjectStreamResponse_Meta{
			Meta: run.meta,
		},
	})
}

func (s *analyzerService) AnalyzeProjectUnary(
	ctx context.Context,
	req *pb.AnalyzeProjectRequest,
) (*pb.AnalyzeProjectUnaryResponse, error) {
	analysis, err := s.beginAnalysis(ctx)
	if err != nil {
		return nil, err
	}
	defer s.finishAnalysis(analysis)

	input, err := NormalizeAnalyzeProjectRequest(req)
	if err != nil {
		return nil, err
	}

	run := s.analyze(analysis.ctx, input)
	if err := grpcCallCancelled(ctx); err != nil {
		return nil, err
	}

	return &pb.AnalyzeProjectUnaryResponse{
		Files: run.results,
		Meta:  run.meta,
	}, nil
}

func (s *analyzerService) CancelAnalysis(
	ctx context.Context,
	req *pb.CancelAnalysisRequest,
) (*pb.CancelAnalysisResponse, error) {
	return &pb.CancelAnalysisResponse{Cancelled: s.cancelActiveAnalysis()}, nil
}

func (s *analyzerService) Lease(stream pb.AnalyzeProjectService_LeaseServer) error {
	leaseID, err := s.beginLease()
	if err != nil {
		return err
	}

	for {
		_, err := stream.Recv()
		if err == io.EOF {
			s.releaseLease(leaseID, "lease completed")
			return nil
		}
		if err != nil {
			if stream.Context().Err() != nil || status.Code(err) == codes.Canceled {
				s.releaseLease(leaseID, "lease cancelled")
				return nil
			}
			s.releaseLease(leaseID, "lease error")
			return err
		}
	}
}

func (s *analyzerService) runProjectAnalysis(
	ctx context.Context,
	input *NormalizedAnalyzeProjectInput,
) projectAnalysisRun {
	return runProjectAnalysisWithState(ctx, input, s.sonarlintState)
}

func runProjectAnalysisWithState(
	ctx context.Context,
	input *NormalizedAnalyzeProjectInput,
	state *sonarlintState,
) projectAnalysisRun {
	fsys := BuildAnalyzeProjectFS(input)
	stores, storeErr := projectStoresForAnalysis(input, fsys, state)

	analysisFiles, orderedFiles := analysisTargetFiles(input, stores)
	results := make(map[string]*pb.ProjectAnalysisFileResult, len(orderedFiles))
	for _, filePath := range orderedFiles {
		results[filePath] = &pb.ProjectAnalysisFileResult{}
	}

	warnings := []string{}
	if storeErr != nil {
		warnings = append(warnings, fmt.Sprintf("jsts-go project discovery error: %v", storeErr))
		return projectAnalysisRun{
			orderedFiles: orderedFiles,
			results:      results,
			meta:         &pb.ProjectAnalysisMeta{Warnings: warnings},
		}
	}
	warnings = append(warnings, stores.Warnings...)
	if err := checkAnalysisCancelled(ctx); err != nil {
		return projectAnalysisRun{
			orderedFiles: orderedFiles,
			results:      results,
			meta:         &pb.ProjectAnalysisMeta{Warnings: warnings},
			cancelled:    true,
		}
	}

	requestedRules := input.RequestedRules
	if len(orderedFiles) == 0 || len(requestedRules) == 0 {
		return projectAnalysisRun{
			orderedFiles: orderedFiles,
			results:      results,
			meta:         &pb.ProjectAnalysisMeta{Warnings: warnings},
		}
	}

	filePaths := jsTsAnalysisTargets(orderedFiles, input.Config)
	if len(filePaths) == 0 {
		return projectAnalysisRun{
			orderedFiles: orderedFiles,
			results:      results,
			meta:         &pb.ProjectAnalysisMeta{Warnings: warnings},
		}
	}

	baseDir := input.Config.BaseDir
	log.Printf(
		"AnalyzeProject: baseDir=%s, files=%d, jsTsFiles=%d, rules=%d, tsconfigs=%d, disableTypeChecking=%t",
		baseDir,
		len(orderedFiles),
		len(filePaths),
		len(requestedRules),
		len(stores.tsConfigs()),
		boolValue(input.Config.DisableTypeChecking, false),
	)

	configuredRules := configuredRulesFor(requestedRules)
	requestedJsTsRules := requestedJsTsRulesByKey(input.Rules)
	rulesByFile := make(map[fileRuleCacheKey][]linter.ConfiguredRule, len(filePaths))
	activationSignalsByFile := make(map[string]ruleActivationSignals, len(filePaths))
	diagnosticsByFile := make(map[string][]*pb.Issue, len(filePaths))

	logLevel := utils.GetLogLevel()

	onRuleDiagnostic := func(d rule.RuleDiagnostic) {
		issue := ConvertDiagnostic(d)
		diagnosticsByFile[issue.GetFilePath()] = append(diagnosticsByFile[issue.GetFilePath()], issue)
	}
	onInternalDiagnostic := func(d diagnostic.Internal) {
		if d.FilePath != nil {
			log.Printf("Internal diagnostic in %s: %s", *d.FilePath, d.Description)
		} else {
			log.Printf("Internal diagnostic: %s", d.Description)
		}
	}
	rulesForFile := func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule {
		cacheKey := fileRuleCacheKey{
			FilePath:            filePath,
			DetectedEcmaVersion: detectedEcmaVersion,
		}
		if rules, ok := rulesByFile[cacheKey]; ok {
			return rules
		}

		file := analysisFiles[filePath]
		if file.CanonicalPath == "" {
			file = NormalizedProjectFile{CanonicalPath: filePath}
		}
		signals, ok := activationSignalsByFile[filePath]
		if !ok {
			signals = stores.activationSignalsForFile(file.CanonicalPath)
			activationSignalsByFile[filePath] = signals
		}
		signals.DetectedEcmaVersion = detectedEcmaVersion

		rules := configuredRulesForFile(configuredRules, requestedJsTsRules, input.Config, file, signals)
		rulesByFile[cacheKey] = rules
		return rules
	}

	var analysisErr error
	if boolValue(input.Config.DisableTypeChecking, false) {
		log.Printf(
			"Type checking is disabled; analyzing %d JS/TS file(s) without a TypeScript program",
			len(filePaths),
		)
		analysisErr = analyzeSourceFilesWithoutProgram(
			ctx,
			logLevel,
			input.Config,
			analysisTargetFilesMap(input, stores),
			filePaths,
			fsys,
			rulesForFile,
			onRuleDiagnostic,
			onInternalDiagnostic,
		)
	} else if boolValue(input.Config.SonarLint, false) {
		analysisErr = analyzeIncrementalPrograms(
			ctx,
			logLevel,
			input,
			stores,
			fsys,
			filePaths,
			state,
			rulesForFile,
			onRuleDiagnostic,
			onInternalDiagnostic,
		)
	} else {
		analysisErr = analyzeBatchPrograms(
			ctx,
			logLevel,
			input,
			stores,
			fsys,
			filePaths,
			rulesForFile,
			onRuleDiagnostic,
			onInternalDiagnostic,
		)
	}
	analysisCancelled := errors.Is(analysisErr, errAnalysisCancelled)
	if analysisErr != nil && !analysisCancelled {
		log.Printf("Linter error: %v", analysisErr)
		warnings = append(warnings, fmt.Sprintf("jsts-go linter error: %v", analysisErr))
	}

	for _, filePath := range orderedFiles {
		results[filePath] = &pb.ProjectAnalysisFileResult{
			Issues: diagnosticsByFile[filePath],
		}
	}

	return projectAnalysisRun{
		orderedFiles: orderedFiles,
		results:      results,
		meta:         &pb.ProjectAnalysisMeta{Warnings: warnings},
		cancelled:    analysisCancelled,
	}
}

func analyzeProject(
	input *NormalizedAnalyzeProjectInput,
) (map[string]*pb.ProjectAnalysisFileResult, *pb.ProjectAnalysisMeta) {
	run := runProjectAnalysisWithState(context.Background(), input, nil)
	return run.results, run.meta
}

func analysisTargetFiles(
	input *NormalizedAnalyzeProjectInput,
	stores *projectFileStores,
) (map[string]NormalizedProjectFile, []string) {
	if len(input.OrderedFiles) > 0 {
		return input.Files, input.OrderedFiles
	}
	if stores == nil {
		return map[string]NormalizedProjectFile{}, nil
	}
	return stores.SourceFiles, stores.OrderedSourceFiles
}

func analysisTargetFilesMap(
	input *NormalizedAnalyzeProjectInput,
	stores *projectFileStores,
) map[string]NormalizedProjectFile {
	files, _ := analysisTargetFiles(input, stores)
	return files
}

func jsTsAnalysisTargets(filePaths []string, config NormalizedProjectConfiguration) []string {
	filters := newAnalyzeProjectFilters(config)
	filtered := make([]string, 0, len(filePaths))
	for _, filePath := range filePaths {
		if filters.isJsTsFile(filePath) {
			filtered = append(filtered, filePath)
		}
	}
	return filtered
}

func configuredRulesFor(requestedRules map[string]requestedRuleConfig) []linter.ConfiguredRule {
	rules := make([]linter.ConfiguredRule, 0, len(requestedRules))
	for _, availableRule := range allRules {
		requestedRuleConfig, ok := requestedRules[availableRule.Name]
		if !ok {
			continue
		}
		capturedRule := availableRule
		ruleOptions := requestedRuleConfig.Options
		rules = append(rules, linter.ConfiguredRule{
			Name: capturedRule.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return capturedRule.Run(ctx, ruleOptions)
			},
		})
	}
	return rules
}

func analyzeBatchPrograms(
	ctx context.Context,
	logLevel utils.LogLevel,
	input *NormalizedAnalyzeProjectInput,
	stores *projectFileStores,
	fsys vfs.FS,
	filePaths []string,
	rulesForFile func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule,
	onRuleDiagnostic func(d rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
) error {
	pending := make(map[string]struct{}, len(filePaths))
	for _, filePath := range filePaths {
		pending[filePath] = struct{}{}
	}
	foundOptions := newCompilerOptionsAccumulator()

	if err := checkAnalysisCancelled(ctx); err != nil {
		return err
	}

	for tsconfigIndex := 0; tsconfigIndex < len(stores.tsConfigs()); tsconfigIndex++ {
		if err := checkAnalysisCancelled(ctx); err != nil {
			return err
		}
		if len(pending) == 0 {
			break
		}

		tsconfig := stores.tsConfigs()[tsconfigIndex]
		program, analyzed, err := analyzeConfiguredProgramFiles(
			ctx,
			logLevel,
			input.Config,
			stores,
			tsconfig,
			orderedPendingFiles(filePaths, pending),
			fsys,
			rulesForFile,
			onRuleDiagnostic,
			onInternalDiagnostic,
		)
		if err != nil {
			return err
		}
		if program != nil {
			foundOptions.add(configuredProgramOptionsForOrphans(program, tsconfig, fsys))
		}
		addConfiguredProjectReferences(tsconfig, stores, fsys)
		for _, filePath := range analyzed {
			delete(pending, filePath)
		}
	}

	orphans := orderedPendingFiles(filePaths, pending)
	if len(orphans) == 0 {
		return checkAnalysisCancelled(ctx)
	}

	unmatchedOrphans := orphans
	if boolValue(input.Config.CreateTSProgramForOrphanFiles, defaultCreateTSProgramForOrphanFiles) {
		unmatchedOrphans = nil
		mergedOptions := foundOptions.merged()
		for _, group := range groupFilePathsByCompilerOptions(orphans, func(filePath string) *core.CompilerOptions {
			return buildInferredCompilerOptions(input.Config, mergedOptions, stores.nodeVersionSignalForPath(filePath))
		}) {
			analyzed, err := analyzeInferredProgramFiles(
				ctx,
				logLevel,
				input.Config,
				input.Config.BaseDir,
				group.filePaths,
				group.compilerOptions,
				fsys,
				rulesForFile,
				onRuleDiagnostic,
				onInternalDiagnostic,
			)
			if err != nil {
				return err
			}
			unmatchedOrphans = append(unmatchedOrphans, unmatchedFilePaths(group.filePaths, analyzed)...)
		}
	} else {
		log.Printf("Skipping TypeScript program creation for %d orphan file(s)", len(orphans))
	}

	if len(unmatchedOrphans) == 0 {
		return checkAnalysisCancelled(ctx)
	}

	return analyzeSourceFilesWithoutProgram(
		ctx,
		logLevel,
		input.Config,
		analysisTargetFilesMap(input, stores),
		unmatchedOrphans,
		fsys,
		rulesForFile,
		onRuleDiagnostic,
		onInternalDiagnostic,
	)
}

func analyzeIncrementalPrograms(
	ctx context.Context,
	logLevel utils.LogLevel,
	input *NormalizedAnalyzeProjectInput,
	stores *projectFileStores,
	fsys vfs.FS,
	filePaths []string,
	state *sonarlintState,
	rulesForFile func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule,
	onRuleDiagnostic func(d rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
) error {
	programCache := make(map[string]*compiler.Program)
	foundOptions := newCompilerOptionsAccumulator()
	orphanFiles := make([]string, 0)

	for _, filePath := range filePaths {
		if err := checkAnalysisCancelled(ctx); err != nil {
			return err
		}

		program, err := incrementalProgramForFile(
			ctx,
			input.Config,
			filePath,
			stores,
			fsys,
			programCache,
			foundOptions,
			state,
			onInternalDiagnostic,
		)
		if err != nil {
			return err
		}
		if program != nil {
			sourceFile := program.GetSourceFile(filePath)
			if sourceFile != nil {
				if err := lintSourceFiles(
					ctx,
					logLevel,
					input.Config,
					program,
					[]*ast.SourceFile{sourceFile},
					rulesForFile,
					onRuleDiagnostic,
					onInternalDiagnostic,
				); err != nil {
					return err
				}
				continue
			}
		}

		orphanFiles = append(orphanFiles, filePath)
	}

	if len(orphanFiles) == 0 {
		return checkAnalysisCancelled(ctx)
	}

	fallbackFiles := append([]string(nil), orphanFiles...)
	if boolValue(input.Config.CreateTSProgramForOrphanFiles, defaultCreateTSProgramForOrphanFiles) {
		fallbackFiles = nil
		mergedOptions := foundOptions.merged()
		for _, group := range groupFilePathsByCompilerOptions(orphanFiles, func(filePath string) *core.CompilerOptions {
			return buildInferredCompilerOptions(input.Config, mergedOptions, stores.nodeVersionSignalForPath(filePath))
		}) {
			program, _, err := inferredProgramForFile(
				group.filePaths[0],
				group.filePaths,
				input.Config.BaseDir,
				fsys,
				nil,
				nil,
				group.compilerOptions,
				state,
				onInternalDiagnostic,
			)
			if err != nil {
				return err
			}
			if program == nil {
				fallbackFiles = append(fallbackFiles, group.filePaths...)
				continue
			}

			sourceFiles, matchedPaths := programSourceFilesMatchingPaths(program, group.filePaths)
			if len(sourceFiles) > 0 {
				if err := lintSourceFiles(
					ctx,
					logLevel,
					input.Config,
					program,
					sourceFiles,
					rulesForFile,
					onRuleDiagnostic,
					onInternalDiagnostic,
				); err != nil {
					return err
				}
			}

			fallbackFiles = append(fallbackFiles, unmatchedFilePaths(group.filePaths, matchedPaths)...)
		}
	}

	if len(fallbackFiles) == 0 {
		return checkAnalysisCancelled(ctx)
	}

	return analyzeSourceFilesWithoutProgram(
		ctx,
		logLevel,
		input.Config,
		analysisTargetFilesMap(input, stores),
		fallbackFiles,
		fsys,
		rulesForFile,
		onRuleDiagnostic,
		onInternalDiagnostic,
	)
}

func analyzeConfiguredProgramFiles(
	ctx context.Context,
	logLevel utils.LogLevel,
	analysisConfig NormalizedProjectConfiguration,
	stores *projectFileStores,
	configFileName string,
	filePaths []string,
	fsys vfs.FS,
	rulesForFile func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule,
	onRuleDiagnostic func(d rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
) (*compiler.Program, []string, error) {
	if err := checkAnalysisCancelled(ctx); err != nil {
		return nil, nil, err
	}

	program, err := createConfiguredProgram(
		analysisConfig,
		configFileName,
		stores.nodeVersionSignalForDir(tspath.GetDirectoryPath(configFileName)),
		fsys,
		onInternalDiagnostic,
	)
	if err != nil {
		return nil, nil, err
	}
	if program == nil {
		return nil, nil, nil
	}

	sourceFiles, matchedPaths := programSourceFilesMatchingPaths(program, filePaths)
	if len(matchedPaths) == 0 {
		return program, nil, nil
	}

	if err := lintSourceFiles(ctx, logLevel, analysisConfig, program, sourceFiles, rulesForFile, onRuleDiagnostic, onInternalDiagnostic); err != nil {
		return nil, nil, err
	}
	return program, matchedPaths, nil
}

func analyzeInferredProgramFiles(
	ctx context.Context,
	logLevel utils.LogLevel,
	analysisConfig NormalizedProjectConfiguration,
	baseDir string,
	filePaths []string,
	compilerOptions *core.CompilerOptions,
	fsys vfs.FS,
	rulesForFile func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule,
	onRuleDiagnostic func(d rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
) ([]string, error) {
	if err := checkAnalysisCancelled(ctx); err != nil {
		return nil, err
	}

	program, err := createInferredProgram(baseDir, filePaths, compilerOptions, fsys, onInternalDiagnostic)
	if err != nil {
		return nil, err
	}
	if program == nil {
		return nil, nil
	}

	sourceFiles, matchedPaths := programSourceFilesMatchingPaths(program, filePaths)
	if len(matchedPaths) == 0 {
		return nil, nil
	}

	if err := lintSourceFiles(ctx, logLevel, analysisConfig, program, sourceFiles, rulesForFile, onRuleDiagnostic, onInternalDiagnostic); err != nil {
		return nil, err
	}
	return matchedPaths, nil
}

func createConfiguredProgram(
	analysisConfig NormalizedProjectConfiguration,
	configFileName string,
	nodeVersionSignal string,
	fsys vfs.FS,
	onInternalDiagnostic func(d diagnostic.Internal),
) (*compiler.Program, error) {
	currentDirectory := tspath.GetDirectoryPath(configFileName)
	host := utils.NewCachedFSCompilerHost(currentDirectory, fsys, bundled.LibPath(), nil, nil)

	program, diagnostics, err := utils.CreateProgram(
		false,
		fsys,
		currentDirectory,
		configFileName,
		host,
		false,
		func(config *tsoptions.ParsedCommandLine) {
			options := config.CompilerOptions()
			if options == nil || len(options.Lib) > 0 {
				return
			}
			options.Lib = computedLibFiles(nil, options.Target, nodeVersionSignal)
		},
	)
	if err != nil {
		return nil, err
	}

	for _, internalDiagnostic := range diagnostics {
		onInternalDiagnostic(internalDiagnostic)
	}
	if program == nil {
		return nil, nil
	}
	return program, nil
}

func createInferredProgram(
	baseDir string,
	filePaths []string,
	compilerOptions *core.CompilerOptions,
	fsys vfs.FS,
	onInternalDiagnostic func(d diagnostic.Internal),
) (*compiler.Program, error) {
	if len(filePaths) == 0 {
		return nil, nil
	}

	host := utils.NewCachedFSCompilerHost(baseDir, fsys, bundled.LibPath(), nil, nil)
	program, diagnostics, err := utils.CreateInferredProjectProgram(false, fsys, baseDir, host, filePaths, compilerOptions)
	if err != nil {
		return nil, err
	}

	for _, internalDiagnostic := range diagnostics {
		onInternalDiagnostic(internalDiagnostic)
	}
	if program == nil {
		return nil, nil
	}
	return program, nil
}

func reuseConfiguredProgramForFile(
	filePath string,
	analysisConfig NormalizedProjectConfiguration,
	tsconfig string,
	nodeVersionSignal string,
	program *compiler.Program,
	fsys vfs.FS,
	onInternalDiagnostic func(d diagnostic.Internal),
) (*compiler.Program, error) {
	if program == nil {
		return nil, nil
	}

	sourceFile := program.GetSourceFile(filePath)
	if sourceFile == nil {
		return createConfiguredProgram(analysisConfig, tsconfig, nodeVersionSignal, fsys, onInternalDiagnostic)
	}

	currentText, ok := fsys.ReadFile(filePath)
	if !ok || sourceFile.Text() == currentText {
		return program, nil
	}

	currentDirectory := tspath.GetDirectoryPath(tsconfig)
	host := utils.NewCachedFSCompilerHost(currentDirectory, fsys, bundled.LibPath(), nil, nil)
	updated, reused := program.UpdateProgram(sourceFile.Path(), host)
	if reused {
		return updated, nil
	}

	return createConfiguredProgram(analysisConfig, tsconfig, nodeVersionSignal, fsys, onInternalDiagnostic)
}

func addConfiguredProjectReferences(
	tsconfig string,
	stores *projectFileStores,
	fsys vfs.FS,
) {
	if stores == nil {
		return
	}

	currentDirectory := tspath.GetDirectoryPath(tsconfig)
	host := utils.NewCachedFSCompilerHost(currentDirectory, fsys, bundled.LibPath(), nil, nil)
	config, diagnostics := tsoptions.GetParsedCommandLineOfConfigFile(
		tsconfig,
		&core.CompilerOptions{},
		nil,
		host,
		nil,
	)
	if len(diagnostics) > 0 || config == nil {
		return
	}

	for _, reference := range config.ResolvedProjectReferencePaths() {
		if normalized := tspath.NormalizePath(reference); normalized != "" {
			stores.addDiscoveredTSConfig(normalized)
		}
	}
}

func configuredProgramOptionsForOrphans(
	program *compiler.Program,
	tsconfig string,
	fsys vfs.FS,
) *core.CompilerOptions {
	options := cloneCompilerOptions(program.Options())
	if options == nil {
		return nil
	}
	if configuredProgramHasExplicitLib(tsconfig, fsys) {
		return options
	}
	options.Lib = nil
	return options
}

func configuredProgramHasExplicitLib(tsconfig string, fsys vfs.FS) bool {
	currentDirectory := tspath.GetDirectoryPath(tsconfig)
	host := utils.NewCachedFSCompilerHost(currentDirectory, fsys, bundled.LibPath(), nil, nil)
	config, diagnostics := tsoptions.GetParsedCommandLineOfConfigFile(
		tsconfig,
		&core.CompilerOptions{},
		nil,
		host,
		nil,
	)
	if len(diagnostics) > 0 || config == nil {
		return false
	}
	return len(config.CompilerOptions().Lib) > 0
}

func inferredProgramForFile(
	filePath string,
	allFilePaths []string,
	baseDir string,
	fsys vfs.FS,
	program *compiler.Program,
	programOptions *core.CompilerOptions,
	compilerOptions *core.CompilerOptions,
	state *sonarlintState,
	onInternalDiagnostic func(d diagnostic.Internal),
) (*compiler.Program, *core.CompilerOptions, error) {
	if program == nil && state != nil {
		program, programOptions = state.getOrphanProgramForFile(filePath, compilerOptions)
	}

	if program != nil && !compilerOptionsEqual(programOptions, compilerOptions) {
		program = nil
		programOptions = nil
	}

	if program != nil {
		sourceFile := program.GetSourceFile(filePath)
		if sourceFile == nil {
			program = nil
			programOptions = nil
		} else if currentText, ok := fsys.ReadFile(filePath); ok && sourceFile.Text() != currentText {
			host := utils.NewCachedFSCompilerHost(baseDir, fsys, bundled.LibPath(), nil, nil)
			updated, reused := program.UpdateProgram(sourceFile.Path(), host)
			if reused {
				program = updated
			} else {
				program = nil
				programOptions = nil
			}
		}
	}

	if program == nil {
		var err error
		program, err = createInferredProgram(baseDir, allFilePaths, compilerOptions, fsys, onInternalDiagnostic)
		if err != nil {
			return nil, nil, err
		}
		programOptions = cloneCompilerOptions(compilerOptions)
	}

	if state != nil && program != nil {
		state.setOrphanProgram(program, programOptions)
	}
	return program, programOptions, nil
}

func lintSourceFiles(
	ctx context.Context,
	logLevel utils.LogLevel,
	analysisConfig NormalizedProjectConfiguration,
	program *compiler.Program,
	sourceFiles []*ast.SourceFile,
	rulesForFile func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule,
	onRuleDiagnostic func(d rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
) error {
	detectedEcmaVersion := detectedEcmaVersionForProgram(program, analysisConfig)
	for _, sourceFile := range sourceFiles {
		if err := checkAnalysisCancelled(ctx); err != nil {
			return err
		}

		rules := rulesForFile(sourceFile.FileName(), detectedEcmaVersion)
		if len(rules) == 0 {
			continue
		}

		if err := linter.RunLinterOnFile(
			logLevel,
			program,
			sourceFile,
			rules,
			onRuleDiagnostic,
			onInternalDiagnostic,
			linter.Fixes{},
			linter.TypeErrors{},
		); err != nil {
			return err
		}
	}
	return nil
}

func analyzeSourceFilesWithoutProgram(
	ctx context.Context,
	logLevel utils.LogLevel,
	analysisConfig NormalizedProjectConfiguration,
	analysisFiles map[string]NormalizedProjectFile,
	filePaths []string,
	fsys vfs.FS,
	rulesForFile func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule,
	onRuleDiagnostic func(d rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
) error {
	detectedEcmaVersion := detectedEcmaVersionForProgram(nil, analysisConfig)
	for _, filePath := range filePaths {
		if err := checkAnalysisCancelled(ctx); err != nil {
			return err
		}

		rules := runnableWithoutProgramRules(rulesForFile(filePath, detectedEcmaVersion))
		if len(rules) == 0 {
			continue
		}

		file := analysisFiles[filePath]
		if file.CanonicalPath == "" {
			file = NormalizedProjectFile{CanonicalPath: filePath}
		}

		sourceFile, err := parseSourceFileWithoutProgram(file, fsys)
		if err != nil {
			log.Printf("Skipping AST-only analysis for %s: %v", filePath, err)
			continue
		}

		log.Printf("Analyzing %s without a TypeScript program", filePath)
		if err := linter.RunLinterOnFile(
			logLevel,
			nil,
			sourceFile,
			rules,
			onRuleDiagnostic,
			onInternalDiagnostic,
			linter.Fixes{},
			linter.TypeErrors{},
		); err != nil {
			return err
		}
	}
	return nil
}

func parseSourceFileWithoutProgram(file NormalizedProjectFile, fsys vfs.FS) (*ast.SourceFile, error) {
	sourceText, ok := fsys.ReadFile(file.CanonicalPath)
	if !ok {
		return nil, fmt.Errorf("could not read file contents")
	}

	scriptKind := core.GetScriptKindFromFileName(file.CanonicalPath)
	switch scriptKind {
	case core.ScriptKindJS, core.ScriptKindJSX, core.ScriptKindTS, core.ScriptKindTSX:
	default:
		return nil, fmt.Errorf("unsupported script kind %q", scriptKind.String())
	}

	return parser.ParseSourceFile(ast.SourceFileParseOptions{
		FileName: file.CanonicalPath,
		Path:     tspath.Path(file.CanonicalPath),
	}, sourceText, scriptKind), nil
}

func runnableWithoutProgramRules(rules []linter.ConfiguredRule) []linter.ConfiguredRule {
	filtered := make([]linter.ConfiguredRule, 0, len(rules))
	for _, configuredRule := range rules {
		if canRunWithoutProgram(configuredRule.Name) {
			filtered = append(filtered, configuredRule)
		}
	}
	return filtered
}

func incrementalProgramForFile(
	ctx context.Context,
	analysisConfig NormalizedProjectConfiguration,
	filePath string,
	stores *projectFileStores,
	fsys vfs.FS,
	cache map[string]*compiler.Program,
	foundOptions *compilerOptionsAccumulator,
	state *sonarlintState,
	onInternalDiagnostic func(d diagnostic.Internal),
) (*compiler.Program, error) {
	attempted := map[string]struct{}{}
	for {
		if err := checkAnalysisCancelled(ctx); err != nil {
			return nil, err
		}

		tsconfig := pickBestMatchTSConfig(unattemptedTSConfigs(stores.tsConfigs(), attempted), filePath)
		if tsconfig == "" {
			return nil, nil
		}
		attempted[tsconfig] = struct{}{}
		nodeVersionSignal := stores.nodeVersionSignalForDir(tspath.GetDirectoryPath(tsconfig))

		program, ok := cache[tsconfig]
		if !ok && state != nil {
			program, ok = state.getConfiguredProgram(tsconfig)
			if ok {
				cache[tsconfig] = program
			}
		}
		if !ok {
			var err error
			program, err = createConfiguredProgram(analysisConfig, tsconfig, nodeVersionSignal, fsys, onInternalDiagnostic)
			if err != nil {
				return nil, err
			}
			cache[tsconfig] = program
			if state != nil {
				state.setConfiguredProgram(tsconfig, program)
			}
		} else {
			updatedProgram, err := reuseConfiguredProgramForFile(
				filePath,
				analysisConfig,
				tsconfig,
				nodeVersionSignal,
				program,
				fsys,
				onInternalDiagnostic,
			)
			if err != nil {
				return nil, err
			}
			program = updatedProgram
			cache[tsconfig] = program
			if state != nil {
				state.setConfiguredProgram(tsconfig, program)
			}
		}
		if program != nil {
			foundOptions.add(configuredProgramOptionsForOrphans(program, tsconfig, fsys))
		}
		addConfiguredProjectReferences(tsconfig, stores, fsys)
		if program != nil && program.GetSourceFile(filePath) != nil {
			return program, nil
		}
	}
}

func programSourceFilesMatchingPaths(program *compiler.Program, filePaths []string) ([]*ast.SourceFile, []string) {
	sourceFiles := make([]*ast.SourceFile, 0, len(filePaths))
	matchedPaths := make([]string, 0, len(filePaths))
	for _, filePath := range filePaths {
		sourceFile := program.GetSourceFile(filePath)
		if sourceFile == nil {
			continue
		}
		sourceFiles = append(sourceFiles, sourceFile)
		matchedPaths = append(matchedPaths, filePath)
	}
	return sourceFiles, matchedPaths
}

func orderedPendingFiles(filePaths []string, pending map[string]struct{}) []string {
	ordered := make([]string, 0, len(pending))
	for _, filePath := range filePaths {
		if _, ok := pending[filePath]; ok {
			ordered = append(ordered, filePath)
		}
	}
	return ordered
}

func unmatchedFilePaths(filePaths []string, matchedPaths []string) []string {
	if len(filePaths) == 0 {
		return nil
	}
	if len(matchedPaths) == 0 {
		return append([]string(nil), filePaths...)
	}

	matched := make(map[string]struct{}, len(matchedPaths))
	for _, filePath := range matchedPaths {
		matched[filePath] = struct{}{}
	}

	unmatched := make([]string, 0, len(filePaths))
	for _, filePath := range filePaths {
		if _, ok := matched[filePath]; ok {
			continue
		}
		unmatched = append(unmatched, filePath)
	}
	return unmatched
}

func groupFilePathsByCompilerOptions(
	filePaths []string,
	resolve func(filePath string) *core.CompilerOptions,
) []compilerOptionsGroup {
	groups := make([]compilerOptionsGroup, 0)
	for _, filePath := range filePaths {
		options := resolve(filePath)
		grouped := false
		for index := range groups {
			if compilerOptionsEqual(groups[index].compilerOptions, options) {
				groups[index].filePaths = append(groups[index].filePaths, filePath)
				grouped = true
				break
			}
		}
		if grouped {
			continue
		}
		groups = append(groups, compilerOptionsGroup{
			filePaths:       []string{filePath},
			compilerOptions: cloneCompilerOptions(options),
		})
	}
	return groups
}

func unattemptedTSConfigs(tsconfigs []string, attempted map[string]struct{}) []string {
	filtered := make([]string, 0, len(tsconfigs))
	for _, tsconfig := range tsconfigs {
		if _, ok := attempted[tsconfig]; !ok {
			filtered = append(filtered, tsconfig)
		}
	}
	return filtered
}

func pickBestMatchTSConfig(tsconfigs []string, filePath string) string {
	var (
		bestConfig string
		bestDirLen = -1
	)
	for _, tsconfig := range tsconfigs {
		tsconfigDir := tspath.GetDirectoryPath(tsconfig)
		if matchesAnyRoot(filePath, []string{tsconfigDir}) && len(tsconfigDir) > bestDirLen {
			bestConfig = tsconfig
			bestDirLen = len(tsconfigDir)
		}
	}
	if bestConfig != "" {
		return bestConfig
	}
	if len(tsconfigs) == 0 {
		return ""
	}
	return tsconfigs[0]
}

func requestedJsTsRulesByKey(rules []NormalizedJsTsRule) map[string][]NormalizedJsTsRule {
	byKey := make(map[string][]NormalizedJsTsRule, len(rules))
	for _, configuredRule := range rules {
		byKey[configuredRule.Key] = append(byKey[configuredRule.Key], configuredRule)
	}
	return byKey
}

func configuredRulesForFile(
	configuredRules []linter.ConfiguredRule,
	requestedRules map[string][]NormalizedJsTsRule,
	analysisConfig NormalizedProjectConfiguration,
	file NormalizedProjectFile,
	activationSignals ruleActivationSignals,
) []linter.ConfiguredRule {
	filtered := make([]linter.ConfiguredRule, 0, len(configuredRules))
	for _, configuredRule := range configuredRules {
		sonarRuleKey := sonarRuleKeyFor(configuredRule.Name)
		if requestedRuleVariants, ok := requestedRules[sonarRuleKey]; ok {
			applies := false
			for _, requestedRule := range requestedRuleVariants {
				if ruleAppliesToFile(
					requestedRule,
					ruleMetadataBySonarKey[sonarRuleKey],
					analysisConfig,
					file,
					activationSignals,
				) {
					applies = true
					break
				}
			}
			if !applies {
				continue
			}
		}
		filtered = append(filtered, configuredRule)
	}
	return filtered
}

func ruleAppliesToFile(
	ruleConfig NormalizedJsTsRule,
	ruleMeta ruleMetadata,
	analysisConfig NormalizedProjectConfiguration,
	file NormalizedProjectFile,
	activationSignals ruleActivationSignals,
) bool {
	if len(ruleConfig.FileTypeTargets) > 0 && !containsFileType(ruleConfig.FileTypeTargets, effectiveFileType(file.FileType)) {
		return false
	}
	if len(ruleConfig.AnalysisModes) > 0 &&
		!containsAnalysisMode(ruleConfig.AnalysisModes, effectiveAnalysisMode(analysisConfig.AnalysisMode, file.FileStatus)) {
		return false
	}
	if ruleConfig.Language != pb.JsTsLanguage_JS_TS_LANGUAGE_UNSPECIFIED &&
		ruleConfig.Language != fileLanguage(file.CanonicalPath) {
		return false
	}

	extension := strings.ToLower(path.Ext(file.CanonicalPath))
	for _, blacklistedExtension := range ruleConfig.BlacklistedExtensions {
		if strings.EqualFold(blacklistedExtension, extension) {
			return false
		}
	}
	if len(ruleMeta.RequiredDependencies) > 0 && !hasAnyRequiredDependency(activationSignals.Dependencies, ruleMeta.RequiredDependencies) {
		return false
	}
	if activationSignals.DetectedModuleType != "" && ruleMeta.RequiredModuleType != "" && ruleMeta.RequiredModuleType != activationSignals.DetectedModuleType {
		return false
	}
	if activationSignals.DetectedEcmaVersion > 0 &&
		ruleMeta.RequiredEcmaVersion > 0 &&
		ruleMeta.RequiredEcmaVersion > activationSignals.DetectedEcmaVersion {
		return false
	}
	return true
}

func hasAnyRequiredDependency(dependencies map[string]struct{}, required []string) bool {
	for _, dependency := range required {
		if _, ok := dependencies[dependency]; ok {
			return true
		}
	}
	return false
}

func effectiveFileType(fileType pb.FileType) pb.FileType {
	if fileType == pb.FileType_FILE_TYPE_UNSPECIFIED {
		return pb.FileType_FILE_TYPE_MAIN
	}
	return fileType
}

func effectiveFileStatus(fileStatus pb.FileStatus) pb.FileStatus {
	if fileStatus == pb.FileStatus_FILE_STATUS_UNSPECIFIED {
		return pb.FileStatus_FILE_STATUS_SAME
	}
	return fileStatus
}

func effectiveAnalysisMode(mode pb.AnalysisMode, fileStatus pb.FileStatus) pb.AnalysisMode {
	if effectiveFileStatus(fileStatus) != pb.FileStatus_FILE_STATUS_SAME {
		return pb.AnalysisMode_ANALYSIS_MODE_DEFAULT
	}
	if mode == pb.AnalysisMode_ANALYSIS_MODE_UNSPECIFIED {
		return pb.AnalysisMode_ANALYSIS_MODE_DEFAULT
	}
	return mode
}

func fileLanguage(filePath string) pb.JsTsLanguage {
	switch strings.ToLower(path.Ext(filePath)) {
	case ".cts", ".mts", ".ts", ".tsx":
		return pb.JsTsLanguage_JS_TS_LANGUAGE_TS
	default:
		return pb.JsTsLanguage_JS_TS_LANGUAGE_JS
	}
}

func containsFileType(values []pb.FileType, target pb.FileType) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func containsAnalysisMode(values []pb.AnalysisMode, target pb.AnalysisMode) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func detectedEcmaVersionForProgram(
	program *compiler.Program,
	analysisConfig NormalizedProjectConfiguration,
) int {
	if year := configuredEcmaScriptYear(analysisConfig.EcmaScriptVersion); year != 0 {
		return year
	}
	if program == nil || program.Options() == nil {
		return 0
	}
	options := program.Options()
	if len(options.Lib) > 0 {
		return ecmaYearFromLibs(options.Lib)
	}
	return 0
}

func configuredEcmaScriptYear(version *string) int {
	if version == nil {
		return 0
	}
	normalized := strings.ToUpper(strings.TrimSpace(*version))
	if !strings.HasPrefix(normalized, "ES") {
		return 0
	}
	year, err := strconv.Atoi(strings.TrimPrefix(normalized, "ES"))
	if err != nil || year < 2015 || year > 2030 {
		return 0
	}
	return year
}

func ecmaYearFromLibs(libs []string) int {
	maxYear := 0
	for _, lib := range libs {
		normalized := strings.ToLower(path.Base(lib))
		if strings.HasPrefix(normalized, "lib.esnext") && strings.HasSuffix(normalized, ".d.ts") {
			return 0
		}
		if !strings.HasPrefix(normalized, "lib.es") || !strings.HasSuffix(normalized, ".d.ts") {
			continue
		}
		yearPart := strings.TrimSuffix(strings.TrimPrefix(normalized, "lib.es"), ".d.ts")
		if separator := strings.IndexByte(yearPart, '.'); separator >= 0 {
			yearPart = yearPart[:separator]
		}
		year, err := strconv.Atoi(yearPart)
		if err != nil || year < 2015 {
			continue
		}
		if year > maxYear {
			maxYear = year
		}
	}
	return maxYear
}
