package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2259_null_dereference"
)

func TestS2259ReportsNullableIdentifierDereference(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2259_null_dereference.NullDereferenceRule,
		nil,
		"file.ts",
		`
const value: { prop: number } | undefined = undefined;
value.prop;
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %#v", diagnostics)
	}

	diagnostic := findDiagnosticByMessageID(t, diagnostics, "nullDereference")
	if got := diagnosticText(t, diagnostic); got != "value" {
		t.Fatalf("expected diagnostic text %q, got %q", "value", got)
	}
}

func TestS2259ReportsShortCircuitError(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2259_null_dereference.NullDereferenceRule,
		nil,
		"file.ts",
		`
const value: { prop: number } | undefined = undefined;
if (value == null && value.prop === 1) {}
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 2 {
		t.Fatalf("expected two diagnostics, got %#v", diagnostics)
	}

	if got := diagnosticText(t, findDiagnosticByMessageID(t, diagnostics, "nullDereference")); got != "value" {
		t.Fatalf("expected null-dereference text %q, got %q", "value", got)
	}

	diagnostic := findDiagnosticByMessageID(t, diagnostics, "shortCircuitError")
	if got := diagnosticText(t, diagnostic); got != "value" {
		t.Fatalf("expected diagnostic text %q, got %q", "value", got)
	}
}

func TestS2259SuppressesSymbolsWrittenInInnerFunctions(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2259_null_dereference.NullDereferenceRule,
		nil,
		"file.ts",
		`
let value: { prop: number } | undefined = undefined;
function update() {
  value = { prop: 1 };
}
value.prop;
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %#v", diagnostics)
	}
}

func TestS2259ReportsNullableForOfExpression(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2259_null_dereference.NullDereferenceRule,
		nil,
		"file.ts",
		`
const values: string[] | undefined = undefined;
for (const value of values) {}
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %#v", diagnostics)
	}

	diagnostic := findDiagnosticByMessageID(t, diagnostics, "nullDereference")
	if got := diagnosticText(t, diagnostic); got != "values" {
		t.Fatalf("expected diagnostic text %q, got %q", "values", got)
	}
}

func TestS2259KeepsGuardedDereferenceClean(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2259_null_dereference.NullDereferenceRule,
		nil,
		"file.ts",
		`
const value: { prop: number } | undefined = undefined;
if (value != null) {
  value.prop;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %#v", diagnostics)
	}
}

func TestS2259UsesRegisteredRuleName(t *testing.T) {
	t.Parallel()

	ruleToRun, ok := allRulesByName["null-dereference"]
	if !ok {
		t.Fatal("expected null-dereference to be registered")
	}

	diagnostics := runDirectRuleOnCode(
		t,
		ruleToRun,
		nil,
		"file.ts",
		`
const value: { prop: number } | undefined = undefined;
value.prop;
`,
		"tsconfig.minimal.json",
		"",
	)

	diagnostic := findDiagnosticByMessageID(t, diagnostics, "nullDereference")
	if got := diagnostic.Message.Description; got != "TypeError can be thrown as \"value\" might be null or undefined here." {
		t.Fatalf("unexpected diagnostic description %q", got)
	}
}
