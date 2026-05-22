package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s1529_bitwise_and_or_in_condition"
)

func TestS1529BitwiseAndOrInConditionReportsLonelySuspiciousCondition(t *testing.T) {
	t.Parallel()

	if s1529_bitwise_and_or_in_condition.BitwiseAndOrInConditionRule.Name != "bitwise-operators" {
		t.Fatalf("unexpected rule name %q", s1529_bitwise_and_or_in_condition.BitwiseAndOrInConditionRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s1529_bitwise_and_or_in_condition.BitwiseAndOrInConditionRule,
		nil,
		"file.ts",
		`
function f(a: any, b: any) {
  if (a | b) {
  }

  const c: string | number = 2;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "bitwiseOperator")
	if diagnostics[0].Message.Description != `Review this use of bitwise "|" operator; conditional "||" might have been intended.` {
		t.Fatalf("unexpected message %q", diagnostics[0].Message.Description)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "|" {
		t.Fatalf("expected diagnostic text %q, got %q", "|", got)
	}
}

func TestS1529BitwiseAndOrInConditionSkipsNumericOperands(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s1529_bitwise_and_or_in_condition.BitwiseAndOrInConditionRule,
		nil,
		"file.ts",
		`
let a = 1;
let b = 5;
if (a & b) {
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestS1529BitwiseAndOrInConditionSkipsFilesWithSeveralBitwiseOperations(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s1529_bitwise_and_or_in_condition.BitwiseAndOrInConditionRule,
		nil,
		"file.ts",
		`
declare const a: any;
declare const b: any;
declare const c: any;

if (a & b) {
}

if (a | c) {
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
