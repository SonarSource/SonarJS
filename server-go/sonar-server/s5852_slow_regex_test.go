package main

import (
	"testing"

	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5852_slow_regex"
)

func TestS5852ReportsSlowRegexes(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5852_slow_regex.SlowRegexRule,
		nil,
		"file.ts",
		`/(a+)+$/;
/^\s+|\s+$/g;
'foo'.replace(/\s*$/, '');
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 3)
	for _, diagnostic := range diagnostics {
		if diagnostic.Message.Id != "issue" {
			t.Fatalf("unexpected diagnostic %#v", diagnostic)
		}
	}
	assertS5852IssueLocation(t, diagnostics[0], 1, 0, 1, 8)
	assertS5852IssueLocation(t, diagnostics[1], 2, 0, 2, 12)
	assertS5852IssueLocation(t, diagnostics[2], 3, 14, 3, 20)
}

func TestS5852ReportsImplicitStringRegexMethodsWithoutDuplicatingRegexLiterals(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5852_slow_regex.SlowRegexRule,
		nil,
		"file.ts",
		`'foo'.replace(/\s*$/, '');
'foo'.search('\\s*$');
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	assertS5852IssueLocation(t, diagnostics[0], 1, 14, 1, 20)
	assertS5852IssueLocation(t, diagnostics[1], 2, 13, 2, 20)
}

func TestS5852SkipsLinearRegexes(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5852_slow_regex.SlowRegexRule,
		nil,
		"file.ts",
		`/x*x*/;
/a*b*/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func assertS5852IssueLocation(
	t *testing.T,
	diagnostic rulepkg.RuleDiagnostic,
	wantLine int,
	wantColumn int,
	wantEndLine int,
	wantEndColumn int,
) {
	t.Helper()

	gotLine, gotColumn := offsetToLineColumn(diagnostic.SourceFile.Text(), diagnostic.Range.Pos())
	gotEndLine, gotEndColumn := offsetToLineColumn(diagnostic.SourceFile.Text(), diagnostic.Range.End())
	if gotLine != wantLine || gotColumn != wantColumn || gotEndLine != wantEndLine || gotEndColumn != wantEndColumn {
		t.Fatalf(
			"expected diagnostic location %d:%d-%d:%d, got %d:%d-%d:%d for %#v",
			wantLine,
			wantColumn,
			wantEndLine,
			wantEndColumn,
			gotLine,
			gotColumn,
			gotEndLine,
			gotEndColumn,
			diagnostic,
		)
	}
}

func offsetToLineColumn(text string, offset int) (int, int) {
	line := 1
	column := 0
	for index := 0; index < offset && index < len(text); index++ {
		if text[index] == '\n' {
			line++
			column = 0
			continue
		}
		column++
	}
	return line, column
}
