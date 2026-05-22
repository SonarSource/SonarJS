package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_continue"
)

func TestNoContinueReportsContinueStatement(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_continue.NoContinueRule,
		nil,
		"file.ts",
		`
function search(items: string[]) {
  for (const item of items) {
    if (item === 'skip') {
      continue;
    }
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpected")
}

func TestNoContinueSkipsLoopsWithoutContinue(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_continue.NoContinueRule,
		nil,
		"file.ts",
		`
function search(items: string[]) {
  for (const item of items) {
    if (item === 'skip') {
      break;
    }
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
