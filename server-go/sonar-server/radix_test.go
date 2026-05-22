package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/radix"
)

func TestRadixReportsMissingParameters(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		radix.RadixRule,
		nil,
		"file.ts",
		`
parseInt();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "missingParameters")
}

func TestRadixReportsMissingRadixByDefault(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		radix.RadixRule,
		nil,
		"file.ts",
		`
parseInt("11");
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "missingRadix")
}

func TestRadixReportsInvalidNumberParseIntRadix(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		radix.RadixRule,
		nil,
		"file.ts",
		`
Number.parseInt("11", 1);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "invalidRadix")
}

func TestRadixReportsRedundantRadixInAsNeededMode(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		radix.RadixRule,
		"as-needed",
		"file.ts",
		`
parseInt("11", 10);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "redundantRadix")
}

func TestRadixSkipsShadowedParseInt(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		radix.RadixRule,
		nil,
		"file.ts",
		`
const parseInt = (value: string) => value.length;
parseInt("11");
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
