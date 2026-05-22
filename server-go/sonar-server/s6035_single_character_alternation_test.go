package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6035_single_character_alternation"
)

func TestS6035ReportsSingleCharacterAlternations(t *testing.T) {
	t.Parallel()

	if s6035_single_character_alternation.SingleCharacterAlternationRule.Name != "single-character-alternation" {
		t.Fatalf("unexpected rule name %q", s6035_single_character_alternation.SingleCharacterAlternationRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s6035_single_character_alternation.SingleCharacterAlternationRule,
		nil,
		"file.ts",
		`const top = /a|b|c/;
const nested = /a|(b|c)/;
const lookahead = /a(?=b|c)/;
const lookbehind = /(?<!a|b)c/;
const ctor = new RegExp("x|y");
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 5)

	wantTexts := []string{
		"a|b|c",
		"(b|c)",
		"(?=b|c)",
		"(?<!a|b)",
		"x|y",
	}

	for index, diagnostic := range diagnostics {
		if diagnostic.Message.Id != "issue" {
			t.Fatalf("unexpected diagnostic id %q", diagnostic.Message.Id)
		}
		if got := diagnosticText(t, diagnostic); got != wantTexts[index] {
			t.Fatalf("diagnostic %d text mismatch: want %q, got %q", index, wantTexts[index], got)
		}
	}
}

func TestS6035SkipsNonCharacterAlternations(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6035_single_character_alternation.SingleCharacterAlternationRule,
		nil,
		"file.ts",
		`const okClass = /[abc]/;
const okWords = /ab|cd/;
const okBoundary = /a|\b|c/;
const okAnchors = /^|$/;
const okEmpty = /|/;
const okGroup = /(s)*/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
