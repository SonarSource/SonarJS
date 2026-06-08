package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_ternary"
)

func TestNoTernaryReportsConditionalExpression(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_ternary.NoTernaryRule,
		nil,
		"file.ts",
		`
const value = flag ? 1 : 0;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noTernaryOperator")
}

func TestNoTernarySkipsNonConditionalExpressions(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_ternary.NoTernaryRule,
		nil,
		"file.ts",
		`
const value = flag && 1;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
