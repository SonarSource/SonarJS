package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_sparse_arrays"
)

func TestNoSparseArraysReportsArrayHoles(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_sparse_arrays.NoSparseArraysRule,
		nil,
		"file.ts",
		`
const values = [1,, 2, , 3];
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	for _, diagnostic := range diagnostics {
		if diagnostic.Message.Id != "unexpectedSparseArray" {
			t.Fatalf("expected unexpectedSparseArray message, got %#v", diagnostic.Message)
		}
		if got := diagnosticText(t, diagnostic); got != "," {
			t.Fatalf("expected sparse-array diagnostic on comma token, got %q", got)
		}
	}
}

func TestNoSparseArraysSkipsTrailingComma(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_sparse_arrays.NoSparseArraysRule,
		nil,
		"file.ts",
		`
const values = [1, 2,];
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
