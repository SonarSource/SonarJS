package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_dupe_args"
)

func TestNoDupeArgsReportsDuplicateFunctionParameter(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_dupe_args.NoDupeArgsRule,
		nil,
		"file.ts",
		`
function duplicate(a, b, a) {
  return a + b;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpected")
	if got := diagnostics[0].Message.Description; got != "Duplicate param 'a'." {
		t.Fatalf("unexpected diagnostic description %q", got)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "(a, b, a)" {
		t.Fatalf("unexpected diagnostic text %q", got)
	}
}

func TestNoDupeArgsReportsDuplicateDestructuredMethodParameter(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_dupe_args.NoDupeArgsRule,
		nil,
		"file.ts",
		`
const service = {
  handle({ value: first, other: first }) {
    return first;
  },
};
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpected")
	if got := diagnostics[0].Message.Description; got != "Duplicate param 'first'." {
		t.Fatalf("unexpected diagnostic description %q", got)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "({ value: first, other: first })" {
		t.Fatalf("unexpected diagnostic text %q", got)
	}
}

func TestNoDupeArgsReportsEachDuplicatedNameOnce(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_dupe_args.NoDupeArgsRule,
		nil,
		"file.ts",
		`
function duplicate(a, b, a, b) {
  return a + b;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	if got := diagnostics[0].Message.Description; got != "Duplicate param 'a'." {
		t.Fatalf("unexpected first diagnostic description %q", got)
	}
	if got := diagnostics[1].Message.Description; got != "Duplicate param 'b'." {
		t.Fatalf("unexpected second diagnostic description %q", got)
	}
}

func TestNoDupeArgsSkipsDistinctParameters(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_dupe_args.NoDupeArgsRule,
		nil,
		"file.ts",
		`
function valid(first, { second: alias }, ...rest) {
  return [first, alias, rest];
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
