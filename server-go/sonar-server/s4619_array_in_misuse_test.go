package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4619_array_in_misuse"
)

func TestNoInMisuseReportsArrayMembershipWithSuggestions(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s4619_array_in_misuse.NoInMisuseRule,
		nil,
		"file.ts",
		`
const values = ['a', 'b', 'c'];
'b' in values;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "inMisuse")
	suggestions := diagnostics[0].GetSuggestions()
	if len(suggestions) != 2 {
		t.Fatalf("expected 2 suggestions, got %#v", suggestions)
	}
	if got := suggestions[0].Fixes()[0].Text; got != "values.indexOf('b') > -1" {
		t.Fatalf("unexpected indexOf fix %q", got)
	}
	if got := suggestions[1].Fixes()[0].Text; got != "values.includes('b')" {
		t.Fatalf("unexpected includes fix %q", got)
	}
}

func TestNoInMisuseSkipsNumericIndexAndPrototypeProperty(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s4619_array_in_misuse.NoInMisuseRule,
		nil,
		"file.ts",
		`
const values = ['a', 'b', 'c'];
1 in values;
'indexOf' in values;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
