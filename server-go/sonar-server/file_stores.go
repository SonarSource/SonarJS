package main

import (
	"sort"
	"strings"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs"
)

const (
	tsconfigJSONName = "tsconfig.json"
	packageJSONName  = "package.json"
	denoJSONName     = "deno.json"
	denoJSONCName    = "deno.jsonc"
)

type dependencyManifest struct {
	Path    string
	Content string
}

type projectFileStores struct {
	SourceFiles              map[string]NormalizedProjectFile
	OrderedSourceFiles       []string
	lookupTSConfigs          []string
	lookupTSConfigSet        map[string]struct{}
	propertyTSConfigs        []string
	propertyTSConfigSet      map[string]struct{}
	providedTSConfigPatterns []pathPattern
	PackageJSONs             map[string]dependencyManifest
	DenoJSONs                map[string]dependencyManifest
	DenoJSONCs               map[string]dependencyManifest
	DependenciesByDir        map[string]map[string]struct{}
	ModuleTypeByDir          map[string]string
	NodeVersionSignalByDir   map[string]string
	DirnameToParent          map[string]string
	Warnings                 []string
	usingExplicitSourceFiles bool
}

func initializeProjectFileStores(input *NormalizedAnalyzeProjectInput, fsys vfs.FS) (*projectFileStores, error) {
	filters := newAnalyzeProjectFilters(input.Config)
	stores := newProjectFileStores(input, filters)

	if err := walkProjectTree(
		fsys,
		input.Config.BaseDir,
		filters,
		stores.processDirectory,
		func(filePath string) error {
			return stores.processFile(filePath, input, fsys, filters)
		},
	); err != nil {
		return nil, err
	}

	stores.postProcess(input.Config)
	stores.buildDependencySignals()
	return stores, nil
}

func newProjectFileStores(input *NormalizedAnalyzeProjectInput, filters analyzeProjectFilters) *projectFileStores {
	stores := &projectFileStores{
		SourceFiles:              make(map[string]NormalizedProjectFile),
		lookupTSConfigSet:        map[string]struct{}{},
		propertyTSConfigSet:      map[string]struct{}{},
		providedTSConfigPatterns: append([]pathPattern(nil), filters.providedTSPaths...),
		PackageJSONs:             map[string]dependencyManifest{},
		DenoJSONs:                map[string]dependencyManifest{},
		DenoJSONCs:               map[string]dependencyManifest{},
		NodeVersionSignalByDir:   map[string]string{},
		DirnameToParent:          map[string]string{},
		usingExplicitSourceFiles: len(input.Files) > 0,
	}

	stores.DirnameToParent[input.Config.BaseDir] = ""
	if len(input.Files) > 0 {
		stores.SourceFiles = cloneNormalizedProjectFileMap(input.Files)
		stores.OrderedSourceFiles = append([]string(nil), input.OrderedFiles...)
	}

	return stores
}

func (s *projectFileStores) tsConfigs() []string {
	if len(s.propertyTSConfigs) > 0 {
		return s.propertyTSConfigs
	}
	return s.lookupTSConfigs
}

func (s *projectFileStores) addDiscoveredTSConfig(tsconfig string) {
	normalized := tspath.NormalizePath(tsconfig)
	if len(s.propertyTSConfigs) > 0 {
		s.addPropertyTSConfig(normalized)
		return
	}
	s.addLookupTSConfig(normalized)
}

func (s *projectFileStores) processDirectory(dir string) {
	normalized := tspath.NormalizePath(dir)
	if normalized == "" {
		return
	}
	if _, ok := s.DirnameToParent[normalized]; ok {
		return
	}
	s.DirnameToParent[normalized] = tspath.GetDirectoryPath(normalized)
}

func (s *projectFileStores) processFile(
	filePath string,
	input *NormalizedAnalyzeProjectInput,
	fsys vfs.FS,
	filters analyzeProjectFilters,
) error {
	normalized := tspath.NormalizePath(filePath)
	baseName := strings.ToLower(tspath.GetBaseFileName(normalized))

	if filters.matchesProvidedTSConfig(normalized) {
		s.addPropertyTSConfig(normalized)
	}
	if baseName == tsconfigJSONName {
		s.addLookupTSConfig(normalized)
	}

	switch baseName {
	case packageJSONName, denoJSONName, denoJSONCName:
		if content, ok := fsys.ReadFile(normalized); ok {
			s.recordManifest(normalized, baseName, content)
		}
	}

	if s.usingExplicitSourceFiles || !filters.isJsTsFile(normalized) {
		return nil
	}

	fileType, ok := filters.filterPathAndGetFileType(normalized)
	if !ok {
		return nil
	}

	content, readOK := fsys.ReadFile(normalized)
	if !readOK {
		return nil
	}

	if _, exists := s.SourceFiles[normalized]; exists {
		return nil
	}

	s.SourceFiles[normalized] = NormalizedProjectFile{
		CanonicalPath: normalized,
		OriginalPath:  normalized,
		Content:       content,
		HasContent:    true,
		FileType:      fileType,
		FileStatus:    pb.FileStatus_FILE_STATUS_SAME,
	}
	s.OrderedSourceFiles = append(s.OrderedSourceFiles, normalized)
	return nil
}

