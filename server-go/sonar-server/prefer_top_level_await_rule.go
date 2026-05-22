package main

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

var preferTopLevelAwaitPromiseMethods = map[string]struct{}{
	"catch":   {},
	"finally": {},
	"then":    {},
}

func buildPreferTopLevelAwaitPromiseMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "promise",
		Description: "Prefer top-level await over using a promise chain.",
	}
}

func buildPreferTopLevelAwaitIIFEMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "iife",
		Description: "Prefer top-level await over an async IIFE.",
	}
}

func buildPreferTopLevelAwaitIdentifierMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "identifier",
		Description: fmt.Sprintf("Prefer top-level await over an async function `%s` call.", name),
	}
}

func isPromiseMethodCalleeObject(node *ast.Node) bool {
	parent := node.Parent
	if parent == nil || !ast.IsPropertyAccessExpression(parent) {
		return false
	}

	property := parent.AsPropertyAccessExpression().Name()
	if property == nil {
		return false
	}
	if _, ok := preferTopLevelAwaitPromiseMethods[property.Text()]; !ok {
		return false
	}

	return parent.AsPropertyAccessExpression().Expression == node &&
		parent.Parent != nil &&
		ast.IsCallExpression(parent.Parent) &&
		sameNode(parent.Parent.AsCallExpression().Expression, parent)
}

func isAwaitExpressionArgument(node *ast.Node) bool {
	return node.Parent != nil &&
		node.Parent.Kind == ast.KindAwaitExpression &&
		node.Parent.AsAwaitExpression().Expression == node
}

func resolvedAsyncFunctionValue(ctx rule.RuleContext, identifier *ast.Node) *ast.Node {
	if ctx.TypeChecker == nil || identifier == nil || !ast.IsIdentifier(identifier) {
		return nil
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(identifier)
	if symbol == nil {
		return nil
	}

	declaration := symbol.ValueDeclaration
	if declaration == nil && len(symbol.Declarations) > 0 {
		declaration = symbol.Declarations[0]
	}
	if declaration == nil {
		return nil
	}

	if ast.IsFunctionDeclaration(declaration) && utils.IncludesModifier(declaration, ast.KindAsyncKeyword) {
		return declaration
	}
	if !ast.IsVariableDeclaration(declaration) {
		return nil
	}

	initializer := ast.SkipParentheses(declaration.AsVariableDeclaration().Initializer)
	if initializer != nil &&
		(ast.IsFunctionExpression(initializer) || ast.IsArrowFunction(initializer)) &&
		utils.IncludesModifier(initializer, ast.KindAsyncKeyword) {
		return initializer
	}

	return nil
}

var PreferTopLevelAwaitRule = rule.Rule{
	Name: "prefer-top-level-await",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				if !isTopLevelCallExpression(node) || isPromiseMethodCalleeObject(node) || isAwaitExpressionArgument(node) {
					return
				}

				callExpr := node.AsCallExpression()
				callee := ast.SkipParentheses(callExpr.Expression)
				if callee == nil {
					return
				}

				propertyName, reportNode, ok := staticPropertyName(callee)
				if ok {
					if _, isPromiseMethod := preferTopLevelAwaitPromiseMethods[propertyName]; isPromiseMethod {
						ctx.ReportNode(reportNode, buildPreferTopLevelAwaitPromiseMessage())
					}
					return
				}

				if (ast.IsFunctionExpression(callee) || ast.IsArrowFunction(callee)) && utils.IncludesModifier(callee, ast.KindAsyncKeyword) {
					ctx.ReportNode(node, buildPreferTopLevelAwaitIIFEMessage())
					return
				}

				if ast.IsIdentifier(callee) && resolvedAsyncFunctionValue(ctx, callee) != nil {
					ctx.ReportNode(node, buildPreferTopLevelAwaitIdentifierMessage(callee.AsIdentifier().Text))
				}
			},
		}
	},
}
