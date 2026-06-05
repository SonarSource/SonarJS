package utils

import (
	"errors"
	"fmt"
	"reflect"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/tsoptions"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs"
)

type ParsedCommandLineTransform func(config *tsoptions.ParsedCommandLine)

const (
	referencedProjectMustHaveCompositeDiagnosticCode int32 = 6306
	referencedProjectMayNotDisableEmitDiagnosticCode int32 = 6310
	tsbuildinfoOverwriteDiagnosticCode               int32 = 6377
)

func CreateCompilerHost(cwd string, fs vfs.FS) compiler.CompilerHost {
	defaultLibraryPath := bundled.LibPath()
	return NewCompilerHost(cwd, fs, defaultLibraryPath, nil, nil)
}

func enhanceHelpDiagnosticMessage(msg string) string {
	if strings.Contains(msg, "Please remove it from your configuration.") {
		return msg + "\n" + "See https://github.com/oxc-project/tsgolint/issues/351 for more information."

	}
	return msg
}

func ensureCompilerOptionPaths(options *core.CompilerOptions) bool {
	if options == nil {
		return false
	}
	if options.Paths != nil {
		return true
	}

	optionsValue := reflect.ValueOf(options)
	if optionsValue.Kind() != reflect.Pointer || optionsValue.IsNil() {
		return false
	}

	pathsField := optionsValue.Elem().FieldByName("Paths")
	if !pathsField.IsValid() || !pathsField.CanSet() || pathsField.Type().Kind() != reflect.Pointer {
		return false
	}

	pathsField.Set(reflect.New(pathsField.Type().Elem()))
	return options.Paths != nil
}

func applyLegacyBaseURLCompatibility(config *tsoptions.ParsedCommandLine) {
	if config == nil {
		return
	}

	options := config.CompilerOptions()
	if options == nil || options.BaseUrl == "" {
		return
	}

	baseURL := options.BaseUrl
	if options.Paths == nil {
		if !ensureCompilerOptionPaths(options) {
			return
		}
		options.Paths.Set("*", []string{"./*"})
	}

	options.PathsBasePath = baseURL
	options.BaseUrl = ""
}

func applyAnalysisOnlyCompilerOptions(config *tsoptions.ParsedCommandLine) {
	if config == nil {
		return
	}

	options := config.CompilerOptions()
	if options == nil {
		return
	}

	// The analyzer never emits build output, so emit-only diagnostics such as TS7's
	// inferred rootDir/outDir layout check should not block program creation.
	options.NoEmit = core.TSTrue
}

func shouldIgnoreAnalysisProgramDiagnostic(diag *ast.Diagnostic) bool {
	if diag == nil {
		return false
	}
	switch diag.Code() {
	case referencedProjectMustHaveCompositeDiagnosticCode,
		referencedProjectMayNotDisableEmitDiagnosticCode,
		tsbuildinfoOverwriteDiagnosticCode:
		return true
	default:
		return false
	}
}

