package main

import "testing"

func TestNoRedundantOptionalReportsOptionalUndefinedProperty(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-redundant-optional",
		nil,
		"file.ts",
		`
interface Person {
  address?: string | undefined;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "redundantOptional")
}

func TestNoRedundantOptionalSkipsExactOptionalPropertyTypesProjects(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-redundant-optional",
		nil,
		"file.ts",
		`
interface Person {
  address?: string | undefined;
}
`,
		"tsconfig.exactOptionalPropertyTypes.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
