package main

import (
	"testing"

	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2639_no_empty_character_class"
	"github.com/microsoft/typescript-go/shim/ast"
)

func assertS2639DiagnosticCount(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want int) {
	t.Helper()

	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func assertS2639SingleDiagnosticMessageID(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want string) {
	t.Helper()

	assertS2639DiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}

func findFirstS2639Node(t *testing.T, sourceFile *ast.SourceFile, predicate func(node *ast.Node) bool) *ast.Node {
	t.Helper()

	var found *ast.Node
	var visit ast.Visitor
	visit = func(node *ast.Node) bool {
		if found != nil {
			return true
		}
		if predicate(node) {
			found = node
			return true
		}
		node.ForEachChild(visit)
		return found != nil
	}
	sourceFile.Node.ForEachChild(visit)

	if found == nil {
		t.Fatal("could not find matching node")
	}
	return found
}

func TestS2639NoEmptyCharacterClassReportsRegexLiteral(t *testing.T) {
	t.Parallel()

	if s2639_no_empty_character_class.NoEmptyCharacterClassRule.Name != "no-empty-character-class" {
		t.Fatalf("unexpected rule name %q", s2639_no_empty_character_class.NoEmptyCharacterClassRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s2639_no_empty_character_class.NoEmptyCharacterClassRule,
		nil,
		"file.ts",
		`const regex = /[]/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertS2639SingleDiagnosticMessageID(t, diagnostics, "issue")
	if got := diagnosticText(t, diagnostics[0]); got != "[]" {
		t.Fatalf("expected diagnostic text %q, got %q", "[]", got)
	}
}

func TestS2639NoEmptyCharacterClassSkipsNegatedEmptyClass(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2639_no_empty_character_class.NoEmptyCharacterClassRule,
		nil,
		"file.ts",
		`const regex = /[^]/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertS2639DiagnosticCount(t, diagnostics, 0)
}