func (s *projectFileStores) recordManifest(filePath string, manifestName string, content string) {
	dir := tspath.GetDirectoryPath(filePath)
	manifest := dependencyManifest{
		Path:    filePath,
		Content: content,
	}

	switch manifestName {
	case packageJSONName:
		s.PackageJSONs[dir] = manifest
	case denoJSONName:
		s.DenoJSONs[dir] = manifest
	case denoJSONCName:
		s.DenoJSONCs[dir] = manifest
	}
}

func (s *projectFileStores) addLookupTSConfig(tsconfig string) {
	if _, ok := s.lookupTSConfigSet[tsconfig]; ok {
		return
	}
	s.lookupTSConfigSet[tsconfig] = struct{}{}
	s.lookupTSConfigs = append(s.lookupTSConfigs, tsconfig)
}

func (s *projectFileStores) addPropertyTSConfig(tsconfig string) {
	if _, ok := s.propertyTSConfigSet[tsconfig]; ok {
		return
	}
	s.propertyTSConfigSet[tsconfig] = struct{}{}
	s.propertyTSConfigs = append(s.propertyTSConfigs, tsconfig)
}

func (s *projectFileStores) postProcess(config NormalizedProjectConfiguration) {
	if len(s.providedTSConfigPatterns) > 0 && len(s.propertyTSConfigs) == 0 {
		s.Warnings = append(s.Warnings, "Failed to find any of the provided tsconfig.json files: "+strings.Join(config.TsConfigPaths, ", "))
	}

	sort.Strings(s.lookupTSConfigs)
	sort.SliceStable(s.propertyTSConfigs, func(i int, j int) bool {
		leftRank := s.providedTSConfigRank(s.propertyTSConfigs[i])
		rightRank := s.providedTSConfigRank(s.propertyTSConfigs[j])
		if leftRank != rightRank {
			return leftRank < rightRank
		}
		return s.propertyTSConfigs[i] < s.propertyTSConfigs[j]
	})

	if !s.usingExplicitSourceFiles {
		s.OrderedSourceFiles = uniqueSortedStrings(s.OrderedSourceFiles)
	}
}

func (s *projectFileStores) providedTSConfigRank(tsconfig string) int {
	normalized := normalizedMatchPath(tsconfig)
	for index, pattern := range s.providedTSConfigPatterns {
		if pattern.re.MatchString(normalized) {
			return index
		}
	}
	return -1
}

func walkProjectTree(
	fsys vfs.FS,
	root string,
	filters analyzeProjectFilters,
	onDirectory func(dir string),
	onFile func(filePath string) error,
) error {
	root = tspath.NormalizePath(root)
	if root == "" || !fsys.DirectoryExists(root) {
		return nil
	}

	stack := []string{root}
	seen := map[string]struct{}{root: {}}
	for len(stack) > 0 {
		dir := stack[len(stack)-1]
		stack = stack[:len(stack)-1]

		entries := fsys.GetAccessibleEntries(dir)
		for _, name := range uniqueSortedStrings(entries.Directories) {
			child := tspath.NormalizePath(tspath.CombinePaths(dir, name))
			if filters.isJsTsExcluded(child) {
				continue
			}
			onDirectory(child)
			if _, ok := seen[child]; ok || !fsys.DirectoryExists(child) {
				continue
			}
			seen[child] = struct{}{}
			stack = append(stack, child)
		}

		for _, name := range uniqueSortedStrings(entries.Files) {
			child := tspath.NormalizePath(tspath.CombinePaths(dir, name))
			if filters.isJsTsExcluded(child) {
				continue
			}
			if err := onFile(child); err != nil {
				return err
			}
		}
	}

	return nil
}

func cloneNormalizedProjectFileMap(files map[string]NormalizedProjectFile) map[string]NormalizedProjectFile {
	cloned := make(map[string]NormalizedProjectFile, len(files))
	for key, value := range files {
		cloned[key] = value
	}
	return cloned
}
