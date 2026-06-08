package main

import "testing"

func TestNoUselessIntersectionReportsEmptyInterfaceInIntersection(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-useless-intersection",
		nil,
		"file.ts",
		`
interface Empty {}
type Value = { a: string } & Empty;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "removeIntersection")
}

func TestNoUselessIntersectionAllowsLiteralUnionPattern(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-useless-intersection",
		nil,
		"file.ts",
		`
type Size = "small" | "medium" | (string & {});
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoUselessIntersectionReportsAnyShortcut(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-useless-intersection",
		nil,
		"file.ts",
		`
type Value = any & { a: string };
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "simplifyIntersection")
}
