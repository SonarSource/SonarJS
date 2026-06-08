package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func TestPreferAtDecoratorSuppressesWithoutTypeInfo(t *testing.T) {
	t.Parallel()

	sourceFile, _, done := programForCode(t, `
const values = ['a', 'b', 'c'];
const last = values[values.length - 1];
`)
	defer done()

	node := findFirstNode(t, sourceFile, ast.IsBinaryExpression)
	if PreferAtDecorator.FilterNodeDiagnostic(rule.RuleContext{}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected prefer-at diagnostic to be suppressed without type information")
	}
}

func TestPreferAtDecoratorKeepsArrayIndexReports(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
const values = ['a', 'b', 'c'];
const last = values[values.length - 1];
`)
	defer done()

	node := findFirstNode(t, sourceFile, ast.IsBinaryExpression)
	if !PreferAtDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected array negative-index diagnostic to be reported")
	}
}

func TestPreferAtDecoratorKeepsStringCharAtReports(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
const value = 'hello';
const last = value.charAt(value.length - 1);
`)
	defer done()

	node := findFirstNode(t, sourceFile, ast.IsBinaryExpression)
	if !PreferAtDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected string charAt diagnostic to be reported")
	}
}

func TestPreferAtDecoratorKeepsGetLastFunctionReports(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
declare const lodash: { last<T>(values: T[]): T | undefined };
const values = ['a', 'b', 'c'];
const last = lodash.last(values);
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsPropertyAccessExpression(node) &&
			node.AsPropertyAccessExpression().Name() != nil &&
			node.AsPropertyAccessExpression().Name().Text() == "last"
	})
	if !PreferAtDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected get-last helper diagnostic to be reported when target supports at()")
	}
}

func TestPreferAtDecoratorSuppressesTargetsWithoutAt(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
interface LegacyList<T> {
  length: number;
  [index: number]: T;
}

declare const items: LegacyList<string>;
const last = items[items.length - 1];
`)
	defer done()

	node := findFirstNode(t, sourceFile, ast.IsBinaryExpression)
	if PreferAtDecorator.FilterNodeDiagnostic(rule.RuleContext{TypeChecker: checker}, node, rule.RuleDiagnostic{}) {
		t.Fatal("expected prefer-at diagnostic to be suppressed when target has no at() method")
	}
}
