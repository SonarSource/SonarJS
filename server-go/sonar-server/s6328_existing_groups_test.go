package main

import "testing"

func TestS6328ReportsMissingNumericGroups(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"existing-groups",
		nil,
		"file.ts",
		`'str'.replace(/(\d+)/, '$0');`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
	if got := diagnostics[0].Message.Description; got != "Referencing non-existing group: $0." {
		t.Fatalf("unexpected message %q", got)
	}
}

func TestS6328ReportsMissingNamedGroups(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"existing-groups",
		nil,
		"file.ts",
		`'str'.replace(/(?<first>\w+)\s(?<second>\w+)/, '$<first> $<third> $<second> $<fourth>');`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
	if got := diagnostics[0].Message.Description; got != "Referencing non-existing groups: $<third>, $<fourth>." {
		t.Fatalf("unexpected message %q", got)
	}
}

func TestS6328SkipsExistingGroups(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"existing-groups",
		nil,
		"file.ts",
		`'str'.replace(/(?<first>\w+)\s(?<second>\w+)/, '$<first> $<second>');`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
