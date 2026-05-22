package s4328_no_implicit_dependencies

import (
	"encoding/json"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/scanner"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs"
)

const removeOrAddDependencyMessageID = "removeOrAddDependency"

type noImplicitDependenciesOptions struct {
	Whitelist []string `json:"whitelist"`
}

type dependencyManifest struct {
	Dependencies         map[string]any `json:"dependencies"`
	DevDependencies      map[string]any `json:"devDependencies"`
	PeerDependencies     map[string]any `json:"peerDependencies"`
	OptionalDependencies map[string]any `json:"optionalDependencies"`
	ModuleAliases        map[string]any `json:"_moduleAliases"`
	Imports              map[string]any `json:"imports"`
}

type dependencyState struct {
	fs              vfs.FS
	cwd             string
	sourceFile      *ast.SourceFile
	program         *compiler.Program
	dirDependencies map[string]map[string]struct{}
}

var nodeBuiltinPackages = map[string]struct{}{
	"_http_agent":         {},
	"_http_client":        {},
	"_http_common":        {},
	"_http_incoming":      {},
	"_http_outgoing":      {},
	"_http_server":        {},
	"_stream_duplex":      {},
	"_stream_passthrough": {},
	"_stream_readable":    {},
	"_stream_transform":   {},
	"_stream_wrap":        {},
	"_stream_writable":    {},
	"_tls_common":         {},
	"_tls_wrap":           {},
	"assert":              {},
	"async_hooks":         {},
	"buffer":              {},
	"child_process":       {},
	"cluster":             {},
	"console":             {},
	"constants":           {},
	"crypto":              {},
	"dgram":               {},
	"diagnostics_channel": {},
	"dns":                 {},
	"domain":              {},
	"events":              {},
	"fs":                  {},
	"http":                {},
	"http2":               {},
	"https":               {},
	"inspector":           {},
	"module":              {},
	"net":                 {},
	"os":                  {},
	"path":                {},
	"perf_hooks":          {},
	"process":             {},
	"punycode":            {},
	"querystring":         {},
	"readline":            {},
	"repl":                {},
	"stream":              {},
	"string_decoder":      {},
	"sys":                 {},
	"timers":              {},
	"tls":                 {},
	"trace_events":        {},
	"tty":                 {},
	"url":                 {},
	"util":                {},
	"v8":                  {},
	"vm":                  {},
	"wasi":                {},
	"worker_threads":      {},
	"zlib":                {},
}

func buildRemoveOrAddDependencyMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          removeOrAddDependencyMessageID,
		Description: "Either remove this import or add it as a dependency.",
	}
}

func newDependencyState(ctx rule.RuleContext) *dependencyState {
	if ctx.Program == nil || ctx.SourceFile == nil {
		return nil
	}

	host := ctx.Program.Host()
	return &dependencyState{
		fs:              host.FS(),
		cwd:             tspath.NormalizePath(host.GetCurrentDirectory()),
		sourceFile:      ctx.SourceFile,
		program:         ctx.Program,
		dirDependencies: map[string]map[string]struct{}{},
	}
}

