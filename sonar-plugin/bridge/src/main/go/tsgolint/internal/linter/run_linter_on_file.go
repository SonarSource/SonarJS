package linter

import (
	"fmt"

	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/typescript-eslint/tsgolint/internal/diagnostic"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

// RunLinterOnFile lets callers own program creation and per-file rule selection.
func RunLinterOnFile(
	logLevel utils.LogLevel,
	program *compiler.Program,
	file *ast.SourceFile,
	rules []ConfiguredRule,
	onDiagnostic func(diagnostic rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
	fixState Fixes,
	typeErrors TypeErrors,
) error {
	if program == nil {
		return fmt.Errorf("program is nil")
	}
	if file == nil {
		return fmt.Errorf("source file is nil")
	}
	if program.GetSourceFile(file.FileName()) == nil {
		return fmt.Errorf("expected file %q to be in program", file.FileName())
	}

	return RunLinterOnProgram(
		logLevel,
		program,
		[]*ast.SourceFile{file},
		1,
		func(*ast.SourceFile) []ConfiguredRule {
			return rules
		},
		onDiagnostic,
		onInternalDiagnostic,
		fixState,
		typeErrors,
	)
}
