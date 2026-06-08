package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_octal_escape"
)

func TestNoOctalEscapeReportsOctalEscapeSequence(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_octal_escape.NoOctalEscapeRule,
		nil,
		"repro.js",
		`
const value = '\251';
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "octalEscapeSequence")
}

func TestNoOctalEscapeAllowsNullEscapeWithoutFollowingDigit(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_octal_escape.NoOctalEscapeRule,
		nil,
		"repro.js",
		`
const value = '\0';
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
