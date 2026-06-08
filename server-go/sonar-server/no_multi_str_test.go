package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_multi_str"
)

func TestNoMultiStrReportsMultilineStringLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_multi_str.NoMultiStrRule,
		nil,
		"repro.js",
		`
const value = 'first \
second';
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "multilineString")
}

func TestNoMultiStrSkipsStringLiteralInsideJSX(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_multi_str.NoMultiStrRule,
		nil,
		"react.tsx",
		`
const element = <div>{'first \
second'}</div>;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
