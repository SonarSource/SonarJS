package utils

import (
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"sync"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/collections"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/tsoptions"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs"
)

type TsConfigResolver struct {
	fs               vfs.FS
	currentDirectory string

	mu      sync.RWMutex
	configs map[tspath.Path]*tsoptions.ParsedCommandLine
}

func NewTsConfigResolver(fs vfs.FS, currentDirectory string) *TsConfigResolver {
	return &TsConfigResolver{
		fs:               fs,
		currentDirectory: currentDirectory,
		configs:          map[tspath.Path]*tsoptions.ParsedCommandLine{},
	}
}

// Finds the tsconfig.json that governs the given file.
func (r *TsConfigResolver) FindTsconfigForFile(
	filePath string,
	skipSearchInDirectoryOfFile bool,
) (configPath string, found bool) {
	configFileName := r.computeConfigFileName(filePath, skipSearchInDirectoryOfFile)
	if configFileName == "" {
		return "", false
	}

	normalizedPath := r.toPath(filePath)
	result := r.findConfigWithReferences(filePath, normalizedPath, configFileName, nil, nil)
	if result.configFileName == "" {
		return "", false
	}
	return result.configFileName, true
}

type configSearchResult struct {
	configFileName string
}

type searchNode struct {
	configFileName string
}

func (r *TsConfigResolver) findConfigWithReferences(
	fileName string,
	path tspath.Path,
	configFileName string,
	visited *collections.SyncSet[searchNode],
	fallback *configSearchResult,
) configSearchResult {
	var configs collections.SyncMap[tspath.Path, *tsoptions.ParsedCommandLine]
	if visited == nil {
		visited = &collections.SyncSet[searchNode]{}
	}

	search := BreadthFirstSearch(
		searchNode{configFileName: configFileName},
		func(node searchNode) []searchNode {
			configFilePath := r.toPath(node.configFileName)
			config, ok := configs.Load(configFilePath)
			if !ok || config == nil || len(config.ProjectReferences()) == 0 {
				return nil
			}

			references := config.ResolvedProjectReferencePaths()
			return Map(references, func(reference string) searchNode {
				return searchNode{configFileName: reference}
			})
		},
		func(node searchNode) (isResult bool, stop bool) {
			configFilePath := r.toPath(node.configFileName)
			config := r.loadConfig(node.configFileName, configFilePath)
			if config == nil {
				return false, false
			}

			configs.Store(configFilePath, config)
			if len(config.FileNames()) == 0 {
				return false, false
			}

			if config.CompilerOptions().Composite == core.TSTrue && !config.PossiblyMatchesFileName(fileName) {
				return false, false
			}

			if slices.ContainsFunc(config.FileNames(), func(file string) bool {
				if r.fs.UseCaseSensitiveFileNames() {
					if file == string(path) {
						return true
					}
				} else if strings.EqualFold(file, string(path)) {
					return true
				}

				pathBaseName := filepath.Base(string(path))
				fileBaseName := filepath.Base(file)
				if r.fs.UseCaseSensitiveFileNames() {
					if fileBaseName != pathBaseName {
						return false
					}
				} else if !strings.EqualFold(fileBaseName, pathBaseName) {
					return false
				}

				return r.toPath(file) == path
			}) {
				return true, true
			}

			return false, false
		},
		BreadthFirstSearchOptions[searchNode]{
			Visited: visited,
			PreprocessLevel: func(level *BreadthFirstSearchLevel[searchNode]) {
				level.Range(func(node searchNode) bool {
					return true
				})
			},
		},
	)

	tsconfig := ""
	if len(search.Path) > 0 {
		tsconfig = search.Path[0].configFileName
	}

	if search.Stopped {
		return configSearchResult{configFileName: tsconfig}
	}
	if tsconfig != "" {
		fallback = &configSearchResult{configFileName: tsconfig}
	}

	if config := r.loadConfig(configFileName, r.toPath(configFileName)); config != nil &&
		config.CompilerOptions().DisableSolutionSearching.IsTrue() {
		if fallback != nil {
			return *fallback
		}
		return configSearchResult{}
	}

	if ancestorConfigName := r.computeConfigFileName(configFileName, true); ancestorConfigName != "" {
		return r.findConfigWithReferences(
			fileName,
			path,
			ancestorConfigName,
			visited,
			fallback,
		)
	}
	if fallback != nil {
		return *fallback
	}

	return configSearchResult{}
}

