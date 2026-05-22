package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func TestNoArrayCallbackReferenceDecoratorSuppressesWithoutTypeInfo(t *testing.T) {
	t.Parallel()

	sourceFile, _, done := programForCode(t, `['1', '2', '3'].map(parseInt);`)
	defer done()

	node := findIdentifier(t, sourceFile, "parseInt")
	if NoArrayCallbackReferenceDecorator.FilterNodeDiagnostic(rule.RuleContext{}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected callback reference diagnostic to be suppressed without type information")
	}
}

func TestNoArrayCallbackReferenceDecoratorSuppressesSingleParameterArrayCallbacks(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
const double = (value: number) => value * 2;
[1, 2, 3].map(double);
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "double" &&
			node.Parent != nil &&
			ast.IsCallExpression(node.Parent) &&
			sameNode(node.Parent.AsCallExpression().Arguments.Nodes[0], node)
	})
	if NoArrayCallbackReferenceDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected single-parameter array callback reference to be suppressed")
	}
}

func TestNoArrayCallbackReferenceDecoratorKeepsMultiParameterArrayCallbacks(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `['1', '2', '3'].map(parseInt);`)
	defer done()

	node := findIdentifier(t, sourceFile, "parseInt")
	if !NoArrayCallbackReferenceDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected parseInt array callback reference to be reported")
	}
}

func TestNoArrayCallbackReferenceDecoratorSuppressesNonArrayFindCalls(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
interface Finder<T> {
  find(callback: (value: T) => boolean): T | undefined;
}

declare const finder: Finder<number>;
const predicate = (value: number, index: number) => value > index;
finder.find(predicate);
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "predicate" &&
			node.Parent != nil &&
			ast.IsCallExpression(node.Parent) &&
			sameNode(node.Parent.AsCallExpression().Arguments.Nodes[0], node)
	})
	if NoArrayCallbackReferenceDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected non-array find callback reference to be suppressed")
	}
}

func TestNoArrayCallbackReferenceDecoratorKeepsUnknownCallbackArityOnArrays(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
class Mapper {
  constructor(public value: number) {}
}

[1, 2, 3].map(Mapper);
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "Mapper" &&
			node.Parent != nil &&
			ast.IsCallExpression(node.Parent) &&
			sameNode(node.Parent.AsCallExpression().Arguments.Nodes[0], node)
	})
	if !NoArrayCallbackReferenceDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected constructor callback reference on arrays to be reported conservatively")
	}
}
