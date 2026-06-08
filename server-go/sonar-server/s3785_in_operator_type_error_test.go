package main

import "testing"

func TestS3785ReportsPrimitiveRightOperand(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"in-operator-type-error",
		nil,
		"file.ts",
		`
const invalid = "name" in 1;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "inOperatorTypeError")
	if len(diagnostics[0].LabeledRanges) != 1 {
		t.Fatalf("expected operator secondary location, got %#v", diagnostics[0].LabeledRanges)
	}
}

func TestS3785SkipsObjectRightOperand(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"in-operator-type-error",
		nil,
		"file.ts",
		`
const valid = "name" in { name: 1 };
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
