package main

import "testing"

func TestNoUndefinedArgumentReportsUndefinedPassedToOptionalParameter(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-undefined-argument",
		nil,
		"file.ts",
		`
function foo(p: number, q = 42) {}
foo(1, undefined);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "removeUndefined")
}

func TestNoUndefinedArgumentAllowsUndefinedForRequiredParameter(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-undefined-argument",
		nil,
		"file.ts",
		`
function foo(value: number | undefined) {}
foo(undefined);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
