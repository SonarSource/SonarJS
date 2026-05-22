package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

var NoArrayForEachDecorator = RuleDecorator{
	FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
		if node == nil {
			return true
		}
		if ctx.TypeChecker == nil {
			return true
		}

		parent := node.Parent
		if !isReportedPropertyAccessName(parent, node) {
			return true
		}

		object := ast.SkipParentheses(parent.Expression())
		if object == nil {
			return true
		}

		t := ctx.TypeChecker.GetTypeAtLocation(object)
		return utils.IsTypeAnyType(t) || utils.GetWellKnownSymbolPropertyOfType(t, "iterator", ctx.TypeChecker) != nil
	},
}

func isReportedPropertyAccessName(parent, node *ast.Node) bool {
	if parent == nil {
		return false
	}
	if !ast.IsPropertyAccessExpression(parent) {
		return false
	}

	name := parent.AsPropertyAccessExpression().Name()
	return name != nil && sameNode(name.AsNode(), node)
}
