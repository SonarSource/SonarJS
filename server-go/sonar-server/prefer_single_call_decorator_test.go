package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func TestPreferSingleCallDecoratorKeepsDiagnosticsWithoutTypeInfo(t *testing.T) {
	t.Parallel()

	sourceFile, _, done := programForCode(t, `
const items = [];
items.push(1);
items.push(2);
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "push" &&
			isReportedPropertyAccessName(node.Parent, node)
	})
	if !PreferSingleCallDecorator.FilterNodeDiagnostic(rule.RuleContext{}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected prefer-single-call diagnostic to pass through without type information")
	}
}

func TestPreferSingleCallDecoratorSuppressesSingleArgumentMethods(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
class CustomPusher {
  push(item: number): void {}
}

const instance = new CustomPusher();
instance.push(1);
instance.push(2);
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "push" &&
			isReportedPropertyAccessName(node.Parent, node)
	})
	if PreferSingleCallDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected single-argument method calls to be suppressed")
	}
}

func TestPreferSingleCallDecoratorKeepsVariadicMethods(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
class CustomPusher {
  push(...items: number[]): void {}
}

const instance = new CustomPusher();
instance.push(1);
instance.push(2);
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "push" &&
			isReportedPropertyAccessName(node.Parent, node)
	})
	if !PreferSingleCallDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected variadic method calls to be reported")
	}
}

func TestPreferSingleCallDecoratorSuppressesZeroArgumentDirectCalls(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
declare function importScripts(): void;
importScripts();
importScripts();
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "importScripts" &&
			node.Parent != nil &&
			ast.IsCallExpression(node.Parent) &&
			sameNode(node.Parent.AsCallExpression().Expression, node)
	})
	if PreferSingleCallDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected zero-argument direct calls to be suppressed")
	}
}

func TestPreferSingleCallDecoratorKeepsRestParameterDirectCalls(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
declare function importScripts(...urls: string[]): void;
importScripts('a.js');
importScripts('b.js');
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "importScripts" &&
			node.Parent != nil &&
			ast.IsCallExpression(node.Parent) &&
			sameNode(node.Parent.AsCallExpression().Expression, node)
	})
	if !PreferSingleCallDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected rest-parameter direct calls to be reported")
	}
}
