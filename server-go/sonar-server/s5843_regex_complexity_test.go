package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5843_regex_complexity"
)

func TestS5843ReportsComplexRegexes(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5843_regex_complexity.RegexComplexityRule,
		map[string]any{"threshold": 0},
		"file.ts",
		`const literal = /a|b|c/;
const ctor = new RegExp('x*');
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	if diagnostics[0].Message.Id != "issue" || diagnostics[1].Message.Id != "issue" {
		t.Fatalf("unexpected diagnostic ids %#v", diagnostics)
	}
	if len(diagnostics[0].LabeledRanges) == 0 {
		t.Fatalf("expected secondary locations for alternation, got %#v", diagnostics[0])
	}
}

func TestS5843ReportsStringRegexMethods(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5843_regex_complexity.RegexComplexityRule,
		map[string]any{"threshold": 0},
		"file.ts",
		`'str'.search('x*');`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
}

func TestS5843SkipsSimpleRegexes(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5843_regex_complexity.RegexComplexityRule,
		map[string]any{"threshold": 0},
		"file.ts",
		`/abc/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
