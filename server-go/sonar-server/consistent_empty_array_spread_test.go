package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/consistent_empty_array_spread"
)

func TestConsistentEmptyArraySpreadReportsEmptyArrayAgainstString(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		consistent_empty_array_spread.ConsistentEmptyArraySpreadRule,
		nil,
		"file.ts",
		`
const values = [...(true ? [] : 'abc')];
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "consistent-empty-array-spread")
	if diagnostics[0].Message.Description != "Prefer using empty string since the alternate is a string." {
		t.Fatalf("unexpected message: %q", diagnostics[0].Message.Description)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "[]" {
		t.Fatalf("expected diagnostic on empty array branch, got %q", got)
	}
}

func TestConsistentEmptyArraySpreadReportsEmptyStringAgainstArray(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		consistent_empty_array_spread.ConsistentEmptyArraySpreadRule,
		nil,
		"file.ts",
		`
const values = [...(true ? '' : [1])];
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "consistent-empty-array-spread")
	if diagnostics[0].Message.Description != "Prefer using empty array since the alternate is an array." {
		t.Fatalf("unexpected message: %q", diagnostics[0].Message.Description)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "''" {
		t.Fatalf("expected diagnostic on empty string branch, got %q", got)
	}
}

func TestConsistentEmptyArraySpreadReportsConstIdentifierInitializedWithLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		consistent_empty_array_spread.ConsistentEmptyArraySpreadRule,
		nil,
		"file.ts",
		`
const fallback = 'abc';
const values = [...(true ? [] : fallback)];
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "consistent-empty-array-spread")
	if diagnostics[0].Message.Description != "Prefer using empty string since the alternate is a string." {
		t.Fatalf("unexpected message: %q", diagnostics[0].Message.Description)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "[]" {
		t.Fatalf("expected diagnostic on empty array branch, got %q", got)
	}
}

func TestConsistentEmptyArraySpreadSkipsConsistentTypes(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		consistent_empty_array_spread.ConsistentEmptyArraySpreadRule,
		nil,
		"file.ts",
		`
const values = [...(true ? [] : [])];
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestConsistentEmptyArraySpreadSkipsDynamicTypedBranch(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		consistent_empty_array_spread.ConsistentEmptyArraySpreadRule,
		nil,
		"file.ts",
		`
declare function getText(): string;

const text = getText();
const values = [...(true ? [] : text)];
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
