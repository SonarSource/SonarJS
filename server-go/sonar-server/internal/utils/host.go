package utils

import (
	"strings"
	"time"

	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/core"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/collections"
	"github.com/microsoft/typescript-go/shim/parser"
	"github.com/microsoft/typescript-go/shim/tsoptions"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
)

var _ compiler.CompilerHost = (*compilerHost)(nil)

type compilerHost struct {
	currentDirectory          string
	fs                        vfs.FS
	defaultLibraryPath        string
	extendedConfigCache       tsoptions.ExtendedConfigCache
	trace                     func(msg *ast.DiagnosticsMessage, args ...any)
	resolvedProjectReferences collections.SyncMap[tspath.Path, *tsoptions.ParsedCommandLine]
}

type CompilerHostOption func(*compilerHostConfig)

type compilerHostConfig struct {
	baseDir                       string
	skipNodeModulesOutsideBaseDir bool
}

type nodeModuleBoundary struct {
	baseDir            string
	caseSensitive      bool
	currentDirectory   string
	defaultLibraryPath string
	enabled            bool
}

type nodeModuleBoundaryFS struct {
	base     vfs.FS
	boundary nodeModuleBoundary
}

var _ vfs.FS = (*nodeModuleBoundaryFS)(nil)

func WithSkipNodeModuleLookupOutsideBaseDir(baseDir string) CompilerHostOption {
	return func(config *compilerHostConfig) {
		config.baseDir = baseDir
		config.skipNodeModulesOutsideBaseDir = true
	}
}

func NewCachedFSCompilerHost(
	currentDirectory string,
	fs vfs.FS,
	defaultLibraryPath string,
	extendedConfigCache tsoptions.ExtendedConfigCache,
	trace func(msg *ast.DiagnosticsMessage, args ...any),
	options ...CompilerHostOption,
) compiler.CompilerHost {
	return NewCompilerHost(
		currentDirectory,
		cachedvfs.From(fs),
		defaultLibraryPath,
		extendedConfigCache,
		trace,
		options...,
	)
}

func NewCompilerHost(
	currentDirectory string,
	fs vfs.FS,
	defaultLibraryPath string,
	extendedConfigCache tsoptions.ExtendedConfigCache,
	trace func(msg *ast.DiagnosticsMessage, args ...any),
	options ...CompilerHostOption,
) compiler.CompilerHost {
	if trace == nil {
		trace = func(msg *ast.DiagnosticsMessage, args ...any) {}
	}

	config := newCompilerHostConfig(options)
	boundary := newNodeModuleBoundary(
		currentDirectory,
		defaultLibraryPath,
		fs.UseCaseSensitiveFileNames(),
		config,
	)
	if boundary.enabled {
		fs = &nodeModuleBoundaryFS{
			base:     fs,
			boundary: boundary,
		}
	}

	return &compilerHost{
		currentDirectory:    currentDirectory,
		fs:                  fs,
		defaultLibraryPath:  defaultLibraryPath,
		extendedConfigCache: extendedConfigCache,
		trace:               trace,
	}
}

func (h *compilerHost) FS() vfs.FS {
	return h.fs
}

func (h *compilerHost) DefaultLibraryPath() string {
	return h.defaultLibraryPath
}

func (h *compilerHost) GetCurrentDirectory() string {
	return h.currentDirectory
}

func (h *compilerHost) Trace(msg *ast.DiagnosticsMessage, args ...any) {
	h.trace(msg, args...)
}

var sourceFileCache collections.SyncMap[SourceFileCacheKey, *ast.SourceFile]

type SourceFileCacheKey struct {
	opts       ast.SourceFileParseOptions
	text       string
	scriptKind core.ScriptKind
}

func GetSourceFileCacheKey(opts ast.SourceFileParseOptions, text string, scriptKind core.ScriptKind) SourceFileCacheKey {
	return SourceFileCacheKey{
		opts:       opts,
		text:       text,
		scriptKind: scriptKind,
	}
}

func (h *compilerHost) GetSourceFile(opts ast.SourceFileParseOptions) *ast.SourceFile {
	text, ok := h.FS().ReadFile(opts.FileName)
	if !ok {
		return nil
	}

	scriptKind := core.GetScriptKindFromFileName(opts.FileName)
	if scriptKind == core.ScriptKindUnknown {
		panic("Unknown script kind for file  " + opts.FileName)
	}

	key := GetSourceFileCacheKey(opts, text, scriptKind)

	if cached, ok := sourceFileCache.Load(key); ok {
		return cached
	}

	sourceFile := parser.ParseSourceFile(opts, text, scriptKind)
	result, _ := sourceFileCache.LoadOrStore(key, sourceFile)
	return result
}

