package main

import "testing"

func TestS3800ReportsMixedReturnTypes(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"function-return-type",
		nil,
		"file.ts",
		`
function foo(condition: boolean) {
  if (condition) {
    return 42;
  }
  return "str";
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "functionReturnType")
	if len(diagnostics[0].LabeledRanges) != 2 {
		t.Fatalf("expected 2 secondary return locations, got %#v", diagnostics[0].LabeledRanges)
	}
	if diagnostics[0].LabeledRanges[0].Label != "Returns number" {
		t.Fatalf("unexpected first label %#v", diagnostics[0].LabeledRanges)
	}
	if diagnostics[0].LabeledRanges[1].Label != "Returns string" {
		t.Fatalf("unexpected second label %#v", diagnostics[0].LabeledRanges)
	}
}

func TestS3800SkipsSanitizationReturnUnion(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"function-return-type",
		nil,
		"file.ts",
		`
const sanitize = (condition: boolean) => {
  return condition ? true : "Value should be a string";
};
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
