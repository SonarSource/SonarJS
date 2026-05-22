package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_explicit_any"
)

func TestNoExplicitAnyReportsAnyAndKeyofAny(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_explicit_any.NoExplicitAnyRule,
		nil,
		"file.ts",
		`
type Keys = keyof any;
function wrap(value: any) {
  return value;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 2 {
		t.Fatalf("expected 2 diagnostics, got %#v", diagnostics)
	}
	for _, diagnostic := range diagnostics {
		if diagnostic.Message.Id != "unexpectedAny" {
			t.Fatalf("unexpected diagnostic %#v", diagnostic.Message)
		}
		if got := diagnosticText(t, diagnostic); got != "any" {
			t.Fatalf("expected any keyword range, got %q", got)
		}
	}
}

func TestNoExplicitAnySkipsRestArgsWhenConfigured(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_explicit_any.NoExplicitAnyRule,
		map[string]any{"ignoreRestArgs": true},
		"file.ts",
		`
function log(...args: any[]) {
  return args.length;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoExplicitAnySkipsUnknown(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_explicit_any.NoExplicitAnyRule,
		nil,
		"file.ts",
		`
function wrap(value: unknown) {
  return value;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
