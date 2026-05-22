package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6353_concise_regex"
)

func TestS6353ReportsVerboseCharacterClassesAndQuantifiers(t *testing.T) {
	t.Parallel()

	if s6353_concise_regex.ConciseRegexRule.Name != "concise-regex" {
		t.Fatalf("unexpected rule name %q", s6353_concise_regex.ConciseRegexRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s6353_concise_regex.ConciseRegexRule,
		nil,
		"file.ts",
		`const any = /[\d\D]/;
const digits = /[0-9]/;
const word = /[A-Za-z0-9_]/;
const optional = /x{0,1}/;
const star = /x{0,}/;
const redundant = /(x\w+){0}/;
const exact = /x{2,2}/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 7)

	wantDescriptions := []string{
		"Use concise character class syntax '.' instead of '[\\d\\D]'.",
		"Use concise character class syntax '\\d' instead of '[0-9]'.",
		"Use concise character class syntax '\\w' instead of '[A-Za-z0-9_]'.",
		"Use concise quantifier syntax '?' instead of '{0,1}'.",
		"Use concise quantifier syntax '*' instead of '{0,}'.",
		"Remove redundant (x\\w+){0}.",
		"Use concise quantifier syntax '{2}' instead of '{2,2}'.",
	}

	for index, diagnostic := range diagnostics {
		if got := diagnostic.Message.Description; got != wantDescriptions[index] {
			t.Fatalf("diagnostic %d message mismatch: want %q, got %q", index, wantDescriptions[index], got)
		}
	}
}

func TestS6353SkipsAlreadyConciseRegexSyntax(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6353_concise_regex.ConciseRegexRule,
		nil,
		"file.ts",
		`/[x]/;
/[12]/;
/x?/;
/x*/;
/x+/;
/x{2}/;
/[\s\S]/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
