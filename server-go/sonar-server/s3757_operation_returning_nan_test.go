package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3757_operation_returning_nan"
)

func TestS3757OperationReturningNaNReportsObjectOperands(t *testing.T) {
	t.Parallel()

	if s3757_operation_returning_nan.OperationReturningNaNRule.Name != "operation-returning-nan" {
		t.Fatalf("unexpected rule name %q", s3757_operation_returning_nan.OperationReturningNaNRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s3757_operation_returning_nan.OperationReturningNaNRule,
		nil,
		"file.ts",
		`
let x = 42 - [1, 2];
let y = [1, 2] - 42;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxDiagnosticCount(t, diagnostics, 2)
	if diagnostics[0].Message.Id != "noEvaluatedNaN" || diagnostics[1].Message.Id != "noEvaluatedNaN" {
		t.Fatalf("unexpected diagnostics %#v", diagnostics)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "[1, 2]" {
		t.Fatalf("expected first diagnostic text %q, got %q", "[1, 2]", got)
	}
	if got := diagnosticText(t, diagnostics[1]); got != "[1, 2]" {
		t.Fatalf("expected second diagnostic text %q, got %q", "[1, 2]", got)
	}
}

func TestS3757OperationReturningNaNSkipsDateAndWrapperObjects(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3757_operation_returning_nan.OperationReturningNaNRule,
		nil,
		"file.ts",
		`
const date1 = new Date();
const date2 = new Date();
const wrappedBoolean = new Boolean(true);

+date1;
date1 / date2;
wrappedBoolean - 1;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxDiagnosticCount(t, diagnostics, 0)
}

func TestS3757OperationReturningNaNReportsUnaryObjectUse(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3757_operation_returning_nan.OperationReturningNaNRule,
		nil,
		"file.ts",
		`
const values = [1, 2];
foo(+values);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxSingleDiagnosticMessageID(t, diagnostics, "noEvaluatedNaN")
	if got := diagnosticText(t, diagnostics[0]); got != "+values" {
		t.Fatalf("expected diagnostic text %q, got %q", "+values", got)
	}
}