func (h *compilerHost) GetResolvedProjectReference(fileName string, path tspath.Path) *tsoptions.ParsedCommandLine {
	if cached, ok := h.resolvedProjectReferences.Load(path); ok {
		return cached
	}
	commandLine, _ := tsoptions.GetParsedCommandLineOfConfigFilePath(fileName, path, nil, nil, h, h.extendedConfigCache)
	result, _ := h.resolvedProjectReferences.LoadOrStore(path, commandLine)
	return result
}

func newCompilerHostConfig(options []CompilerHostOption) compilerHostConfig {
	config := compilerHostConfig{}
	for _, option := range options {
		if option != nil {
			option(&config)
		}
	}
	return config
}

func newNodeModuleBoundary(
	currentDirectory string,
	defaultLibraryPath string,
	caseSensitive bool,
	config compilerHostConfig,
) nodeModuleBoundary {
	if !config.skipNodeModulesOutsideBaseDir {
		return nodeModuleBoundary{}
	}

	baseDir := config.baseDir
	if baseDir == "" {
		baseDir = currentDirectory
	}

	return nodeModuleBoundary{
		baseDir:            normalizeCompilerHostPath(baseDir, currentDirectory),
		caseSensitive:      caseSensitive,
		currentDirectory:   currentDirectory,
		defaultLibraryPath: normalizeCompilerHostPath(defaultLibraryPath, currentDirectory),
		enabled:            true,
	}
}

func normalizeCompilerHostPath(path string, currentDirectory string) string {
	if path == "" {
		return ""
	}
	if bundled.IsBundled(path) {
		return path
	}

	normalized := tspath.NormalizeSlashes(path)
	if currentDirectory != "" && !tspath.PathIsAbsolute(normalized) && !tspath.IsRootedDiskPath(normalized) {
		normalized = tspath.ResolvePath(currentDirectory, normalized)
	}
	return tspath.NormalizePath(normalized)
}

func (b nodeModuleBoundary) normalizeForComparison(path string) string {
	normalized := normalizeCompilerHostPath(path, b.currentDirectory)
	if !b.caseSensitive {
		return strings.ToLower(normalized)
	}
	return normalized
}

func (b nodeModuleBoundary) shouldSkip(path string) bool {
	if !b.enabled {
		return false
	}

	normalized := b.normalizeForComparison(path)
	if normalized == "" {
		return false
	}
	if hasPathPrefix(normalized, b.normalizeForComparison(b.defaultLibraryPath)) {
		return false
	}

	return strings.Contains(normalized, "/node_modules/") &&
		!hasPathPrefix(normalized, b.normalizeForComparison(b.baseDir))
}

func hasPathPrefix(path string, prefix string) bool {
	if prefix == "" {
		return false
	}
	if path == prefix {
		return true
	}
	if strings.HasSuffix(prefix, "/") {
		return strings.HasPrefix(path, prefix)
	}
	return strings.HasPrefix(path, prefix+"/")
}

func (fs *nodeModuleBoundaryFS) UseCaseSensitiveFileNames() bool {
	return fs.base.UseCaseSensitiveFileNames()
}

func (fs *nodeModuleBoundaryFS) FileExists(path string) bool {
	if fs.boundary.shouldSkip(path) {
		return false
	}
	return fs.base.FileExists(path)
}

func (fs *nodeModuleBoundaryFS) ReadFile(path string) (contents string, ok bool) {
	if fs.boundary.shouldSkip(path) {
		return "", false
	}
	return fs.base.ReadFile(path)
}

func (fs *nodeModuleBoundaryFS) WriteFile(path string, data string) error {
	return fs.base.WriteFile(path, data)
}

func (fs *nodeModuleBoundaryFS) Remove(path string) error {
	return fs.base.Remove(path)
}

func (fs *nodeModuleBoundaryFS) Chtimes(path string, aTime time.Time, mTime time.Time) error {
	return fs.base.Chtimes(path, aTime, mTime)
}

func (fs *nodeModuleBoundaryFS) DirectoryExists(path string) bool {
	if fs.boundary.shouldSkip(path) {
		return false
	}
	return fs.base.DirectoryExists(path)
}

func (fs *nodeModuleBoundaryFS) GetAccessibleEntries(path string) vfs.Entries {
	if fs.boundary.shouldSkip(path) {
		return vfs.Entries{}
	}
	return fs.base.GetAccessibleEntries(path)
}

func (fs *nodeModuleBoundaryFS) Stat(path string) vfs.FileInfo {
	if fs.boundary.shouldSkip(path) {
		return nil
	}
	return fs.base.Stat(path)
}

func (fs *nodeModuleBoundaryFS) WalkDir(root string, walkFn vfs.WalkDirFunc) error {
	if fs.boundary.shouldSkip(root) {
		return nil
	}
	return fs.base.WalkDir(root, walkFn)
}

func (fs *nodeModuleBoundaryFS) Realpath(path string) string {
	return fs.base.Realpath(path)
}
