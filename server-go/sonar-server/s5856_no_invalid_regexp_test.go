package main

import "testing"

func TestS5856ReportsInvalidPatternInRegExpConstructor(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-invalid-regexp",
		nil,
		"file.ts",
		`new RegExp("([");`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
	if got := diagnostics[0].Message.Description; got != "Invalid regular expression: /([/: Unterminated character class" {
		t.Fatalf("unexpected message %q", got)
	}
}

func TestS5856ReportsInvalidPatternInStringMatch(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-invalid-regexp",
		nil,
		"file.ts",
		`'xxx'.match("([");`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
	if got := diagnostics[0].Message.Description; got != "Invalid regular expression: /([/: Unterminated character class" {
		t.Fatalf("unexpected message %q", got)
	}
}

func TestS5856ReportsInvalidFlags(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-invalid-regexp",
		nil,
		"file.ts",
		`new RegExp("\\(\\[", "a");`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
	if got := diagnostics[0].Message.Description; got != "Invalid flags supplied to RegExp constructor 'a'" {
		t.Fatalf("unexpected message %q", got)
	}
}

func TestS5856SkipsValidPatterns(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-invalid-regexp",
		nil,
		"file.ts",
		`
new RegExp("\\(\\[", "g");
'xxx'.match("\\(\\[");
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
