package main

import (
	"sync"
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/linter"
	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/fixtures"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2871_no_alphabetical_sort"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
)

func TestNoAlphabeticalSortReportsNumericArraySortWithoutComparator(t *testing.T) {
	t.Parallel()

	diagnostics := s2871RunRuleOnCode(
		t,
		s2871_no_alphabetical_sort.NoAlphabeticalSortRule,
		nil,
		"file.ts",
		`
const values = [80, 3, 9];
values.sort();
`,
		"tsconfig.minimal.json",
		"",
	)

	s2871AssertSingleDiagnosticMessageID(t, diagnostics, "provideCompareFunction")
	suggestions := diagnostics[0].GetSuggestions()
	if len(suggestions) != 1 {
		t.Fatalf("expected 1 suggestion, got %#v", suggestions)
	}
	if got := suggestions[0].Fixes()[0].Text; got != "values.sort((a, b) => (a - b))" {
		t.Fatalf("unexpected suggestion fix %q", got)
	}
}

func TestNoAlphabeticalSortReportsStringArraySortWithoutComparator(t *testing.T) {
	t.Parallel()

	diagnostics := s2871RunRuleOnCode(
		t,
		s2871_no_alphabetical_sort.NoAlphabeticalSortRule,
		nil,
		"file.ts",
		`
const values = ['foo', 'bar'];
values.sort();
`,
		"tsconfig.minimal.json",
		"",
	)

	s2871AssertSingleDiagnosticMessageID(t, diagnostics, "provideCompareFunctionForArrayOfStrings")
	suggestions := diagnostics[0].GetSuggestions()
	if len(suggestions) != 1 {
		t.Fatalf("expected 1 suggestion, got %#v", suggestions)
	}
	if got := suggestions[0].Fixes()[0].Text; got != "values.sort((a, b) => a.localeCompare(b))" {
		t.Fatalf("unexpected suggestion fix %q", got)
	}
}

func TestNoAlphabeticalSortSkipsJsonStringifySortComparison(t *testing.T) {
	t.Parallel()

	diagnostics := s2871RunRuleOnCode(
		t,
		s2871_no_alphabetical_sort.NoAlphabeticalSortRule,
		nil,
		"file.ts",
		`
function sameOrder(a: string[], b: string[]) {
  return JSON.stringify(a.sort()) === JSON.stringify(b.sort());
}
`,
		"tsconfig.minimal.json",
		"",
	)

	s2871AssertDiagnosticCount(t, diagnostics, 0)
}

var s2871DirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func s2871RunRuleOnCode(
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

	fs := utils.NewOverlayVFS(s2871DirectRuleTestFS, overlays)
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

func s2871AssertDiagnosticCount(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want int) {
	t.Helper()

	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func s2871AssertSingleDiagnosticMessageID(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want string) {
	t.Helper()

	s2871AssertDiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}
