package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4324_return_any_type"
)

func TestS4324ReturnAnyTypeReportsPrimitiveReturn(t *testing.T) {
	t.Parallel()

	if s4324_return_any_type.ReturnAnyTypeRule.Name != "no-return-type-any" {
		t.Fatalf("unexpected rule name %q", s4324_return_any_type.ReturnAnyTypeRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s4324_return_any_type.ReturnAnyTypeRule,
		nil,
		"file.ts",
		`function returnNumericLiteral(): any { return 1; }`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "removeOrChangeType")
	if diagnostics[0].Message.Description != "Remove this return type or change it to a more specific." {
		t.Fatalf("unexpected message %q", diagnostics[0].Message.Description)
	}
	if got := diagnosticText(t, diagnostics[0]); got != ": any" {
		t.Fatalf("expected diagnostic text %q, got %q", ": any", got)
	}
}

func TestS4324ReturnAnyTypeSkipsUnionReturns(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s4324_return_any_type.ReturnAnyTypeRule,
		nil,
		"file.ts",
		`
function ternary(x: boolean): any {
  const y = x ? 1 : 2;
  return y;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestS4324ReturnAnyTypeReportsNestedFunctionDeclarations(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s4324_return_any_type.ReturnAnyTypeRule,
		nil,
		"file.ts",
		`
function outer(): number {
  if (false) {
    return -1;
  }

  function inner(): any {
    return "";
  }

  return 0;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "removeOrChangeType")
	if got := diagnosticText(t, diagnostics[0]); got != ": any" {
		t.Fatalf("expected diagnostic text %q, got %q", ": any", got)
	}
}
