package main

import "testing"

func TestS4043ReportsAssignedReverseCall(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-misleading-array-reverse",
		nil,
		"file.ts",
		`
const values = [1, 2, 3];
const reversed = values.reverse();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "moveMethod")
}

func TestS4043SkipsReturnedReverseCall(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-misleading-array-reverse",
		nil,
		"file.ts",
		`
function reverse(values: number[]) {
  return values.reverse();
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