func (s *dependencyState) dependenciesForFile() map[string]struct{} {
	fileName := tspath.NormalizePath(s.sourceFile.FileName())
	dir := tspath.GetDirectoryPath(fileName)
	dependencies := map[string]struct{}{}
	options := tspath.ComparePathsOptions{
		CurrentDirectory:          s.cwd,
		UseCaseSensitiveFileNames: s.fs.UseCaseSensitiveFileNames(),
	}

	for dir != "" && tspath.ContainsPath(s.cwd, dir, options) {
		for dependency := range s.dependenciesForDir(dir) {
			dependencies[dependency] = struct{}{}
		}

		if dir == s.cwd {
			break
		}
		parent := tspath.GetDirectoryPath(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return dependencies
}

func (s *dependencyState) dependenciesForDir(dir string) map[string]struct{} {
	if cached, ok := s.dirDependencies[dir]; ok {
		return cached
	}

	dependencies := map[string]struct{}{}
	for _, manifestName := range []string{"package.json", "deno.json", "deno.jsonc"} {
		manifestPath := tspath.CombinePaths(dir, manifestName)
		contents, ok := s.fs.ReadFile(manifestPath)
		if !ok {
			continue
		}
		addManifestDependencies(dependencies, contents)
		if manifestName == "deno.json" {
			break
		}
	}

	s.dirDependencies[dir] = dependencies
	return dependencies
}

func addManifestDependencies(target map[string]struct{}, contents string) {
	var manifest dependencyManifest
	trimmed := strings.TrimPrefix(contents, "\ufeff")
	if err := json.Unmarshal([]byte(trimmed), &manifest); err != nil {
		return
	}

	for _, dependencies := range []map[string]any{
		manifest.Dependencies,
		manifest.DevDependencies,
		manifest.PeerDependencies,
		manifest.OptionalDependencies,
	} {
		for dependency := range dependencies {
			addDependencyName(target, dependency)
		}
	}

	for alias := range manifest.ModuleAliases {
		addDependencyName(target, alias)
	}

	for alias, rawTarget := range manifest.Imports {
		targetValue, ok := rawTarget.(string)
		if !ok {
			continue
		}

		packageName, ok := parseInlineNPMImport(targetValue)
		if !ok {
			continue
		}
		addDependencyName(target, packageName)
		addDependencyName(target, alias)
	}
}

func addDependencyName(target map[string]struct{}, dependency string) {
	if dependency == "" {
		return
	}
	target[dependency] = struct{}{}
	if strings.HasPrefix(dependency, "@types/") {
		target[strings.TrimPrefix(dependency, "@types/")] = struct{}{}
	}
}

func parseInlineNPMImport(value string) (string, bool) {
	if !strings.HasPrefix(value, "npm:") {
		return "", false
	}

	moduleName := strings.TrimPrefix(value, "npm:")
	if moduleName == "" {
		return "", false
	}

	if strings.HasPrefix(moduleName, "@") {
		slashIndex := strings.IndexByte(moduleName, '/')
		if slashIndex <= 0 || slashIndex+1 >= len(moduleName) {
			return "", false
		}
		atIndex := strings.IndexByte(moduleName[slashIndex+1:], '@')
		if atIndex >= 0 {
			moduleName = moduleName[:slashIndex+1+atIndex]
		}
	} else if atIndex := strings.IndexByte(moduleName, '@'); atIndex >= 0 {
		moduleName = moduleName[:atIndex]
	}

	return getPackageName(moduleName), moduleName != ""
}

func sanitizeModuleName(moduleName string) string {
	moduleName = strings.SplitN(moduleName, "?", 2)[0]
	moduleName = strings.SplitN(moduleName, "#", 2)[0]
	return moduleName
}

func getPackageName(name string) string {
	parts := strings.Split(name, "/")
	if strings.HasPrefix(name, "@") && len(parts) >= 2 {
		return parts[0] + "/" + parts[1]
	}
	return parts[0]
}

func isAllowedImport(moduleName string, dependencies map[string]struct{}, whitelist map[string]struct{}) bool {
	if tspath.IsExternalModuleNameRelative(moduleName) {
		return true
	}

	if strings.HasPrefix(moduleName, "node:") ||
		strings.HasPrefix(moduleName, "data:") ||
		strings.HasPrefix(moduleName, "file:") {
		return true
	}

	if _, ok := parseInlineNPMImport(moduleName); ok {
		return true
	}

	packageName := getPackageName(moduleName)
	if _, ok := whitelist[packageName]; ok {
		return true
	}
	if _, ok := nodeBuiltinPackages[packageName]; ok {
		return true
	}
	if _, ok := dependencies[packageName]; ok {
		return true
	}

	return false
}

func resolvesToLocalImport(
	state *dependencyState,
	moduleName string,
	moduleSpecifier *ast.StringLiteralLike,
	mode core.ResolutionMode,
) bool {
	if state == nil {
		return false
	}

	if moduleSpecifier != nil {
		if resolved := state.program.GetResolvedModuleFromModuleSpecifier(state.sourceFile, moduleSpecifier); resolved != nil &&
			resolved.IsResolved() &&
			!resolved.IsExternalLibraryImport {
			return true
		}
	}

	resolved := state.program.ResolveModuleName(moduleName, state.sourceFile.FileName(), mode)
	return resolved != nil && resolved.IsResolved() && !resolved.IsExternalLibraryImport
}

var NoImplicitDependenciesRule = rule.Rule{
	Name: "no-implicit-dependencies",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		state := newDependencyState(ctx)
		if state == nil {
			return nil
		}

		opts := utils.UnmarshalOptions[noImplicitDependenciesOptions](options, "no-implicit-dependencies")
		whitelist := make(map[string]struct{}, len(opts.Whitelist))
		for _, dependency := range opts.Whitelist {
			whitelist[dependency] = struct{}{}
		}
		dependencies := state.dependenciesForFile()

		reportIfImplicitImport := func(
			moduleValue string,
			moduleSpecifier *ast.StringLiteralLike,
			reportRange core.TextRange,
			mode core.ResolutionMode,
		) {
			moduleName := sanitizeModuleName(moduleValue)
			if isAllowedImport(moduleName, dependencies, whitelist) {
				return
			}
			if resolvesToLocalImport(state, moduleName, moduleSpecifier, mode) {
				return
			}

			ctx.ReportRange(reportRange, buildRemoveOrAddDependencyMessage())
		}

		return rule.RuleListeners{
			ast.KindImportDeclaration: func(node *ast.Node) {
				importDecl := node.AsImportDeclaration()
				if importDecl.ModuleSpecifier == nil {
					return
				}
				reportIfImplicitImport(
					importDecl.ModuleSpecifier.Text(),
					importDecl.ModuleSpecifier,
					scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, node.Pos()),
					core.ResolutionModeESM,
				)
			},
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				callee := ast.SkipParentheses(callExpr.Expression)
				if !ast.IsIdentifier(callee) || callee.AsIdentifier().Text != "require" || len(callExpr.Arguments.Nodes) != 1 {
					return
				}

				moduleNode := ast.SkipParentheses(callExpr.Arguments.Nodes[0])
				if moduleNode == nil || (!ast.IsStringLiteral(moduleNode) && moduleNode.Kind != ast.KindNoSubstitutionTemplateLiteral) {
					return
				}

				reportIfImplicitImport(moduleNode.Text(), nil, callee.Loc, core.ResolutionModeCommonJS)
			},
		}
	},
}
