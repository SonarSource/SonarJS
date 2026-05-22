package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s7059_no_async_constructor"
)

func TestNoAsyncConstructorReportsConstructorStatementOnce(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s7059_no_async_constructor.NoAsyncConstructorRule,
		nil,
		"file.ts",
		`
class Loader {
  constructor() {
    [Promise.resolve(1), Promise.resolve(2)];
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noAsyncConstructor")
	if got := diagnosticText(t, diagnostics[0]); got != "[Promise.resolve(1), Promise.resolve(2)];" {
		t.Fatalf("expected constructor statement range, got %q", got)
	}
}

func TestNoAsyncConstructorSkipsNestedFunctionBodies(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s7059_no_async_constructor.NoAsyncConstructorRule,
		nil,
		"file.ts",
		`
async function fetchData() {
  return Promise.resolve('value');
}

class Loader {
  task: () => Promise<string>;

  constructor() {
    this.task = () => fetchData();
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
