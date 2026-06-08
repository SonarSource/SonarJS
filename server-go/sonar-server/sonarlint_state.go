package main

import (
	"strings"

	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs"
)

const maxSonarlintOrphanPrograms = 10

type cachedProjectStores struct {
	baseDir          string
	tsConfigPathsKey string
	stores           *projectFileStores
}

type cachedOrphanProgram struct {
	program *compiler.Program
	options *core.CompilerOptions
}

type sonarlintState struct {
	projectStores      *cachedProjectStores
	configuredPrograms map[string]*compiler.Program
	orphanPrograms     []cachedOrphanProgram
}

func newSonarlintState() *sonarlintState {
	return &sonarlintState{
		configuredPrograms: map[string]*compiler.Program{},
	}
}

func shouldUseSonarlintState(config NormalizedProjectConfiguration) bool {
	return boolValue(config.SonarLint, false) && boolValue(config.CanAccessFileSystem, true)
}

func projectStoresForAnalysis(
	input *NormalizedAnalyzeProjectInput,
	fsys vfs.FS,
	state *sonarlintState,
) (*projectFileStores, error) {
	if state == nil || !shouldUseSonarlintState(input.Config) {
		return initializeProjectFileStores(input, fsys)
	}

	state.invalidateForRequest(input.Config)
	if state.projectStores != nil {
		return state.projectStores.stores, nil
	}

	stores, err := initializeProjectFileStores(discoveryInputWithoutExplicitFiles(input), fsys)
	if err != nil {
		return nil, err
	}

	state.projectStores = &cachedProjectStores{
		baseDir:          input.Config.BaseDir,
		tsConfigPathsKey: tsConfigPathsKey(input.Config.TsConfigPaths),
		stores:           stores,
	}
	return stores, nil
}

func discoveryInputWithoutExplicitFiles(input *NormalizedAnalyzeProjectInput) *NormalizedAnalyzeProjectInput {
	cloned := *input
	cloned.Files = map[string]NormalizedProjectFile{}
	cloned.OrderedFiles = nil
	cloned.PathMap = map[string]string{}
	return &cloned
}

func tsConfigPathsKey(paths []string) string {
	return strings.Join(paths, ",")
}

func (s *sonarlintState) invalidateForRequest(config NormalizedProjectConfiguration) {
	if s.projectStores == nil {
		return
	}

	currentKey := tsConfigPathsKey(config.TsConfigPaths)
	if s.projectStores.baseDir != config.BaseDir || s.projectStores.tsConfigPathsKey != currentKey {
		s.clearAll()
		return
	}

	if shouldClearTSConfigState(config, s.projectStores.stores) {
		s.clearTSConfigState()
		return
	}

	if shouldClearDependencyState(config) {
		s.clearDependencyState()
	}
}

func shouldClearTSConfigState(config NormalizedProjectConfiguration, stores *projectFileStores) bool {
	if boolValue(config.ClearTsConfigCache, false) {
		return true
	}

	for _, fileName := range config.FsEvents {
		if stores.shouldResetForTSConfigEvent(fileName) {
			return true
		}
	}
	return false
}

func shouldClearDependencyState(config NormalizedProjectConfiguration) bool {
	if boolValue(config.ClearDependenciesCache, false) {
		return true
	}

	for _, fileName := range config.FsEvents {
		switch strings.ToLower(tspath.GetBaseFileName(fileName)) {
		case packageJSONName, denoJSONName, denoJSONCName, pnpmWorkspaceYAMLName:
			return true
		}
	}
	return false
}

func (s *sonarlintState) clearAll() {
	s.projectStores = nil
	s.clearPrograms()
}

func (s *sonarlintState) clearTSConfigState() {
	s.projectStores = nil
	s.clearPrograms()
}

func (s *sonarlintState) clearDependencyState() {
	s.projectStores = nil
	s.clearPrograms()
}

func (s *sonarlintState) clearPrograms() {
	s.configuredPrograms = map[string]*compiler.Program{}
	s.orphanPrograms = nil
}

func (s *sonarlintState) getConfiguredProgram(
	tsconfig string,
	currentFile string,
	fsEvents []string,
) (*compiler.Program, bool) {
	program, ok := s.configuredPrograms[tsconfig]
	if ok && cachedProgramNeedsExternalInvalidation(program, currentFile, fsEvents) {
		delete(s.configuredPrograms, tsconfig)
		return nil, false
	}
	return program, ok
}

func (s *sonarlintState) setConfiguredProgram(tsconfig string, program *compiler.Program) {
	if s.configuredPrograms == nil {
		s.configuredPrograms = map[string]*compiler.Program{}
	}
	s.configuredPrograms[tsconfig] = program
}

