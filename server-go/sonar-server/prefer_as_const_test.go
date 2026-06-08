package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_as_const"
)

func TestPreferAsConstReportsLiteralTypeAssertion(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		prefer_as_const.PreferAsConstRule,
		nil,
		"file.ts",
		`
const ready = 'ready' as 'ready';
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "preferConstAssertion")
}

func TestPreferAsConstReportsLiteralTypeAnnotation(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		prefer_as_const.PreferAsConstRule,
		nil,
		"file.ts",
		`
class StatusHolder {
  status: 'ready' = 'ready';
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "variableConstAssertion")
}

func TestPreferAsConstRequiresMatchingLiteralRawText(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		prefer_as_const.PreferAsConstRule,
		nil,
		"file.ts",
		`
const ready = 'ready' as "ready";
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
