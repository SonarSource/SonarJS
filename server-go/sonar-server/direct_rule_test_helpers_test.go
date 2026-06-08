package main

import (
	"sync"
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/linter"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/fixtures"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
)

var cachedDirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func runDirectRuleOnCode(
	t *testing.T,
	availableRule rule.Rule,
	options any,
	fileName string,
	code string,
	tsconfigName string,
	tsconfigContent string,
) []rule.RuleDiagnostic {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	filePath := tspath.ResolvePath(rootDir, fileName)
	overlays := map[string]string{filePath: code}
	if tsconfigContent != "" {
		overlays[tspath.ResolvePath(rootDir, tsconfigName)] = tsconfigContent
	}

	fs := utils.NewOverlayVFS(cachedDirectRuleTestFS, overlays)
	host := utils.CreateCompilerHost(rootDir, fs)

	program, _, err := utils.CreateProgram(true, fs, rootDir, tsconfigName, host, false)
	if err != nil {
		t.Fatalf("could not create program: %v", err)
	}

	sourceFile := program.GetSourceFile(filePath)
	if sourceFile == nil {
		t.Fatalf("could not load source file %q", filePath)
	}

	var (
		mu          sync.Mutex
		diagnostics []rule.RuleDiagnostic
	)
	err = linter.RunLinterOnFile(
		utils.LogLevelNormal,
		program,
		sourceFile,
		[]linter.ConfiguredRule{{
			Name: availableRule.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return availableRule.Run(ctx, options)
			},
		}},
		func(diagnostic rule.RuleDiagnostic) {
			mu.Lock()
			defer mu.Unlock()
			diagnostics = append(diagnostics, diagnostic)
		},
		func(d diagnostic.Internal) {},
		linter.Fixes{Fix: false, FixSuggestions: false},
		linter.TypeErrors{ReportSyntactic: false, ReportSemantic: false},
	)
	if err != nil {
		t.Fatalf("unexpected linter error: %v", err)
	}

	return diagnostics
}

func findDiagnosticByMessageID(t *testing.T, diagnostics []rule.RuleDiagnostic, want string) rule.RuleDiagnostic {
	t.Helper()

	for _, diagnostic := range diagnostics {
		if diagnostic.Message.Id == want {
			return diagnostic
		}
	}

	t.Fatalf("could not find diagnostic %q in %#v", want, diagnostics)
	return rule.RuleDiagnostic{}
}

func diagnosticText(t *testing.T, diagnostic rule.RuleDiagnostic) string {
	t.Helper()

	return diagnostic.SourceFile.Text()[diagnostic.Range.Pos():diagnostic.Range.End()]
}

func findIdentifierInDiagnosticRange(t *testing.T, sourceFile *ast.SourceFile, text string) *ast.Node {
	t.Helper()

	return findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) && node.AsIdentifier().Text == text
	})
}
