package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_instanceof_builtins"
)

func TestNoInstanceofBuiltinsReportsArrayChecks(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_instanceof_builtins.NoInstanceofBuiltinsRule,
		nil,
		"file.ts",
		`
declare const value: unknown;
const isArray = value instanceof Array;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-instanceof-builtins")
}

func TestNoInstanceofBuiltinsSkipsStrictOnlyConstructorsByDefault(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_instanceof_builtins.NoInstanceofBuiltinsRule,
		nil,
		"file.ts",
		`
declare const value: unknown;
const isDate = value instanceof Date;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoInstanceofBuiltinsReportsStrictConstructorsWhenConfigured(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_instanceof_builtins.NoInstanceofBuiltinsRule,
		map[string]any{"strategy": "strict"},
		"file.ts",
		`
declare const value: unknown;
const isDate = value instanceof Date;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-instanceof-builtins")
}
