package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_await_expression_member"
)

func TestNoAwaitExpressionMemberReportsPropertyAccess(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_await_expression_member.NoAwaitExpressionMemberRule,
		nil,
		"file.ts",
		`
async function readValue(promise: Promise<{ value: number }>) {
  return (await promise).value;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-await-expression-member")
	if got := diagnosticText(t, diagnostics[0]); got != "value" {
		t.Fatalf("expected property access diagnostic on member name, got %q", got)
	}
}

func TestNoAwaitExpressionMemberReportsElementAccess(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_await_expression_member.NoAwaitExpressionMemberRule,
		nil,
		"file.ts",
		`
async function readValue(promise: Promise<number[]>) {
  return (await promise)[0];
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-await-expression-member")
	if got := diagnosticText(t, diagnostics[0]); got != "0" {
		t.Fatalf("expected element access diagnostic on index expression, got %q", got)
	}
}

func TestNoAwaitExpressionMemberSkipsSeparatedAwaitResult(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_await_expression_member.NoAwaitExpressionMemberRule,
		nil,
		"file.ts",
		`
async function readValue(promise: Promise<{ value: number }>) {
  const result = await promise;
  return result.value;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
