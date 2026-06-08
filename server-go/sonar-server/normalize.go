package main

import (
	"sort"
	"strings"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"github.com/microsoft/typescript-go/shim/tspath"
)

type NormalizedAnalyzeProjectInput struct {
	Config         NormalizedProjectConfiguration
	Files          map[string]NormalizedProjectFile
	OrderedFiles   []string
	PathMap        map[string]string
	VirtualFiles   map[string]string
	Rules          []NormalizedJsTsRule
	CssRules       []NormalizedCssRule
	RequestedRules map[string]requestedRuleConfig
	Bundles        []string
	RulesWorkdir   *string
}

type NormalizedProjectConfiguration struct {
	BaseDir string

	SonarLint                          *bool
	FsEvents                           []string
	AllowTsParserJsFiles               *bool
	AnalysisMode                       pb.AnalysisMode
	SkipAst                            *bool
	IgnoreHeaderComments               *bool
	MaxFileSize                        *int64
	Environments                       *[]string
	Globals                            *[]string
	TsSuffixes                         *[]string
	JsSuffixes                         *[]string
	CssSuffixes                        *[]string
	HtmlSuffixes                       *[]string
	YamlSuffixes                       *[]string
	CssAdditionalSuffixes              *[]string
	TsConfigPaths                      []string
	JsTsExclusions                     *[]string
	Sources                            []string
	Inclusions                         []string
	Exclusions                         []string
	Tests                              []string
	TestInclusions                     []string
	TestExclusions                     []string
	DetectBundles                      *bool
	CanAccessFileSystem                *bool
	CreateTSProgramForOrphanFiles      *bool
	DisableTypeChecking                *bool
	SkipNodeModuleLookupOutsideBaseDir *bool
	EcmaScriptVersion                  *string
	ClearDependenciesCache             *bool
	ClearTsConfigCache                 *bool
	ReportNclocForTestFiles            *bool
}

type NormalizedProjectFile struct {
	CanonicalPath string
	OriginalPath  string
	Content       string
	HasContent    bool
	FileType      pb.FileType
	FileStatus    pb.FileStatus
}

type NormalizedJsTsRule struct {
	Key                   string
	Options               any
	FileTypeTargets       []pb.FileType
	Language              pb.JsTsLanguage
	AnalysisModes         []pb.AnalysisMode
	BlacklistedExtensions []string
}

type NormalizedCssRule struct {
	Key            string
	Configurations []any
}

func NormalizeAnalyzeProjectRequest(req *pb.AnalyzeProjectRequest) (*NormalizedAnalyzeProjectInput, error) {
	input := &NormalizedAnalyzeProjectInput{}
	if req == nil {
		input.Config = NormalizeProjectConfiguration(nil)
		input.Files = map[string]NormalizedProjectFile{}
		input.PathMap = map[string]string{}
		input.VirtualFiles = map[string]string{}
		input.RequestedRules = map[string]requestedRuleConfig{}
		return input, nil
	}

	input.Config = NormalizeProjectConfiguration(req.GetConfiguration())
	input.Files, input.OrderedFiles, input.PathMap, input.VirtualFiles = NormalizeProjectFiles(req.GetFiles(), input.Config.BaseDir)
	input.Rules = NormalizeJsTsRules(req.GetRules())
	input.CssRules = NormalizeCssRules(req.GetCssRules())
	input.RequestedRules = requestedRuleConfigs(req.GetRules())
	input.Bundles = normalizePaths(input.Config.BaseDir, req.GetBundles())
	input.RulesWorkdir = normalizeOptionalPath(input.Config.BaseDir, req.RulesWorkdir)

	return input, nil
}