func (s *sonarlintState) getOrphanProgramForFile(
	filePath string,
	options *core.CompilerOptions,
	fsEvents []string,
) (*compiler.Program, *core.CompilerOptions) {
	for index := len(s.orphanPrograms) - 1; index >= 0; index-- {
		cached := s.orphanPrograms[index]
		if cachedProgramNeedsExternalInvalidation(cached.program, filePath, fsEvents) {
			s.removeOrphanProgram(index)
			continue
		}
		if programSourceFileForPath(cached.program, filePath) == nil {
			continue
		}
		if !compilerOptionsEqual(cached.options, options) {
			continue
		}
		s.touchOrphanProgram(index)
		return cached.program, cloneCompilerOptions(cached.options)
	}
	return nil, nil
}

func (s *sonarlintState) setOrphanProgram(program *compiler.Program, options *core.CompilerOptions) {
	if program == nil {
		return
	}

	for index, cached := range s.orphanPrograms {
		if sameCachedOrphanProgram(cached, program, options) {
			s.orphanPrograms[index] = cachedOrphanProgram{
				program: program,
				options: cloneCompilerOptions(options),
			}
			s.touchOrphanProgram(index)
			return
		}
	}

	s.orphanPrograms = append(s.orphanPrograms, cachedOrphanProgram{
		program: program,
		options: cloneCompilerOptions(options),
	})
	if len(s.orphanPrograms) > maxSonarlintOrphanPrograms {
		s.orphanPrograms = append([]cachedOrphanProgram(nil), s.orphanPrograms[len(s.orphanPrograms)-maxSonarlintOrphanPrograms:]...)
	}
}

func (s *sonarlintState) touchOrphanProgram(index int) {
	if index < 0 || index >= len(s.orphanPrograms)-1 {
		return
	}

	program := s.orphanPrograms[index]
	copy(s.orphanPrograms[index:], s.orphanPrograms[index+1:])
	s.orphanPrograms[len(s.orphanPrograms)-1] = program
}

func (s *sonarlintState) removeOrphanProgram(index int) {
	if index < 0 || index >= len(s.orphanPrograms) {
		return
	}

	copy(s.orphanPrograms[index:], s.orphanPrograms[index+1:])
	s.orphanPrograms = s.orphanPrograms[:len(s.orphanPrograms)-1]
}

func sameCachedOrphanProgram(cached cachedOrphanProgram, program *compiler.Program, options *core.CompilerOptions) bool {
	return sameProgramSourceFiles(cached.program, program) && compilerOptionsEqual(cached.options, options)
}

func cachedProgramNeedsExternalInvalidation(
	program *compiler.Program,
	currentFile string,
	fsEvents []string,
) bool {
	if program == nil || len(fsEvents) == 0 {
		return false
	}

	normalizedCurrentFile := tspath.NormalizePath(currentFile)
	for _, fileName := range fsEvents {
		normalized := tspath.NormalizePath(fileName)
		if normalized == "" || normalized == normalizedCurrentFile {
			continue
		}
		if programSourceFileForPath(program, normalized) != nil {
			return true
		}
	}
	return false
}

func sameProgramSourceFiles(left *compiler.Program, right *compiler.Program) bool {
	if left == nil || right == nil {
		return false
	}

	leftFiles := left.GetSourceFiles()
	rightFiles := right.GetSourceFiles()
	if len(leftFiles) != len(rightFiles) {
		return false
	}

	for index := range leftFiles {
		if leftFiles[index].FileName() != rightFiles[index].FileName() {
			return false
		}
	}
	return true
}

func (s *projectFileStores) shouldResetForTSConfigEvent(fileName string) bool {
	normalized := tspath.NormalizePath(fileName)
	if normalized == "" {
		return false
	}

	for _, tsconfig := range s.tsConfigs() {
		if tsconfig == normalized {
			return true
		}
	}

	if s.usingLookupTSConfigs() {
		return strings.EqualFold(tspath.GetBaseFileName(normalized), tsconfigJSONName)
	}

	return s.matchesProvidedTSConfig(normalized)
}

func (s *projectFileStores) usingLookupTSConfigs() bool {
	return len(s.propertyTSConfigs) == 0
}

func (s *projectFileStores) matchesProvidedTSConfig(filePath string) bool {
	normalized := normalizedMatchPath(filePath)
	for _, pattern := range s.providedTSConfigPatterns {
		if pattern.re.MatchString(normalized) {
			return true
		}
	}
	return false
}
