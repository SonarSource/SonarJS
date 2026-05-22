package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/parser"
)

func TestPreferTopLevelAwaitDecoratorSuppressesCommonJSFiles(t *testing.T) {
	t.Parallel()

	sourceFile, _, done := programForCode(t, `Promise.resolve(42).catch(console.error);`)
	defer done()

	if PreferTopLevelAwaitDecorator.FilterDiagnostic(rule.RuleContext{SourceFile: sourceFile}, rule.RuleDiagnostic{
		Message: rule.RuleMessage{Id: "promise"},
	}) {
		t.Fatal("expected prefer-top-level-await diagnostics to be suppressed outside ES modules")
	}
}

func TestPreferTopLevelAwaitDecoratorKeepsPromiseChainsWithTypeInfo(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
export {};
Promise.resolve(42).catch(console.error);
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "catch" &&
			isReportedPropertyAccessName(node.Parent, node)
	})

	diagnostic := rule.RuleDiagnostic{Message: rule.RuleMessage{Id: "promise"}}
	if !PreferTopLevelAwaitDecorator.FilterDiagnostic(rule.RuleContext{SourceFile: sourceFile}, diagnostic) {
		t.Fatal("expected ES module diagnostics to stay enabled")
	}
	if !PreferTopLevelAwaitDecorator.FilterNodeDiagnostic(rule.RuleContext{
		SourceFile:  sourceFile,
		TypeChecker: checker,
	}, node, diagnostic) {
		t.Fatal("expected promise chains to be reported with type information")
	}
}

func TestPreferTopLevelAwaitDecoratorSuppressesSynchronousCatchWithTypeInfo(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
export {};
class Schema {
  catch(defaultValue: number): this {
    return this;
  }
}

const schema = new Schema();
schema.catch(0);
`)
	defer done()

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "catch" &&
			isReportedPropertyAccessName(node.Parent, node)
	})

	if PreferTopLevelAwaitDecorator.FilterNodeDiagnostic(rule.RuleContext{
		SourceFile:  sourceFile,
		TypeChecker: checker,
	}, node, rule.RuleDiagnostic{Message: rule.RuleMessage{Id: "promise"}}) {
		t.Fatal("expected synchronous catch chains to be suppressed")
	}
}

func TestPreferTopLevelAwaitDecoratorSuppressesAllowedImportsWithoutTypeInfo(t *testing.T) {
	t.Parallel()

	sourceFile := parser.ParseSourceFile(ast.SourceFileParseOptions{
		FileName: "/test.ts",
		Path:     "/test.ts",
	}, `
import { z } from 'zod';
const schema = z.string().optional().catch('');
`, core.ScriptKindTS)

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "catch" &&
			isReportedPropertyAccessName(node.Parent, node)
	})

	if PreferTopLevelAwaitDecorator.FilterNodeDiagnostic(rule.RuleContext{SourceFile: sourceFile}, node, rule.RuleDiagnostic{
		Message: rule.RuleMessage{Id: "promise"},
	}) {
		t.Fatal("expected allowed import chains to be suppressed without type information")
	}
}

func TestPreferTopLevelAwaitDecoratorKeepsOtherImportsWithoutTypeInfo(t *testing.T) {
	t.Parallel()

	sourceFile := parser.ParseSourceFile(ast.SourceFileParseOptions{
		FileName: "/test.ts",
		Path:     "/test.ts",
	}, `
import { schema } from 'my-lib';
schema.catch(console.error);
`, core.ScriptKindTS)

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) &&
			node.AsIdentifier().Text == "catch" &&
			isReportedPropertyAccessName(node.Parent, node)
	})

	if !PreferTopLevelAwaitDecorator.FilterNodeDiagnostic(rule.RuleContext{SourceFile: sourceFile}, node, rule.RuleDiagnostic{
		Message: rule.RuleMessage{Id: "promise"},
	}) {
		t.Fatal("expected non-allowed import chains to be reported without type information")
	}
}
