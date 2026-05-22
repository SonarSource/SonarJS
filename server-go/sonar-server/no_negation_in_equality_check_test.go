package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_negation_in_equality_check"
)

func TestNoNegationInEqualityCheckReportsNegatedLeftOperand(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_negation_in_equality_check.NoNegationInEqualityCheckRule,
		nil,
		"file.ts",
		`
const ready = true;
const done = false;

if (!ready === done) {
  console.log('mismatch');
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-negation-in-equality-check/error")
}

func TestNoNegationInEqualityCheckHandlesParenthesizedNegation(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_negation_in_equality_check.NoNegationInEqualityCheckRule,
		nil,
		"file.ts",
		`
const ready = true;
const done = false;

if ((!ready) === done) {
  console.log('mismatch');
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-negation-in-equality-check/error")
}

func TestNoNegationInEqualityCheckSkipsDoubleNegation(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_negation_in_equality_check.NoNegationInEqualityCheckRule,
		nil,
		"file.ts",
		`
const ready = true;
const done = false;

if (!!ready === done) {
  console.log('ok');
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
