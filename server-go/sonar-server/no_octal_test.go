package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_octal"
)

func TestNoOctalReportsLegacyOctalLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_octal.NoOctalRule,
		nil,
		"repro.js",
		`
const value = 0123;
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noOctal")
}

func TestNoOctalSkipsExplicitOctalSyntax(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_octal.NoOctalRule,
		nil,
		"repro.js",
		`
const value = 0o123;
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
