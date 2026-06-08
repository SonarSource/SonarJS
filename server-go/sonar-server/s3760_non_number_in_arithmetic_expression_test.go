package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3760_non_number_in_arithmetic_expression"
)

func TestS3760NonNumberInArithmeticExpressionReportsPlusWithSecondary(t *testing.T) {
	t.Parallel()

	if s3760_non_number_in_arithmetic_expression.NonNumberInArithmeticExpressionRule.Name != "non-number-in-arithmetic-expression" {
		t.Fatalf("unexpected rule name %q", s3760_non_number_in_arithmetic_expression.NonNumberInArithmeticExpressionRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s3760_non_number_in_arithmetic_expression.NonNumberInArithmeticExpressionRule,
		nil,
		"file.ts",
		`
const num = 42;
const flag = true;
num + flag;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxSingleDiagnosticMessageID(t, diagnostics, "convertOperand")
	if diagnostics[0].Message.Description != "Convert this operand into a number." {
		t.Fatalf("unexpected message %q", diagnostics[0].Message.Description)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "flag" {
		t.Fatalf("expected diagnostic text %q, got %q", "flag", got)
	}
	if len(diagnostics[0].LabeledRanges) != 1 {
		t.Fatalf("expected one secondary location, got %#v", diagnostics[0].LabeledRanges)
	}
	if got := diagnostics[0].SourceFile.Text()[diagnostics[0].LabeledRanges[0].Range.Pos():diagnostics[0].LabeledRanges[0].Range.End()]; got != "num" {
		t.Fatalf("expected secondary text %q, got %q", "num", got)
	}
}

func TestS3760NonNumberInArithmeticExpressionReportsArithmeticOperands(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3760_non_number_in_arithmetic_expression.NonNumberInArithmeticExpressionRule,
		nil,
		"file.ts",
		`
const left = new Date();
const right = new Date();
left / right;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxSingleDiagnosticMessageID(t, diagnostics, "convertOperands")
	if got := diagnosticText(t, diagnostics[0]); got != "left / right" {
		t.Fatalf("expected diagnostic text %q, got %q", "left / right", got)
	}
	if len(diagnostics[0].LabeledRanges) != 2 {
		t.Fatalf("expected two secondary locations, got %#v", diagnostics[0].LabeledRanges)
	}
}

func TestS3760NonNumberInArithmeticExpressionSkipsDateMinusDate(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3760_non_number_in_arithmetic_expression.NonNumberInArithmeticExpressionRule,
		nil,
		"file.ts",
		`
const left = new Date();
const right = new Date();
left - right;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxDiagnosticCount(t, diagnostics, 0)
}

func TestS3760NonNumberInArithmeticExpressionReportsUnaryOperand(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3760_non_number_in_arithmetic_expression.NonNumberInArithmeticExpressionRule,
		nil,
		"file.ts",
		`
const text = "42";
-text;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxSingleDiagnosticMessageID(t, diagnostics, "convertOperand")
	if got := diagnosticText(t, diagnostics[0]); got != "text" {
		t.Fatalf("expected diagnostic text %q, got %q", "text", got)
	}
}
