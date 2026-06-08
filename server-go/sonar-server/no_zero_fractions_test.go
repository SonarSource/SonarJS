package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_zero_fractions"
)

func TestNoZeroFractionsReportsZeroFraction(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_zero_fractions.NoZeroFractionsRule,
		nil,
		"file.ts",
		`
const value = 1.0;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "zero-fraction")
	if got := diagnosticText(t, diagnostics[0]); got != ".0" {
		t.Fatalf("expected zero-fraction diagnostic on .0, got %q", got)
	}
}

func TestNoZeroFractionsReportsDanglingDot(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_zero_fractions.NoZeroFractionsRule,
		nil,
		"file.ts",
		`
const value = 1.;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "dangling-dot")
	if got := diagnosticText(t, diagnostics[0]); got != "." {
		t.Fatalf("expected dangling-dot diagnostic on ., got %q", got)
	}
}

func TestNoZeroFractionsSkipsMeaningfulFraction(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_zero_fractions.NoZeroFractionsRule,
		nil,
		"file.ts",
		`
const value = 1.5;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
