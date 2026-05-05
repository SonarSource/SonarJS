package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"path"
	"strconv"
	"strings"

	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs"
	"github.com/typescript-eslint/tsgolint/internal/diagnostic"
	"github.com/typescript-eslint/tsgolint/internal/linter"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"

	pb "github.com/typescript-eslint/tsgolint/cmd/sonar-server/grpc"
)

type analyzerService struct {
	pb.UnimplementedAnalyzeProjectServiceServer
}

type fileRuleCacheKey struct {
	FilePath            string
	DetectedEcmaVersion int
}

func NewAnalyzerService() *analyzerService {
	return &analyzerService{}
}

func (s *analyzerService) AnalyzeProject(
	req *pb.AnalyzeProjectRequest,
	stream pb.AnalyzeProjectService_AnalyzeProjectServer,
) error {
	input, err := NormalizeAnalyzeProjectRequest(req)
	if err != nil {
		return err
	}

	results, meta := analyzeProject(input)
	for _, filePath := range input.OrderedFiles {
		if err := stream.Send(&pb.AnalyzeProjectStreamResponse{
			Message: &pb.AnalyzeProjectStreamResponse_FileResult{
				FileResult: &pb.FileResultMessage{
					FilePath: filePath,
					Result:   results[filePath],
				},
			},
		}); err != nil {
			return err
		}
	}
	return stream.Send(&pb.AnalyzeProjectStreamResponse{
		Message: &pb.AnalyzeProjectStreamResponse_Meta{
			Meta: meta,
		},
	})
}

func (s *analyzerService) AnalyzeProjectUnary(
	ctx context.Context,
	req *pb.AnalyzeProjectRequest,
) (*pb.AnalyzeProjectUnaryResponse, error) {
	input, err := NormalizeAnalyzeProjectRequest(req)
	if err != nil {
		return nil, err
	}

	results, meta := analyzeProject(input)
	return &pb.AnalyzeProjectUnaryResponse{
		Files: results,
		Meta:  meta,
	}, nil
}

func (s *analyzerService) CancelAnalysis(
	ctx context.Context,
	req *pb.CancelAnalysisRequest,
) (*pb.CancelAnalysisResponse, error) {
	return &pb.CancelAnalysisResponse{Cancelled: false}, nil
}

func (s *analyzerService) Lease(stream pb.AnalyzeProjectService_LeaseServer) error {
	for {
		_, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
	}
}

