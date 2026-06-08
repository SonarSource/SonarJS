package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_non_null_assertion"
)

func TestNoNonNullAssertionReportsNonNullExpression(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_non_null_assertion.NoNonNullAssertionRule,
		nil,
		"file.ts",
		`
declare const value: string | undefined;
const size = value!.length;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noNonNull")
	if got := diagnosticText(t, diagnostics[0]); got != "value!" {
		t.Fatalf("expected diagnostic range to cover value!, got %q", got)
	}
}

func TestNoNonNullAssertionSkipsRegularAccess(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_non_null_assertion.NoNonNullAssertionRule,
		nil,
		"file.ts",
		`
declare const value: string;
const size = value.length;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
