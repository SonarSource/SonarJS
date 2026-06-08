package main

import (
	"sync"
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/linter"
	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/fixtures"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3403_different_types_comparison"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
)

func TestDifferentTypesComparisonReportsStrictEqualityOnDissimilarTypes(t *testing.T) {
	t.Parallel()

	diagnostics := s3403RunRuleOnCode(
		t,
		s3403_different_types_comparison.DifferentTypesComparisonRule,
		nil,
		"file.ts",
		`
const str = 'str';
const num = 5;

str === num;
`,
		"tsconfig.minimal.json",
		"",
	)

	s3403AssertSingleDiagnosticMessageID(t, diagnostics, "differentTypesComparison")
	if len(diagnostics[0].LabeledRanges) != 2 {
		t.Fatalf("expected 2 labeled ranges, got %#v", diagnostics[0].LabeledRanges)
	}
	suggestions := diagnostics[0].GetSuggestions()
	if len(suggestions) != 1 {
		t.Fatalf("expected 1 suggestion, got %#v", suggestions)
	}
	if got := suggestions[0].Fixes()[0].Text; got != "==" {
		t.Fatalf("unexpected suggestion fix %q", got)
	}
}

func TestDifferentTypesComparisonSkipsDefensiveIndexedNullishCheck(t *testing.T) {
	t.Parallel()

	diagnostics := s3403RunRuleOnCode(
		t,
		s3403_different_types_comparison.DifferentTypesComparisonRule,
		nil,
		"file.ts",
		`
const items = ['a'];
if (items[0] === undefined) {
  doSomething();
}
function doSomething() {}
`,
		"tsconfig.noUncheckedIndexedAccess.json",
		"",
	)

	s3403AssertDiagnosticCount(t, diagnostics, 0)
}

var s3403DirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func s3403RunRuleOnCode(
	t *testing.T,
	availableRule rulepkg.Rule,
	options any,
	fileName string,
	code string,
	tsconfigName string,
	tsconfigContent string,
) []rulepkg.RuleDiagnostic {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	filePath := tspath.ResolvePath(rootDir, fileName)
	overlays := map[string]string{filePath: code}
	if tsconfigContent != "" {
		overlays[tspath.ResolvePath(rootDir, tsconfigName)] = tsconfigContent
	}

	fs := utils.NewOverlayVFS(s3403DirectRuleTestFS, overlays)
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
		diagnostics []rulepkg.RuleDiagnostic
	)

	err = linter.RunLinterOnFile(
		utils.LogLevelNormal,
		program,
		sourceFile,
		[]linter.ConfiguredRule{{
			Name: availableRule.Name,
			Run: func(ctx rulepkg.RuleContext) rulepkg.RuleListeners {
				return availableRule.Run(ctx, options)
			},
		}},
		func(diagnostic rulepkg.RuleDiagnostic) {
			mu.Lock()
			defer mu.Unlock()
			diagnostics = append(diagnostics, diagnostic)
		},
		func(diagnostic.Internal) {},
		linter.Fixes{Fix: false, FixSuggestions: false},
		linter.TypeErrors{ReportSyntactic: false, ReportSemantic: false},
	)
	if err != nil {
		t.Fatalf("unexpected linter error: %v", err)
	}

	return diagnostics
}

func s3403AssertDiagnosticCount(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want int) {
	t.Helper()

	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func s3403AssertSingleDiagnosticMessageID(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want string) {
	t.Helper()

	s3403AssertDiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}
