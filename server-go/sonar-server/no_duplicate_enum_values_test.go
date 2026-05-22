package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_duplicate_enum_values"
)

func TestNoDuplicateEnumValuesReportsDuplicateStringLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_duplicate_enum_values.NoDuplicateEnumValuesRule,
		nil,
		"file.ts",
		`
enum Status {
  Ready = 'ready',
  Done = 'ready',
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "duplicateValue")
}

func TestNoDuplicateEnumValuesAllowsUnsupportedComputedMembers(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_duplicate_enum_values.NoDuplicateEnumValuesRule,
		nil,
		"file.ts",
		`
declare const suffix: string;

enum Status {
  Ready = `+"`ready${suffix}`"+`,
  Done = `+"`ready${suffix}`"+`,
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
