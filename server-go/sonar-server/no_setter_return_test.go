package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_setter_return"
)

func TestNoSetterReturnReportsClassSetterReturnValue(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_setter_return.NoSetterReturnRule,
		nil,
		"file.ts",
		`
class Counter {
  set value(input: number) {
    return input;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "returnsValue")
}

func TestNoSetterReturnReportsDescriptorArrowImplicitReturn(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_setter_return.NoSetterReturnRule,
		nil,
		"file.ts",
		`
const target = {};
Object.defineProperty(target, "value", {
  set: value => value,
});
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "returnsValue")
}

func TestNoSetterReturnSkipsNestedFunctionReturnsInsideSetter(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_setter_return.NoSetterReturnRule,
		nil,
		"file.ts",
		`
class Counter {
  set value(input: number) {
    function nested() {
      return input;
    }

    nested();
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
