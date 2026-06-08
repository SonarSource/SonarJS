package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_debugger"
)

func TestNoDebuggerReportsDebuggerStatement(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_debugger.NoDebuggerRule,
		nil,
		"file.ts",
		`
function debug() {
  debugger;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpected")
}

func TestNoDebuggerSkipsFilesWithoutDebuggerStatement(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_debugger.NoDebuggerRule,
		nil,
		"file.ts",
		`
function debug() {
  return 42;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
