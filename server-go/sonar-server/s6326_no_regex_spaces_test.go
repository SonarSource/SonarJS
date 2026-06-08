package main

import "testing"

func TestS6326ReportsRegexRunsOfSpaces(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-regex-spaces",
		nil,
		"file.ts",
		`/a   b /;`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
	if got := diagnostics[0].Message.Description; got != "If multiple spaces are required here, use number quantifier ({3})." {
		t.Fatalf("unexpected message %q", got)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "   " {
		t.Fatalf("unexpected diagnostic text %q", got)
	}
}

func TestS6326SkipsCharacterClasses(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-regex-spaces",
		nil,
		"file.ts",
		`/[   ]/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
