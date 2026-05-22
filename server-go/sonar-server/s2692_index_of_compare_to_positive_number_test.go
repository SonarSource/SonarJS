package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2692_index_of_compare_to_positive_number"
)

func TestIndexOfCompareToPositiveNumberReportsArrayCheck(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s2692_index_of_compare_to_positive_number.IndexOfCompareToPositiveNumberRule,
		nil,
		"file.ts",
		`
const values = ['alpha', 'beta'];

values.indexOf('beta') > 0;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "considerIncludes")
}

func TestIndexOfCompareToPositiveNumberAllowsNonPositiveComparison(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s2692_index_of_compare_to_positive_number.IndexOfCompareToPositiveNumberRule,
		nil,
		"file.ts",
		`
const values = ['alpha', 'beta'];

values.indexOf('beta') > -1;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
