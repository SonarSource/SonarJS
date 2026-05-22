package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/prefer_type_error"
)

func TestPreferTypeErrorReportsNewErrorInTypeofGuard(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		prefer_type_error.PreferTypeErrorRule,
		nil,
		"file.ts",
		`
function ensureString(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('Expected a string');
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "prefer-type-error")
	if got := diagnosticText(t, diagnostics[0]); got != "Error" {
		t.Fatalf("expected diagnostic to cover Error constructor, got %q", got)
	}
	if got := diagnostics[0].Message.Description; got != "`new Error()` is too unspecific for a type check. Use `new TypeError()` instead." {
		t.Fatalf("unexpected diagnostic description %q", got)
	}
}

func TestPreferTypeErrorReportsMemberTypecheckGuard(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		prefer_type_error.PreferTypeErrorRule,
		nil,
		"file.ts",
		`
declare const utils: { checks: { isArray(value: unknown): boolean } };

function ensureArray(value: unknown) {
  if (utils.checks.isArray(value)) {
    throw new Error('Expected a non-array value');
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "prefer-type-error")
}

func TestPreferTypeErrorSkipsShadowedGlobalTypecheck(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		prefer_type_error.PreferTypeErrorRule,
		nil,
		"file.ts",
		`
const isNaN = (value: unknown) => value === 'bad';

function ensureValue(value: unknown) {
  if (isNaN(value)) {
    throw new Error('Expected a number');
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestPreferTypeErrorSkipsNonLoneThrowBlock(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		prefer_type_error.PreferTypeErrorRule,
		nil,
		"file.ts",
		`
function ensureString(value: unknown) {
  if (typeof value !== 'string') {
    console.error(value);
    throw new Error('Expected a string');
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
