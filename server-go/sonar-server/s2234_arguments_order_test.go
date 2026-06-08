package main

import (
	"testing"

	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2234_arguments_order"
	"github.com/microsoft/typescript-go/shim/ast"
)

func assertS2234DiagnosticCount(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want int) {
	t.Helper()

	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func assertS2234SingleDiagnosticMessageID(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want string) {
	t.Helper()

	assertS2234DiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}

func findFirstS2234Node(t *testing.T, sourceFile *ast.SourceFile, predicate func(node *ast.Node) bool) *ast.Node {
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

func TestS2234ArgumentsOrderReportsSwappedArguments(t *testing.T) {
	t.Parallel()

	if s2234_arguments_order.ArgumentsOrderRule.Name != "arguments-order" {
		t.Fatalf("unexpected rule name %q", s2234_arguments_order.ArgumentsOrderRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s2234_arguments_order.ArgumentsOrderRule,
		nil,
		"file.ts",
		`
function formatDate(year: number, month: number, day: number) {}
formatDate(month, year, day);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS2234SingleDiagnosticMessageID(t, diagnostics, "argumentsOrder")
	if got := diagnosticText(t, diagnostics[0]); got != "month, year, day" {
		t.Fatalf("expected diagnostic text %q, got %q", "month, year, day", got)
	}
	if diagnostics[0].Message.Description != `Arguments 'month' and 'year' have the same names but not the same order as the function parameters.` {
		t.Fatalf("unexpected message %q", diagnostics[0].Message.Description)
	}
}

func TestS2234ArgumentsOrderSkipsComparatorReversalWrappers(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2234_arguments_order.ArgumentsOrderRule,
		nil,
		"file.ts",
		`
function compare(a: number, b: number) { return a - b; }
const reversed = (a: number, b: number) => compare(b, a);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS2234DiagnosticCount(t, diagnostics, 0)
}

func TestS2234ArgumentsOrderSkipsTernaryControlledSwaps(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2234_arguments_order.ArgumentsOrderRule,
		nil,
		"file.ts",
		`
function getTrigger(index1: number, index2: number) { return { from: index1, to: index2 }; }

function getSortedTrigger(index1: number, index2: number) {
  return index1 < index2
    ? getTrigger(index1, index2)
    : getTrigger(index2, index1);
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS2234DiagnosticCount(t, diagnostics, 0)
}

func TestS2234ArgumentsOrderConversionSkipsOutOfFileSecondaryLocations(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2234_arguments_order.ArgumentsOrderRule,
		nil,
		"file.ts",
		`
function standardMethod() {
  const length = 1;
  const from = 0;
  return "abcdef".substr(length, from);
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS2234DiagnosticCount(t, diagnostics, 1)
	if len(diagnostics[0].LabeledRanges) == 0 {
		t.Fatalf("expected diagnostic to keep the original labeled range metadata")
	}

	issue := ConvertDiagnostic(diagnostics[0])
	if len(issue.SecondaryLocations) != 0 {
		t.Fatalf("expected out-of-file labeled ranges to be dropped, got %#v", issue.SecondaryLocations)
	}
}