func NormalizeProjectConfiguration(cfg *pb.ProjectConfiguration) NormalizedProjectConfiguration {
	if cfg == nil {
		return NormalizedProjectConfiguration{
			BaseDir: ".",
		}
	}

	baseDir := cfg.GetBaseDir()
	if baseDir == "" {
		baseDir = "."
	}

	return NormalizedProjectConfiguration{
		BaseDir:                            tspath.NormalizePath(baseDir),
		SonarLint:                          cloneBool(cfg.Sonarlint),
		FsEvents:                           normalizePaths(baseDir, cfg.GetFsEvents()),
		AllowTsParserJsFiles:               cloneBool(cfg.AllowTsParserJsFiles),
		AnalysisMode:                       cfg.GetAnalysisMode(),
		SkipAst:                            cloneBool(cfg.SkipAst),
		IgnoreHeaderComments:               cloneBool(cfg.IgnoreHeaderComments),
		MaxFileSize:                        cloneInt64(cfg.MaxFileSize),
		Environments:                       cloneStringList(cfg.GetEnvironments()),
		Globals:                            cloneStringList(cfg.GetGlobals()),
		TsSuffixes:                         cloneStringList(cfg.GetTsSuffixes()),
		JsSuffixes:                         cloneStringList(cfg.GetJsSuffixes()),
		CssSuffixes:                        cloneStringList(cfg.GetCssSuffixes()),
		HtmlSuffixes:                       cloneStringList(cfg.GetHtmlSuffixes()),
		YamlSuffixes:                       cloneStringList(cfg.GetYamlSuffixes()),
		CssAdditionalSuffixes:              cloneStringList(cfg.GetCssAdditionalSuffixes()),
		TsConfigPaths:                      normalizePaths(baseDir, cfg.GetTsConfigPaths()),
		JsTsExclusions:                     normalizeStringListPaths(baseDir, cfg.GetJsTsExclusions()),
		Sources:                            normalizePaths(baseDir, cfg.GetSources()),
		Inclusions:                         normalizePaths(baseDir, cfg.GetInclusions()),
		Exclusions:                         normalizePaths(baseDir, cfg.GetExclusions()),
		Tests:                              normalizePaths(baseDir, cfg.GetTests()),
		TestInclusions:                     normalizePaths(baseDir, cfg.GetTestInclusions()),
		TestExclusions:                     normalizePaths(baseDir, cfg.GetTestExclusions()),
		DetectBundles:                      cloneBool(cfg.DetectBundles),
		CanAccessFileSystem:                cloneBool(cfg.CanAccessFileSystem),
		CreateTSProgramForOrphanFiles:      cloneBool(cfg.CreateTsProgramForOrphanFiles),
		DisableTypeChecking:                cloneBool(cfg.DisableTypeChecking),
		SkipNodeModuleLookupOutsideBaseDir: cloneBool(cfg.SkipNodeModuleLookupOutsideBaseDir),
		EcmaScriptVersion:                  cloneString(cfg.EcmaScriptVersion),
		ClearDependenciesCache:             cloneBool(cfg.ClearDependenciesCache),
		ClearTsConfigCache:                 cloneBool(cfg.ClearTsConfigCache),
		ReportNclocForTestFiles:            cloneBool(cfg.ReportNclocForTestFiles),
	}
}

func NormalizeProjectFiles(
	files map[string]*pb.ProjectFileInput,
	baseDir string,
) (
	map[string]NormalizedProjectFile,
	[]string,
	map[string]string,
	map[string]string,
) {
	normalizedFiles := make(map[string]NormalizedProjectFile, len(files))
	pathMap := make(map[string]string, len(files))
	virtualFiles := make(map[string]string, len(files))

	originalPaths := make([]string, 0, len(files))
	for originalPath := range files {
		originalPaths = append(originalPaths, originalPath)
	}
	sort.Strings(originalPaths)

	for _, originalPath := range originalPaths {
		canonicalPath := normalizeProjectPath(baseDir, originalPath)
		if _, exists := normalizedFiles[canonicalPath]; exists {
			continue
		}

		fileInput := files[originalPath]
		file := NormalizedProjectFile{
			CanonicalPath: canonicalPath,
			OriginalPath:  originalPath,
			FileStatus:    pb.FileStatus_FILE_STATUS_SAME,
		}
		if fileInput != nil {
			file.FileType = fileInput.GetFileType()
			file.FileStatus = effectiveFileStatus(fileInput.GetFileStatus())
			if fileInput.FileContent != nil {
				file.HasContent = true
				file.Content = fileInput.GetFileContent()
				virtualFiles[canonicalPath] = file.Content
			}
		}

		normalizedFiles[canonicalPath] = file
		pathMap[canonicalPath] = originalPath
	}

	orderedFiles := make([]string, 0, len(normalizedFiles))
	for canonicalPath := range normalizedFiles {
		orderedFiles = append(orderedFiles, canonicalPath)
	}
	sort.Strings(orderedFiles)

	return normalizedFiles, orderedFiles, pathMap, virtualFiles
}

