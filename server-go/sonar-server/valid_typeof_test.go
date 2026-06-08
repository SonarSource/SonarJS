package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/valid_typeof"
)

func TestValidTypeofReportsInvalidStringLiteralValue(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		valid_typeof.ValidTypeofRule,
		nil,
		"file.ts",
		`
declare const value: unknown;
if (typeof value === "strnig") {}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "invalidValue")
}

func TestValidTypeofReportsGlobalUndefinedComparisonByDefault(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		valid_typeof.ValidTypeofRule,
		nil,
		"file.ts",
		`
declare const value: unknown;
if (typeof value === undefined) {}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "invalidValue")
}

func TestValidTypeofSkipsShadowedUndefinedWhenStringLiteralsNotRequired(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		valid_typeof.ValidTypeofRule,
		nil,
		"file.ts",
		`
const undefined = "string";
declare const value: unknown;
if (typeof value === undefined) {}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestValidTypeofRequiresStringLiteralsWhenConfigured(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		valid_typeof.ValidTypeofRule,
		map[string]any{"requireStringLiterals": true},
		"file.ts",
		`
const typeName = "string";
declare const value: unknown;
if (typeof value === typeName) {}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "notString")
}

func TestValidTypeofAllowsTypeofComparisonsWhenStringLiteralsAreRequired(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		valid_typeof.ValidTypeofRule,
		map[string]any{"requireStringLiterals": true},
		"file.ts",
		`
declare const left: unknown;
declare const right: unknown;
if (typeof left === typeof right) {}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
