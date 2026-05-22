package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2999_new_operator_misuse"
)

func TestS2999NewOperatorMisuseReportsPrimitiveCallee(t *testing.T) {
	t.Parallel()

	if s2999_new_operator_misuse.NewOperatorMisuseRule.Name != "new-operator-misuse" {
		t.Fatalf("unexpected rule name %q", s2999_new_operator_misuse.NewOperatorMisuseRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s2999_new_operator_misuse.NewOperatorMisuseRule,
		map[string]any{"considerJSDoc": false},
		"file.ts",
		`
const numeric = 1;
new numeric;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "constructorFunction")
	if diagnostics[0].Message.Description != "Replace numeric with a constructor function." {
		t.Fatalf("unexpected message %q", diagnostics[0].Message.Description)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "numeric" {
		t.Fatalf("expected diagnostic text %q, got %q", "numeric", got)
	}
	if len(diagnostics[0].LabeledRanges) != 1 {
		t.Fatalf("expected one secondary location, got %#v", diagnostics[0].LabeledRanges)
	}
	if got := diagnostics[0].SourceFile.Text()[diagnostics[0].LabeledRanges[0].Range.Pos():diagnostics[0].LabeledRanges[0].Range.End()]; got != "new" {
		t.Fatalf("expected secondary text %q, got %q", "new", got)
	}
}

func TestS2999NewOperatorMisuseHonorsConsiderJSDoc(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2999_new_operator_misuse.NewOperatorMisuseRule,
		map[string]any{"considerJSDoc": true},
		"file.ts",
		`
function MyClass() {}
new MyClass();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "constructorFunction")
}

func TestS2999NewOperatorMisuseAllowsJSDocConstructors(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2999_new_operator_misuse.NewOperatorMisuseRule,
		map[string]any{"considerJSDoc": true},
		"file.ts",
		`
/**
 * @constructor
 */
function MyClass() {}
new MyClass();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestS2999NewOperatorMisuseReportsFunctionKeywordForInlineFunctions(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2999_new_operator_misuse.NewOperatorMisuseRule,
		map[string]any{"considerJSDoc": true},
		"file.ts",
		`new function () { return 5; };`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "constructorFunction")
	if got := diagnosticText(t, diagnostics[0]); got != "function" {
		t.Fatalf("expected diagnostic text %q, got %q", "function", got)
	}
}
