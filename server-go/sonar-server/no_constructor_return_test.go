package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_constructor_return"
)

func TestNoConstructorReturnReportsReturnValueInConstructor(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_constructor_return.NoConstructorReturnRule,
		nil,
		"file.ts",
		`
class Example {
  constructor() {
    return 42;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpected")
	if got := diagnostics[0].Message.Description; got != "Unexpected return statement in constructor." {
		t.Fatalf("unexpected diagnostic description %q", got)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "return 42;" {
		t.Fatalf("unexpected diagnostic text %q", got)
	}
}

func TestNoConstructorReturnSkipsBareReturnInConstructor(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_constructor_return.NoConstructorReturnRule,
		nil,
		"file.ts",
		`
class Example {
  constructor() {
    return;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoConstructorReturnSkipsNestedFunctionReturn(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_constructor_return.NoConstructorReturnRule,
		nil,
		"file.ts",
		`
class Example {
  constructor() {
    const makeValue = () => {
      return 42;
    };

    makeValue();
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