func NormalizeJsTsRules(rules []*pb.JsTsRule) []NormalizedJsTsRule {
	normalized := make([]NormalizedJsTsRule, 0, len(rules))
	for _, rule := range rules {
		if rule == nil {
			continue
		}
		normalized = append(normalized, NormalizedJsTsRule{
			Key:                   rule.GetKey(),
			Options:               optionsForRequestedRule(rule),
			FileTypeTargets:       cloneFileTypes(rule.GetFileTypeTargets()),
			Language:              rule.GetLanguage(),
			AnalysisModes:         cloneAnalysisModes(rule.GetAnalysisModes()),
			BlacklistedExtensions: cloneStrings(rule.GetBlacklistedExtensions()),
		})
	}
	return normalized
}

func NormalizeCssRules(rules []*pb.CssRule) []NormalizedCssRule {
	normalized := make([]NormalizedCssRule, 0, len(rules))
	for _, rule := range rules {
		if rule == nil {
			continue
		}
		normalized = append(normalized, NormalizedCssRule{
			Key:            rule.GetKey(),
			Configurations: configurationInterfaces(rule.GetConfigurations()),
		})
	}
	return normalized
}

func normalizePaths(baseDir string, paths []string) []string {
	normalized := make([]string, 0, len(paths))
	for _, path := range paths {
		if normalizedPath := normalizeProjectPath(baseDir, path); normalizedPath != "" {
			normalized = append(normalized, normalizedPath)
		}
	}
	if len(normalized) == 0 {
		return nil
	}
	return normalized
}

func normalizeOptionalPath(baseDir string, path *string) *string {
	if path == nil {
		return nil
	}
	normalized := normalizeProjectPath(baseDir, *path)
	return &normalized
}

func cloneBool(value *bool) *bool {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}

func cloneInt64(value *int64) *int64 {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}

func cloneString(value *string) *string {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}

func cloneStringList(value *pb.StringList) *[]string {
	if value == nil {
		return nil
	}
	cloned := cloneStrings(value.GetValues())
	return &cloned
}

func normalizeStringListPaths(baseDir string, value *pb.StringList) *[]string {
	if value == nil {
		return nil
	}
	normalized := normalizePaths(baseDir, value.GetValues())
	if len(normalized) == 0 {
		normalized = []string{}
	}
	return &normalized
}

func cloneStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	return append([]string(nil), values...)
}

func cloneFileTypes(values []pb.FileType) []pb.FileType {
	if len(values) == 0 {
		return nil
	}
	return append([]pb.FileType(nil), values...)
}

func cloneAnalysisModes(values []pb.AnalysisMode) []pb.AnalysisMode {
	if len(values) == 0 {
		return nil
	}
	return append([]pb.AnalysisMode(nil), values...)
}

func normalizeProjectPath(baseDir string, value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	normalized := tspath.NormalizeSlashes(trimmed)
	if baseDir != "" && !tspath.PathIsAbsolute(normalized) && !tspath.IsRootedDiskPath(normalized) {
		normalized = tspath.ResolvePath(baseDir, normalized)
	}
	return tspath.NormalizePath(normalized)
}

func valueOrEmptyStringList(value *pb.StringList) []string {
	if value == nil {
		return nil
	}
	return value.GetValues()
}
