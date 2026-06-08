package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_new_func"
)

func TestNoNewFuncReportsFunctionConstructorCall(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_new_func.NoNewFuncRule,
		nil,
		"file.ts",
		`
const makeValue = Function("return 42;");
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noFunctionConstructor")
}

func TestNoNewFuncReportsFunctionCallMethodUsage(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_new_func.NoNewFuncRule,
		nil,
		"file.ts",
		`
const makeValue = Function.call(null, "return 42;");
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noFunctionConstructor")
}

func TestNoNewFuncSkipsShadowedFunctionIdentifier(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_new_func.NoNewFuncRule,
		nil,
		"file.ts",
		`
const Function = class {};
new Function();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