func CreateProgram(
	singleThreaded bool,
	fs vfs.FS,
	cwd string,
	tsconfigPath string,
	host compiler.CompilerHost,
	suppressProgramDiagnostics bool,
	transforms ...ParsedCommandLineTransform,
) (*compiler.Program, []diagnostic.Internal, error) {
	resolvedConfigPath := tspath.ResolvePath(cwd, tsconfigPath)
	if !fs.FileExists(resolvedConfigPath) {
		return nil, nil, fmt.Errorf("couldn't read tsconfig at %v", resolvedConfigPath)
	}

	configParseResult, diagnostics := tsoptions.GetParsedCommandLineOfConfigFile(tsconfigPath, &core.CompilerOptions{}, nil, host, nil)

	if len(diagnostics) > 0 {
		internalDiags := make([]diagnostic.Internal, len(diagnostics))
		for i, d := range diagnostics {
			loc := d.Loc()
			var filePath string
			if d.File() != nil {
				filePath = d.File().FileName()
			}
			internalDiags[i] = diagnostic.Internal{
				Range:       core.NewTextRange(loc.Pos(), loc.End()),
				Id:          "tsconfig-error",
				Description: "Invalid tsconfig",
				Help:        GetDiagnosticMessage(d),
				FilePath:    &filePath,
			}
		}
		return nil, internalDiags, nil
	}

	for _, transform := range transforms {
		if transform != nil {
			transform(configParseResult)
		}
	}
	applyLegacyBaseURLCompatibility(configParseResult)
	applyAnalysisOnlyCompilerOptions(configParseResult)

	if len(configParseResult.Errors) > 0 && !suppressProgramDiagnostics {
		internalDiags := make([]diagnostic.Internal, len(configParseResult.Errors))
		for i, e := range configParseResult.Errors {
			loc := e.Loc()
			var filePath string
			if e.File() != nil {
				filePath = e.File().FileName()
			}
			internalDiags[i] = diagnostic.Internal{
				Range:       core.NewTextRange(loc.Pos(), loc.End()),
				Id:          "tsconfig-error",
				Description: "Invalid tsconfig",
				Help:        GetDiagnosticMessage(e),
				FilePath:    &filePath,
			}
		}
		return nil, internalDiags, nil
	}

	opts := compiler.ProgramOptions{
		Config:                      configParseResult,
		SingleThreaded:              core.TSTrue,
		Host:                        host,
		UseSourceOfProjectReference: true,
		// TODO: custom checker pool
		// CreateCheckerPool: func(p *compiler.Program) compiler.CheckerPool {},
	}
	if !singleThreaded {
		opts.SingleThreaded = core.TSFalse
	}
	program := compiler.NewProgram(opts)
	if program == nil {
		return nil, nil, errors.New("couldn't create program")
	}

	program_diagnostics := program.GetProgramDiagnostics()
	if !suppressProgramDiagnostics {
		filteredProgramDiagnostics := make([]*ast.Diagnostic, 0, len(program_diagnostics))
		for _, diag := range program_diagnostics {
			if shouldIgnoreAnalysisProgramDiagnostic(diag) {
				continue
			}
			filteredProgramDiagnostics = append(filteredProgramDiagnostics, diag)
		}
		program_diagnostics = filteredProgramDiagnostics
	}
	if len(program_diagnostics) > 0 && !suppressProgramDiagnostics {
		// Convert ast.Diagnostic to diagnostic.Internal
		internalDiags := make([]diagnostic.Internal, len(program_diagnostics))
		for i, d := range program_diagnostics {
			loc := d.Loc()
			var filePath string
			if d.File() != nil {
				filePath = d.File().FileName()
			}
			internalDiags[i] = diagnostic.Internal{
				Range:       core.NewTextRange(loc.Pos(), loc.End()),
				Id:          "tsconfig-error",
				Description: "Invalid tsconfig",
				Help:        enhanceHelpDiagnosticMessage(GetDiagnosticMessage(d)),
				FilePath:    &filePath,
			}
		}
		return nil, internalDiags, nil
	}

	// TODO: report syntactic diagnostics?

	program.BindSourceFiles()

	return program, nil, nil
}

func CreateInferredProjectProgram(
	singleThreaded bool,
	fs vfs.FS,
	cwd string,
	host compiler.CompilerHost,
	fileNames []string,
	inferredOptions ...*core.CompilerOptions,
) (*compiler.Program, []diagnostic.Internal, error) {
	compilerOptions := &core.CompilerOptions{
		AllowJs:       core.TSTrue,
		NoImplicitAny: core.TSTrue,
		Strict:        core.TSFalse,
		Lib:           []string{"lib.esnext.d.ts", "lib.dom.d.ts"},
	}
	if len(inferredOptions) > 0 && inferredOptions[0] != nil {
		compilerOptions = inferredOptions[0].Clone()
	}

	opts := compiler.ProgramOptions{
		Config: &tsoptions.ParsedCommandLine{
			ParsedConfig: &core.ParsedOptions{
				CompilerOptions: compilerOptions,
				FileNames:       fileNames,
			},
		},
		SingleThreaded: core.TSTrue,
		Host:           host,
	}
	if !singleThreaded {
		opts.SingleThreaded = core.TSFalse
	}
	program := compiler.NewProgram(opts)

	// TODO: report syntactic diagnostics?

	program.BindSourceFiles()
	return program, nil, nil
}