func analyzeProject(
	input *NormalizedAnalyzeProjectInput,
) (map[string]*pb.ProjectAnalysisFileResult, *pb.ProjectAnalysisMeta) {
	fsys := BuildAnalyzeProjectFS(input)
	stores, storeErr := initializeProjectFileStores(input, fsys)

	analysisFiles, orderedFiles := analysisTargetFiles(input, stores)
	results := make(map[string]*pb.ProjectAnalysisFileResult, len(orderedFiles))
	for _, filePath := range orderedFiles {
		results[filePath] = &pb.ProjectAnalysisFileResult{}
	}

	warnings := []string{}
	if storeErr != nil {
		warnings = append(warnings, fmt.Sprintf("tsgolint project discovery error: %v", storeErr))
		return results, &pb.ProjectAnalysisMeta{Warnings: warnings}
	}
	warnings = append(warnings, stores.Warnings...)

	requestedRules := input.RequestedRules
	if len(orderedFiles) == 0 || len(requestedRules) == 0 {
		return results, &pb.ProjectAnalysisMeta{Warnings: warnings}
	}

	filePaths := jsTsAnalysisTargets(orderedFiles, input.Config)
	if len(filePaths) == 0 {
		return results, &pb.ProjectAnalysisMeta{Warnings: warnings}
	}

	baseDir := input.Config.BaseDir
	log.Printf(
		"AnalyzeProject: baseDir=%s, files=%d, jsTsFiles=%d, rules=%d, tsconfigs=%d",
		baseDir,
		len(orderedFiles),
		len(filePaths),
		len(requestedRules),
		len(stores.tsConfigs()),
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
	if boolValue(input.Config.SonarLint, false) {
		analysisErr = analyzeIncrementalPrograms(
			logLevel,
			input,
			stores,
			fsys,
			filePaths,
			rulesForFile,
			onRuleDiagnostic,
			onInternalDiagnostic,
		)
	} else {
		analysisErr = analyzeBatchPrograms(
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
	if analysisErr != nil {
		log.Printf("Linter error: %v", analysisErr)
		warnings = append(warnings, fmt.Sprintf("tsgolint linter error: %v", analysisErr))
	}

	for _, filePath := range orderedFiles {
		results[filePath] = &pb.ProjectAnalysisFileResult{
			Issues: diagnosticsByFile[filePath],
		}
	}

	return results, &pb.ProjectAnalysisMeta{Warnings: warnings}
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

	for _, tsconfig := range stores.tsConfigs() {
		if len(pending) == 0 {
			break
		}
		analyzed, err := analyzeConfiguredProgramFiles(
			logLevel,
			input.Config,
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
		for _, filePath := range analyzed {
			delete(pending, filePath)
		}
	}

	orphans := orderedPendingFiles(filePaths, pending)
	if len(orphans) == 0 {
		return nil
	}
	if !boolValue(input.Config.CreateTSProgramForOrphanFiles, defaultCreateTSProgramForOrphanFiles) {
		log.Printf("Skipping TypeScript program creation for %d orphan file(s)", len(orphans))
		return nil
	}

	_, err := analyzeInferredProgramFiles(
		logLevel,
		input.Config,
		input.Config.BaseDir,
		orphans,
		fsys,
		rulesForFile,
		onRuleDiagnostic,
		onInternalDiagnostic,
	)
	return err
}

func analyzeIncrementalPrograms(
	logLevel utils.LogLevel,
	input *NormalizedAnalyzeProjectInput,
	stores *projectFileStores,
	fsys vfs.FS,
	filePaths []string,
	rulesForFile func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule,
	onRuleDiagnostic func(d rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
) error {
	programCache := make(map[string]*compiler.Program)
	var orphanProgram *compiler.Program
	orphanProgramInitialized := false

	for _, filePath := range filePaths {
		program, err := incrementalProgramForFile(filePath, stores, fsys, programCache, onInternalDiagnostic)
		if err != nil {
			return err
		}
		if program != nil {
			sourceFile := program.GetSourceFile(filePath)
			if sourceFile != nil {
				if err := lintSourceFiles(
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

		if !boolValue(input.Config.CreateTSProgramForOrphanFiles, defaultCreateTSProgramForOrphanFiles) {
			continue
		}
		if !orphanProgramInitialized {
			orphanProgramInitialized = true
			var orphanErr error
			orphanProgram, orphanErr = createInferredProgram(input.Config.BaseDir, filePaths, fsys, onInternalDiagnostic)
			if orphanErr != nil {
				return orphanErr
			}
		}
		if orphanProgram == nil {
			continue
		}
		sourceFile := orphanProgram.GetSourceFile(filePath)
		if sourceFile == nil {
			continue
		}
		if err := lintSourceFiles(
			logLevel,
			input.Config,
			orphanProgram,
			[]*ast.SourceFile{sourceFile},
			rulesForFile,
			onRuleDiagnostic,
			onInternalDiagnostic,
		); err != nil {
			return err
		}
	}

	return nil
}

func analyzeConfiguredProgramFiles(
	logLevel utils.LogLevel,
	analysisConfig NormalizedProjectConfiguration,
	configFileName string,
	filePaths []string,
	fsys vfs.FS,
	rulesForFile func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule,
	onRuleDiagnostic func(d rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
) ([]string, error) {
	program, err := createConfiguredProgram(configFileName, fsys, onInternalDiagnostic)
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

	if err := lintSourceFiles(logLevel, analysisConfig, program, sourceFiles, rulesForFile, onRuleDiagnostic, onInternalDiagnostic); err != nil {
		return nil, err
	}
	return matchedPaths, nil
}

func analyzeInferredProgramFiles(
	logLevel utils.LogLevel,
	analysisConfig NormalizedProjectConfiguration,
	baseDir string,
	filePaths []string,
	fsys vfs.FS,
	rulesForFile func(filePath string, detectedEcmaVersion int) []linter.ConfiguredRule,
	onRuleDiagnostic func(d rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
) ([]string, error) {
	program, err := createInferredProgram(baseDir, filePaths, fsys, onInternalDiagnostic)
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

	if err := lintSourceFiles(logLevel, analysisConfig, program, sourceFiles, rulesForFile, onRuleDiagnostic, onInternalDiagnostic); err != nil {
		return nil, err
	}
	return matchedPaths, nil
}

func createConfiguredProgram(
	configFileName string,
	fsys vfs.FS,
	onInternalDiagnostic func(d diagnostic.Internal),
) (*compiler.Program, error) {
	currentDirectory := tspath.GetDirectoryPath(configFileName)
	host := utils.NewCachedFSCompilerHost(currentDirectory, fsys, bundled.LibPath(), nil, nil)

	program, diagnostics, err := utils.CreateProgram(false, fsys, currentDirectory, configFileName, host, false)
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
	fsys vfs.FS,
	onInternalDiagnostic func(d diagnostic.Internal),
) (*compiler.Program, error) {
	if len(filePaths) == 0 {
		return nil, nil
	}

	host := utils.NewCachedFSCompilerHost(baseDir, fsys, bundled.LibPath(), nil, nil)
	program, diagnostics, err := utils.CreateInferredProjectProgram(false, fsys, baseDir, host, filePaths)
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

func lintSourceFiles(
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

func incrementalProgramForFile(
	filePath string,
	stores *projectFileStores,
	fsys vfs.FS,
	cache map[string]*compiler.Program,
	onInternalDiagnostic func(d diagnostic.Internal),
) (*compiler.Program, error) {
	attempted := map[string]struct{}{}
	for {
		tsconfig := pickBestMatchTSConfig(unattemptedTSConfigs(stores.tsConfigs(), attempted), filePath)
		if tsconfig == "" {
			return nil, nil
		}
		attempted[tsconfig] = struct{}{}

		program, ok := cache[tsconfig]
		if !ok {
			var err error
			program, err = createConfiguredProgram(tsconfig, fsys, onInternalDiagnostic)
			if err != nil {
				return nil, err
			}
			cache[tsconfig] = program
		}
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

func requestedJsTsRulesByKey(rules []NormalizedJsTsRule) map[string]NormalizedJsTsRule {
	byKey := make(map[string]NormalizedJsTsRule, len(rules))
	for _, configuredRule := range rules {
		byKey[configuredRule.Key] = configuredRule
	}
	return byKey
}

func configuredRulesForFile(
	configuredRules []linter.ConfiguredRule,
	requestedRules map[string]NormalizedJsTsRule,
	analysisConfig NormalizedProjectConfiguration,
	file NormalizedProjectFile,
	activationSignals ruleActivationSignals,
) []linter.ConfiguredRule {
	filtered := make([]linter.ConfiguredRule, 0, len(configuredRules))
	for _, configuredRule := range configuredRules {
		sonarRuleKey := sonarRuleKeyFor(configuredRule.Name)
		requestedRule, ok := requestedRules[sonarRuleKey]
		if ok && !ruleAppliesToFile(requestedRule, ruleMetadataBySonarKey[sonarRuleKey], analysisConfig, file, activationSignals) {
			continue
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
	if len(ruleConfig.AnalysisModes) > 0 && !containsAnalysisMode(ruleConfig.AnalysisModes, effectiveAnalysisMode(analysisConfig.AnalysisMode)) {
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

func effectiveAnalysisMode(mode pb.AnalysisMode) pb.AnalysisMode {
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
