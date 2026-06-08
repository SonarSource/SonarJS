package main

import "testing"

func TestS3796ReportsArrayCallbackWithoutReturn(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"array-callback-without-return",
		nil,
		"file.ts",
		`
const arr = [1, 2];
arr.map(function(x) { x * 2; });
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "arrayCallbackWithoutReturn")
}

func TestS3796SkipsAsyncCallback(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"array-callback-without-return",
		nil,
		"file.ts",
		`
const arr = [1, 2];
arr.map(async value => { await Promise.resolve(value); });
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
