package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3758_values_not_convertible_to_numbers"
)

func TestS3758ValuesNotConvertibleToNumbersReportsInvalidOperands(t *testing.T) {
	t.Parallel()

	if s3758_values_not_convertible_to_numbers.ValuesNotConvertibleToNumbersRule.Name != "values-not-convertible-to-numbers" {
		t.Fatalf("unexpected rule name %q", s3758_values_not_convertible_to_numbers.ValuesNotConvertibleToNumbersRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s3758_values_not_convertible_to_numbers.ValuesNotConvertibleToNumbersRule,
		nil,
		"file.ts",
		`
const left = new Object();
const right = {};
left < right;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxDiagnosticCount(t, diagnostics, 2)
	if diagnostics[0].Message.Id != "reEvaluateDataFlow" || diagnostics[1].Message.Id != "reEvaluateDataFlow" {
		t.Fatalf("unexpected diagnostics %#v", diagnostics)
	}
}

func TestS3758ValuesNotConvertibleToNumbersReportsTypeName(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3758_values_not_convertible_to_numbers.ValuesNotConvertibleToNumbersRule,
		nil,
		"file.ts",
		`42 > undefined;`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxSingleDiagnosticMessageID(t, diagnostics, "reEvaluateDataFlow")
	if got := diagnostics[0].Message.Description; got != "Re-evaluate the data flow; this operand of a numeric comparison could be of type undefined." {
		t.Fatalf("unexpected message %q", got)
	}
}

func TestS3758ValuesNotConvertibleToNumbersSkipsStringsAndMemberAccess(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3758_values_not_convertible_to_numbers.ValuesNotConvertibleToNumbersRule,
		nil,
		"file.ts",
		`
declare const obj: { value: unknown };
"foo" > "bar";
obj.value >= 42;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxDiagnosticCount(t, diagnostics, 0)
}
