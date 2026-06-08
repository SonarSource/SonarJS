package main

import "testing"

func TestNoIgnoredReturnReportsMap(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-ignored-return",
		nil,
		"file.ts",
		`
const values = [1, 2, 3];
values.map(value => value * 2);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "useForEach")
}

func TestNoIgnoredReturnAllowsReplaceCallback(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-ignored-return",
		nil,
		"file.ts",
		`
function callback(): string {
  return '';
}

'abc'.replace(/ab/, callback);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoIgnoredReturnAllowsFindAssignmentCallback(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-ignored-return",
		nil,
		"file.ts",
		`
const values = [1, 2, 3];
let found: number | undefined;

values.find(value => {
  found = value;
  return value > 1;
});
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoIgnoredReturnReportsPureFindCallback(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-ignored-return",
		nil,
		"file.ts",
		`
const values = [1, 2, 3];
values.find(value => value > 1);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "returnValueMustBeUsed")
}
