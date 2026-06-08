package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3003_string_lexicographic_comparison"
)

func TestS3003StringLexicographicComparisonReportsStringComparison(t *testing.T) {
	t.Parallel()

	if s3003_string_lexicographic_comparison.StringLexicographicComparisonRule.Name != "strings-comparison" {
		t.Fatalf("unexpected rule name %q", s3003_string_lexicographic_comparison.StringLexicographicComparisonRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s3003_string_lexicographic_comparison.StringLexicographicComparisonRule,
		nil,
		"file.ts",
		`
let str1 = 'hello', str2 = 'world';
str1 < str2;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "convertOperands")
	if diagnostics[0].Message.Description != `Convert operands of this use of "<" to number type.` {
		t.Fatalf("unexpected message %q", diagnostics[0].Message.Description)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "<" {
		t.Fatalf("expected diagnostic text %q, got %q", "<", got)
	}
	if len(diagnostics[0].LabeledRanges) != 2 {
		t.Fatalf("expected two secondary locations, got %#v", diagnostics[0].LabeledRanges)
	}
	if got := diagnostics[0].SourceFile.Text()[diagnostics[0].LabeledRanges[0].Range.Pos():diagnostics[0].LabeledRanges[0].Range.End()]; got != "str1" {
		t.Fatalf("expected first secondary text %q, got %q", "str1", got)
	}
	if got := diagnostics[0].SourceFile.Text()[diagnostics[0].LabeledRanges[1].Range.Pos():diagnostics[0].LabeledRanges[1].Range.End()]; got != "str2" {
		t.Fatalf("expected second secondary text %q, got %q", "str2", got)
	}
}

func TestS3003StringLexicographicComparisonSkipsSingleCharacterLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3003_string_lexicographic_comparison.StringLexicographicComparisonRule,
		nil,
		"file.ts",
		`
let str = 'hello';
str < 'h';
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestS3003StringLexicographicComparisonSkipsSortCallbacks(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3003_string_lexicographic_comparison.StringLexicographicComparisonRule,
		nil,
		"file.ts",
		`
['foo', 'bar', 'baz'].sort((a, b) => a < b);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
