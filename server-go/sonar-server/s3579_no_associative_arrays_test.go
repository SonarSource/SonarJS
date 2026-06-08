package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3579_no_associative_arrays"
)

func TestNoAssociativeArraysReportsStringIndexAssignment(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s3579_no_associative_arrays.NoAssociativeArraysRule,
		nil,
		"file.ts",
		`
const values: string[] = [];
const key = 'name';

values[key] = 'bob';
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noAssociativeArray")
}

func TestNoAssociativeArraysAllowsNumericAssignment(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s3579_no_associative_arrays.NoAssociativeArraysRule,
		nil,
		"file.ts",
		`
const values: string[] = [];

values[0] = 'bob';
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
