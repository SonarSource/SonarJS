package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6959_reduce_initial_value"
)

func TestReduceInitialValueReportsConcreteArrayReduce(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6959_reduce_initial_value.ReduceInitialValueRule,
		nil,
		"file.ts",
		`
function sum(values: number[]) {
  return values.reduce((total, value) => total + value);
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "message")
	if got := diagnosticText(t, diagnostics[0]); got != "reduce" {
		t.Fatalf("expected property range, got %q", got)
	}
}

func TestReduceInitialValueSkipsConstrainedGenericReduce(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6959_reduce_initial_value.ReduceInitialValueRule,
		nil,
		"file.ts",
		`
function sum<T extends number[]>(values: T) {
  return values.reduce((total, value) => total + value);
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestReduceInitialValueSkipsCustomReduceAndInitialValue(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6959_reduce_initial_value.ReduceInitialValueRule,
		nil,
		"file.ts",
		`
class Box {
  reduce(callback: (total: number, value: number) => number) {
    return callback(0, 1);
  }
}

const box = new Box();
box.reduce((total, value) => total + value);

const values = [1, 2, 3];
values.reduce((total, value) => total + value, 0);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
