package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_sequences"
)

func TestNoSequencesReportsUnparenthesizedSequence(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_sequences.NoSequencesRule,
		nil,
		"file.ts",
		`
function select(left: number, right: number) {
  return left, right;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpectedCommaExpression")
	if got := diagnosticText(t, diagnostics[0]); got != "," {
		t.Fatalf("expected diagnostic range to cover the first comma, got %q", got)
	}
}

func TestNoSequencesAllowsParenthesizedSequenceByDefault(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_sequences.NoSequencesRule,
		nil,
		"file.ts",
		`
function select(left: number, right: number) {
  return (left, right);
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoSequencesRequiresExtraParensInIfCondition(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_sequences.NoSequencesRule,
		nil,
		"file.ts",
		`
function select(left: number, right: number) {
  if (left, right) {
    return right;
  }
  return left;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpectedCommaExpression")
}

func TestNoSequencesAllowsForUpdateSequence(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_sequences.NoSequencesRule,
		nil,
		"file.ts",
		`
let left = 0;
let right = 0;

for (; left < 3; left++, right++) {
  right += 1;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
