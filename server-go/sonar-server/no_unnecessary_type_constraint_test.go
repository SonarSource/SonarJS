package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_unnecessary_type_constraint"
)

func TestNoUnnecessaryTypeConstraintReportsUnknownConstraint(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_unnecessary_type_constraint.NoUnnecessaryTypeConstraintRule,
		nil,
		"file.ts",
		`
function wrap<T extends unknown>(value: T): T {
  return value;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unnecessaryConstraint")
}

func TestNoUnnecessaryTypeConstraintAllowsSpecificConstraint(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_unnecessary_type_constraint.NoUnnecessaryTypeConstraintRule,
		nil,
		"file.ts",
		`
function wrap<T extends string>(value: T): T {
  return value;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
