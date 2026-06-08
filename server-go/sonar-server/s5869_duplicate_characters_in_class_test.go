package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5869_duplicate_characters_in_class"
)

func TestS5869ReportsDuplicateCharacterClassEntries(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5869_duplicate_characters_in_class.DuplicateCharactersInClassRule,
		nil,
		"file.ts",
		`/[0-99]/;
/[xX]/i;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	if len(diagnostics[0].LabeledRanges) == 0 {
		t.Fatalf("expected duplicate secondaries, got %#v", diagnostics[0].LabeledRanges)
	}
}

func TestS5869SkipsDistinctCharacterClasses(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5869_duplicate_characters_in_class.DuplicateCharactersInClassRule,
		nil,
		"file.ts",
		`/[a-z\d]/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
