package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_this_assignment"
)

func TestNoThisAssignmentReportsVariableDeclaration(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_this_assignment.NoThisAssignmentRule,
		nil,
		"file.ts",
		`
class Counter {
  method() {
    const self = this;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-this-assignment")
}

func TestNoThisAssignmentReportsAssignmentExpression(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_this_assignment.NoThisAssignmentRule,
		nil,
		"file.ts",
		`
class Counter {
  method() {
    let self: Counter | undefined;
    self = this;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-this-assignment")
}

func TestNoThisAssignmentSkipsNonThisAssignments(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_this_assignment.NoThisAssignmentRule,
		nil,
		"file.ts",
		`
class Counter {
  method(other: Counter) {
    const self = other;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