func (r *TsConfigResolver) computeConfigFileName(
	fileName string,
	skipSearchInDirectoryOfFile bool,
) string {
	if tspath.IsDynamicFileName(fileName) {
		return ""
	}

	searchPath := tspath.GetDirectoryPath(fileName)
	skipTSConfig := skipSearchInDirectoryOfFile
	skipJSConfig := skipSearchInDirectoryOfFile && !strings.HasSuffix(fileName, "/tsconfig.json")

	return forEachAncestorDirectory(searchPath, func(directory string) (string, bool) {
		if !skipTSConfig {
			tsconfigPath := tspath.CombinePaths(directory, "tsconfig.json")
			if r.fs.FileExists(tsconfigPath) {
				return tsconfigPath, true
			}
		}
		if !skipJSConfig {
			jsconfigPath := tspath.CombinePaths(directory, "jsconfig.json")
			if r.fs.FileExists(jsconfigPath) {
				return jsconfigPath, true
			}
		}
		if strings.HasSuffix(directory, "/node_modules") {
			return "", true
		}
		skipTSConfig = false
		skipJSConfig = false
		return "", false
	})
}

func (r *TsConfigResolver) loadConfig(
	configFileName string,
	configFilePath tspath.Path,
) *tsoptions.ParsedCommandLine {
	r.mu.RLock()
	config, ok := r.configs[configFilePath]
	r.mu.RUnlock()
	if ok {
		return config
	}

	parsed, diagnostics := tsoptions.GetParsedCommandLineOfConfigFilePath(
		configFileName,
		configFilePath,
		nil,
		nil,
		r,
		nil,
	)
	if len(diagnostics) > 0 && parsed == nil {
		r.mu.Lock()
		r.configs[configFilePath] = nil
		r.mu.Unlock()
		return nil
	}

	r.mu.Lock()
	r.configs[configFilePath] = parsed
	r.mu.Unlock()
	return parsed
}

type ResolutionResult struct {
	file   string
	config string
}

func (r *TsConfigResolver) work(in <-chan string, out chan<- ResolutionResult) {
	for file := range in {
		config := r.computeConfigFileName(file, false)
		if config == "" {
			out <- ResolutionResult{file: file}
			continue
		}

		fileNormalized := r.toPath(file)
		result := r.findConfigWithReferences(file, fileNormalized, config, nil, nil)
		out <- ResolutionResult{
			config: result.configFileName,
			file:   file,
		}
	}
}

func (r *TsConfigResolver) FindTsConfigParallel(fileNames []string) map[string]string {
	in := make(chan string, len(fileNames))
	out := make(chan ResolutionResult, len(fileNames))

	numWorker := runtime.GOMAXPROCS(0)

	var wg sync.WaitGroup
	for range numWorker {
		wg.Go(func() {
			r.work(in, out)
		})
	}

	for i := range fileNames {
		in <- fileNames[i]
	}
	close(in)

	go func() {
		wg.Wait()
		close(out)
	}()

	res := make(map[string]string, len(fileNames))
	for result := range out {
		res[result.file] = result.config
	}

	return res
}

func (r *TsConfigResolver) toPath(fileName string) tspath.Path {
	return tspath.ToPath(fileName, r.currentDirectory, r.fs.UseCaseSensitiveFileNames())
}

func (r *TsConfigResolver) FS() vfs.FS {
	return r.fs
}

func (r *TsConfigResolver) GetCurrentDirectory() string {
	return r.currentDirectory
}

func forEachAncestorDirectory(
	start string,
	visit func(directory string) (result string, stop bool),
) string {
	directory := start
	for {
		result, stop := visit(directory)
		if stop {
			return result
		}

		parent := tspath.GetDirectoryPath(directory)
		if parent == directory {
			return ""
		}
		directory = parent
	}
}
