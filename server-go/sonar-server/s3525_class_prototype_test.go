package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3525_class_prototype"
)

func TestClassPrototypeReportsPrototypeFunctionAssignment(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s3525_class_prototype.ClassPrototypeRule,
		nil,
		"file.ts",
		`
function Foo() {}
const attach = () => {};

Foo.prototype.render = attach;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "declareClass")
}

func TestClassPrototypeAllowsNonFunctionAssignments(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s3525_class_prototype.ClassPrototypeRule,
		nil,
		"file.ts",
		`
function Foo() {}

Foo.prototype.render = 1;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
