package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s1874_deprecation"
)

func TestDeprecationReportsDeprecatedUsage(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s1874_deprecation.DeprecationRule,
		nil,
		"file.ts",
		`
/** @deprecated */
function oldApi() {}

oldApi();
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) == 0 {
		t.Fatalf("expected at least one diagnostic, got %#v", diagnostics)
	}

	findDiagnosticByMessageID(t, diagnostics, "deprecation")
}

func TestDeprecationSkipsCurrentUsage(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s1874_deprecation.DeprecationRule,
		nil,
		"file.ts",
		`
function currentApi() {}

currentApi();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
