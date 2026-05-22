package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_with"
)

func TestNoWithReportsWithStatement(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_with.NoWithRule,
		nil,
		"repro.js",
		`
with (scope) {
  value = total + 1;
}
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpectedWith")
}

func TestNoWithSkipsFilesWithoutWithStatement(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_with.NoWithRule,
		nil,
		"repro.js",
		`
function update(scope) {
  return scope.total + 1;
}
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
