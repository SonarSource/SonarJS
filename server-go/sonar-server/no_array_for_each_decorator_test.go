package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func TestNoArrayForEachDecoratorKeepsDiagnosticsWithoutTypeInfo(t *testing.T) {
	t.Parallel()

	sourceFile, _, done := programForCode(t, `
const values = [1, 2, 3];
values.forEach(value => console.log(value));
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "forEach" &&
			isReportedPropertyAccessName(node.Parent, node)
	})
	if !NoArrayForEachDecorator.FilterNodeDiagnostic(rule.RuleContext{}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected forEach diagnostic to pass through without type information")
	}
}

func TestNoArrayForEachDecoratorKeepsIterableReceivers(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
const values = [1, 2, 3];
values.forEach(value => console.log(value));
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "forEach" &&
			isReportedPropertyAccessName(node.Parent, node)
	})
	if !NoArrayForEachDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected iterable forEach diagnostic to be reported")
	}
}

func TestNoArrayForEachDecoratorSuppressesNonIterableReceivers(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
interface CustomCollection {
  forEach(callback: (value: string) => void): void;
}

declare const collection: CustomCollection;
collection.forEach(value => console.log(value));
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "forEach" &&
			isReportedPropertyAccessName(node.Parent, node)
	})
	if NoArrayForEachDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected non-iterable forEach diagnostic to be suppressed")
	}
}
