package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6019_no_empty_after_reluctant"
)

func TestS6019ReportsReluctantQuantifiersWithOnlyOptionalTail(t *testing.T) {
	t.Parallel()

	if s6019_no_empty_after_reluctant.NoEmptyAfterReluctantRule.Name != "no-empty-after-reluctant" {
		t.Fatalf("unexpected rule name %q", s6019_no_empty_after_reluctant.NoEmptyAfterReluctantRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s6019_no_empty_after_reluctant.NoEmptyAfterReluctantRule,
		nil,
		"file.ts",
		`const end = /a*?$/;
const optional = /a*?x?/;
const repeated = /a*?x*/;
const fixed = /a{5,25}?/;
const group = /a+?(x)?/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 5)

	wantDescriptions := []string{
		"Remove the '?' from this unnecessarily reluctant quantifier.",
		"Fix this reluctant quantifier that will only ever match 0 repetitions.",
		"Fix this reluctant quantifier that will only ever match 0 repetitions.",
		"Fix this reluctant quantifier that will only ever match 5 repetitions.",
		"Fix this reluctant quantifier that will only ever match 1 repetition.",
	}
	wantTexts := []string{"a*?", "a*?", "a*?", "a{5,25}?", "a+?"}

	for index, diagnostic := range diagnostics {
		if got := diagnostic.Message.Description; got != wantDescriptions[index] {
			t.Fatalf("diagnostic %d message mismatch: want %q, got %q", index, wantDescriptions[index], got)
		}
		if got := diagnosticText(t, diagnostic); got != wantTexts[index] {
			t.Fatalf("diagnostic %d text mismatch: want %q, got %q", index, wantTexts[index], got)
		}
	}
}

func TestS6019SkipsReluctantQuantifiersWithRequiredTail(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6019_no_empty_after_reluctant.NoEmptyAfterReluctantRule,
		nil,
		"file.ts",
		`/a*?x/;
/a*?[abc]/;
/|x|a*x/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
