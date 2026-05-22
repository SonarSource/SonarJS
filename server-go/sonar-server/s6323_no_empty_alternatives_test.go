package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6323_no_empty_alternatives"
)

func TestS6323NoEmptyAlternativesReportsEmptyAlternatives(t *testing.T) {
	t.Parallel()

	if s6323_no_empty_alternatives.NoEmptyAlternativesRule.Name != "no-empty-alternatives" {
		t.Fatalf("unexpected rule name %q", s6323_no_empty_alternatives.NoEmptyAlternativesRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s6323_no_empty_alternatives.NoEmptyAlternativesRule,
		nil,
		"file.ts",
		`/|/; /a|/; /|a/; /a||b/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 5)
	for _, diagnostic := range diagnostics {
		if diagnostic.Message.Id != "issue" {
			t.Fatalf("unexpected diagnostic id %q", diagnostic.Message.Id)
		}
		if got := diagnosticText(t, diagnostic); got != "|" {
			t.Fatalf("expected diagnostic text %q, got %q", "|", got)
		}
	}
}

func TestS6323NoEmptyAlternativesReportsConstructorAlternatives(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6323_no_empty_alternatives.NoEmptyAlternativesRule,
		nil,
		"file.ts",
		`new RegExp("|"); new RegExp("a\\n(|)");`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 3)
}

func TestS6323NoEmptyAlternativesAllowsOptionalGroups(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6323_no_empty_alternatives.NoEmptyAlternativesRule,
		nil,
		"file.ts",
		`/(a|)/; /(?:a|)/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
