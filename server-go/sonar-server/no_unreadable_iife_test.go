package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unreadable_iife"
)

func TestNoUnreadableIifeReportsParenthesizedArrowBody(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_unreadable_iife.NoUnreadableIifeRule,
		nil,
		"file.ts",
		`
const value = (() => (1))();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-unreadable-iife")
	if got := diagnosticText(t, diagnostics[0]); got != "(1)" {
		t.Fatalf("expected diagnostic on parenthesized arrow body, got %q", got)
	}
}

func TestNoUnreadableIifeReportsNestedParenthesizedArrowBody(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_unreadable_iife.NoUnreadableIifeRule,
		nil,
		"file.ts",
		`
const value = (() => ((1 + 2)))();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-unreadable-iife")
	if got := diagnosticText(t, diagnostics[0]); got != "((1 + 2))" {
		t.Fatalf("expected diagnostic on full parenthesized arrow body, got %q", got)
	}
}

func TestNoUnreadableIifeSkipsReadableCases(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_unreadable_iife.NoUnreadableIifeRule,
		nil,
		"file.ts",
		`
const expressionBody = (() => 1)();
const blockBody = (() => { return 1; })();
const functionIife = (function () { return (1); })();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
