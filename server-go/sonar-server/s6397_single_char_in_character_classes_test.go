package main

import "testing"

func TestS6397ReportsSingleCharacterClasses(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"single-char-in-character-classes",
		nil,
		"file.ts",
		`/a[b]d/; /[\w]/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	if got := diagnosticText(t, diagnostics[0]); got != "[b]" {
		t.Fatalf("unexpected first diagnostic text %q", got)
	}
	if got := diagnosticText(t, diagnostics[1]); got != `[\w]` {
		t.Fatalf("unexpected second diagnostic text %q", got)
	}
}

func TestS6397SkipsExceptionsAndNegatedClasses(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"single-char-in-character-classes",
		nil,
		"file.ts",
		`/[[]/; /[^a]/; /[$\w]/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
