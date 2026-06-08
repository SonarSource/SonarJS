package main

import "testing"

func TestConsistentTypeAssertionsDefaultsToAsStyle(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"consistent-type-assertions",
		nil,
		"file.ts",
		`
const value = <Foo>bar;
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %d", len(diagnostics))
	}
	if diagnostics[0].Message.Id != "as" {
		t.Fatalf("expected 'as' diagnostic, got %q", diagnostics[0].Message.Id)
	}
}

func TestConsistentTypeAssertionsAllowsArrayLiteralAssertionsByDefault(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"consistent-type-assertions",
		nil,
		"file.ts",
		`
const value = [] as Foo[];
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %d", len(diagnostics))
	}
}

func TestConsistentTypeAssertionsRejectsArrayLiteralAssertionsWhenConfigured(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"consistent-type-assertions",
		map[string]any{
			"assertionStyle":             "as",
			"arrayLiteralTypeAssertions": "never",
		},
		"file.ts",
		`
const value = [] as Foo[];
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %d", len(diagnostics))
	}
	if diagnostics[0].Message.Id != "unexpectedArrayTypeAssertion" {
		t.Fatalf("expected array literal assertion diagnostic, got %q", diagnostics[0].Message.Id)
	}
}

func TestConsistentTypeAssertionsAllowsObjectLiteralAssertionsByDefault(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"consistent-type-assertions",
		nil,
		"file.ts",
		`
const value = {} as Foo;
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %d", len(diagnostics))
	}
}

func TestConsistentTypeAssertionsAllowsConstAssertionsWhenStyleIsNever(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"consistent-type-assertions",
		map[string]any{"assertionStyle": "never"},
		"file.ts",
		`
const value = 'a' as const;
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %d", len(diagnostics))
	}
}

func TestConsistentTypeAssertionsRejectsObjectLiteralAssertionsWhenConfigured(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"consistent-type-assertions",
		map[string]any{
			"assertionStyle":              "as",
			"objectLiteralTypeAssertions": "never",
		},
		"file.ts",
		`
const value = {} as Foo;
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %d", len(diagnostics))
	}
	if diagnostics[0].Message.Id != "unexpectedObjectTypeAssertion" {
		t.Fatalf("expected object literal assertion diagnostic, got %q", diagnostics[0].Message.Id)
	}
}

func TestConsistentTypeAssertionsCanRunWithoutProgram(t *testing.T) {
	t.Parallel()

	if !canRunWithoutProgram("consistent-type-assertions") {
		t.Fatal("expected consistent-type-assertions to run without a program")
	}
}
