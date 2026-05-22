package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5850_anchor_precedence"
)

func TestS5850ReportsAmbiguousAnchorPrecedence(t *testing.T) {
	t.Parallel()

	if s5850_anchor_precedence.AnchorPrecedenceRule.Name != "anchor-precedence" {
		t.Fatalf("unexpected rule name %q", s5850_anchor_precedence.AnchorPrecedenceRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s5850_anchor_precedence.AnchorPrecedenceRule,
		nil,
		"file.ts",
		`const mixed = /^a|b|c$/;
const startOnly = /^a|b/;
const endOnly = /a|b$/;
const threeWay = /^active|warn-[1-4]|locked$/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 4)

	wantTexts := []string{
		"^a|b|c$",
		"^a|b",
		"a|b$",
		"^active|warn-[1-4]|locked$",
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

func TestS5850SkipsComplementaryAndExplicitAnchors(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5850_anchor_precedence.AnchorPrecedenceRule,
		nil,
		"file.ts",
		`const trim = /^\s+|\s+$/g;
const explicit = /^a$|^b$|^c$/;
const grouped = /^(?:a|b)$/;
const asymmetric = /^http:\/\/|\.html$/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
