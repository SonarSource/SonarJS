package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_inferrable_types"
)

func TestNoInferrableTypesReportsInitializedPrimitiveVariable(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_inferrable_types.NoInferrableTypesRule,
		nil,
		"file.ts",
		`
const count: number = 42;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noInferrableType")
}

func TestNoInferrableTypesReportsDefaultedParameter(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_inferrable_types.NoInferrableTypesRule,
		nil,
		"file.ts",
		`
function greet(name: string = 'world') {
  return name;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noInferrableType")
}

func TestNoInferrableTypesSkipsReadonlyProperty(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_inferrable_types.NoInferrableTypesRule,
		nil,
		"file.ts",
		`
class Token {
  readonly value: string = 'token';
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
