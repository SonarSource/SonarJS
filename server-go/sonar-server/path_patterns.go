package main

import (
	"path"
	"regexp"
	"sort"
	"strings"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"github.com/microsoft/typescript-go/shim/tspath"
)

var (
	defaultJsSuffixes                    = []string{".js", ".mjs", ".cjs", ".jsx", ".vue"}
	defaultTsSuffixes                    = []string{".ts", ".mts", ".cts", ".tsx"}
	defaultJsTsExclusions                = []string{"**/*.d.ts", "**/.git/**", "**/node_modules/**", "**/bower_components/**", "**/dist/**", "**/vendor/**", "**/external/**", "**/contrib/**", ".scannerwork"}
	defaultCreateTSProgramForOrphanFiles = true
)

type pathPattern struct {
	raw string
	re  *regexp.Regexp
}

type analyzeProjectFilters struct {
	jsSuffixes      []string
	tsSuffixes      []string
	sources         []string
	tests           []string
	inclusions      []pathPattern
	exclusions      []pathPattern
	testInclusions  []pathPattern
	testExclusions  []pathPattern
	jsTsExclusions  []pathPattern
	providedTSPaths []pathPattern
}

func newAnalyzeProjectFilters(config NormalizedProjectConfiguration) analyzeProjectFilters {
	sources := cloneStringSlice(config.Sources)
	if len(sources) == 0 {
		sources = []string{config.BaseDir}
	}

	return analyzeProjectFilters{
		jsSuffixes:      lowerStringSlice(stringSliceValue(config.JsSuffixes, defaultJsSuffixes)),
		tsSuffixes:      lowerStringSlice(stringSliceValue(config.TsSuffixes, defaultTsSuffixes)),
		sources:         normalizePathSlice(config.BaseDir, sources),
		tests:           normalizePathSlice(config.BaseDir, config.Tests),
		inclusions:      compilePathPatterns(config.BaseDir, config.Inclusions),
		exclusions:      compilePathPatterns(config.BaseDir, config.Exclusions),
		testInclusions:  compilePathPatterns(config.BaseDir, config.TestInclusions),
		testExclusions:  compilePathPatterns(config.BaseDir, config.TestExclusions),
		jsTsExclusions:  compilePathPatterns(config.BaseDir, stringSliceValue(config.JsTsExclusions, defaultJsTsExclusions)),
		providedTSPaths: compilePathPatterns(config.BaseDir, config.TsConfigPaths),
	}
}

func (f analyzeProjectFilters) isJsTsExcluded(filePath string) bool {
	return matchAnyPattern(f.jsTsExclusions, filePath)
}

func (f analyzeProjectFilters) isJsTsFile(filePath string) bool {
	extension := strings.ToLower(path.Ext(filePath))
	return containsString(f.jsSuffixes, extension) || containsString(f.tsSuffixes, extension)
}

func (f analyzeProjectFilters) matchesProvidedTSConfig(filePath string) bool {
	return matchAnyPattern(f.providedTSPaths, filePath)
}

func (f analyzeProjectFilters) filterPathAndGetFileType(filePath string) (pb.FileType, bool) {
	if fileIsTest(filePath, f) {
		return pb.FileType_FILE_TYPE_TEST, true
	}
	if fileIsMain(filePath, f) {
		return pb.FileType_FILE_TYPE_MAIN, true
	}
	return pb.FileType_FILE_TYPE_UNSPECIFIED, false
}

func fileIsTest(filePath string, filters analyzeProjectFilters) bool {
	if !matchesAnyRoot(filePath, filters.tests) {
		return false
	}
	if matchAnyPattern(filters.testExclusions, filePath) {
		return false
	}
	if len(filters.testInclusions) > 0 {
		return matchAnyPattern(filters.testInclusions, filePath)
	}
	return true
}

func fileIsMain(filePath string, filters analyzeProjectFilters) bool {
	if !matchesAnyRoot(filePath, filters.sources) {
		return false
	}
	if matchAnyPattern(filters.exclusions, filePath) {
		return false
	}
	if len(filters.inclusions) > 0 {
		return matchAnyPattern(filters.inclusions, filePath)
	}
	return true
}

func compilePathPatterns(baseDir string, patterns []string) []pathPattern {
	compiled := make([]pathPattern, 0, len(patterns))
	for _, pattern := range patterns {
		normalized := normalizeProjectPath(baseDir, pattern)
		if normalized == "" {
			continue
		}
		compiled = append(compiled, pathPattern{
			raw: normalized,
			re:  regexp.MustCompile(globToRegexp(normalized)),
		})
	}
	return compiled
}

func matchAnyPattern(patterns []pathPattern, filePath string) bool {
	if len(patterns) == 0 {
		return false
	}
	matchedPath := normalizedMatchPath(filePath)
	for _, pattern := range patterns {
		if pattern.re.MatchString(matchedPath) {
			return true
		}
	}
	return false
}

func matchesAnyRoot(filePath string, roots []string) bool {
	if len(roots) == 0 {
		return false
	}
	matchedPath := normalizedMatchPath(filePath)
	for _, root := range roots {
		rootPath := normalizedMatchPath(root)
		if matchedPath == rootPath {
			return true
		}
		withSlash := rootPath
		if !strings.HasSuffix(withSlash, "/") {
			withSlash += "/"
		}
		if strings.HasPrefix(matchedPath, withSlash) {
			return true
		}
	}
	return false
}

func globToRegexp(pattern string) string {
	var builder strings.Builder
	builder.WriteString("(?i)^")
	for i := 0; i < len(pattern); i++ {
		switch pattern[i] {
		case '*':
			if i+1 < len(pattern) && pattern[i+1] == '*' {
				i++
				if i+1 < len(pattern) && pattern[i+1] == '/' {
					i++
					builder.WriteString("(?:.*/)?")
					continue
				}
				for i+1 < len(pattern) && pattern[i+1] == '*' {
					i++
				}
				builder.WriteString(".*")
			} else {
				builder.WriteString("[^/]*")
			}
		case '?':
			builder.WriteString("[^/]")
		case '.', '+', '(', ')', '|', '^', '$', '{', '}', '[', ']', '\\':
			builder.WriteByte('\\')
			builder.WriteByte(pattern[i])
		default:
			builder.WriteByte(pattern[i])
		}
	}
	builder.WriteString("$")
	return builder.String()
}

func normalizedMatchPath(value string) string {
	return strings.ToLower(tspath.NormalizePath(value))
}

func normalizePathSlice(baseDir string, values []string) []string {
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		if normalizedValue := normalizeProjectPath(baseDir, value); normalizedValue != "" {
			normalized = append(normalized, normalizedValue)
		}
	}
	return normalized
}

func cloneStringSlice(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	return append([]string(nil), values...)
}

func stringSliceValue(value *[]string, defaultValue []string) []string {
	if value != nil && len(*value) > 0 {
		return append([]string(nil), (*value)...)
	}
	return append([]string(nil), defaultValue...)
}

func lowerStringSlice(values []string) []string {
	lowered := make([]string, 0, len(values))
	for _, value := range values {
		lowered = append(lowered, strings.ToLower(value))
	}
	return lowered
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func boolValue(value *bool, defaultValue bool) bool {
	if value == nil {
		return defaultValue
	}
	return *value
}

func uniqueSortedStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	unique := make([]string, 0, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		unique = append(unique, value)
	}
	sort.Strings(unique)
	return unique
}
