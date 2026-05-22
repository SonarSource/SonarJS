package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6331_no_empty_group"
)

func TestS6331NoEmptyGroupReportsEmptyGroups(t *testing.T) {
	t.Parallel()

	if s6331_no_empty_group.NoEmptyGroupRule.Name != "no-empty-group" {
		t.Fatalf("unexpected rule name %q", s6331_no_empty_group.NoEmptyGroupRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s6331_no_empty_group.NoEmptyGroupRule,
		nil,
		"file.ts",
		`const a = /()/; const b = /(?:)/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	for _, diagnostic := range diagnostics {
		if diagnostic.Message.Id != "issue" {
			t.Fatalf("unexpected diagnostic id %q", diagnostic.Message.Id)
		}
	}
}

func TestS6331NoEmptyGroupReportsConstructorPatterns(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6331_no_empty_group.NoEmptyGroupRule,
		nil,
		"file.ts",
		`new RegExp("\\u{000000000061}()"); new RegExp("");`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
}

func TestS6331NoEmptyGroupSkipsNonEmptyGroups(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6331_no_empty_group.NoEmptyGroupRule,
		nil,
		"file.ts",
		`/(a|)/; /(\d+)/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
