package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var PreferAtDecorator = RuleDecorator{
	FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
		if ctx.TypeChecker == nil || node == nil {
			return false
		}

		nodeToCheck := preferAtTargetNode(node)
		return nodeToCheck != nil && nodeTypeHasMethod(ctx.TypeChecker, nodeToCheck, "at")
	},
}

func preferAtTargetNode(node *ast.Node) *ast.Node {
	parent := node.Parent
	if parent == nil {
		return nil
	}

	switch {
	case isReportedAccessProperty(parent, node):
		return ast.SkipParentheses(parent.Expression())
	case ast.IsCallExpression(parent):
		callExpr := parent.AsCallExpression()
		for _, argument := range callExpr.Arguments.Nodes {
			if sameNode(argument, node) && ast.IsAccessExpression(callExpr.Expression) {
				return ast.SkipParentheses(callExpr.Expression.Expression())
			}
		}
		if sameNode(callExpr.Expression, node) && len(callExpr.Arguments.Nodes) > 0 {
			return ast.SkipParentheses(callExpr.Arguments.Nodes[0])
		}
	}

	return nil
}

func isReportedAccessProperty(parent, node *ast.Node) bool {
	if parent == nil {
		return false
	}

	switch {
	case ast.IsPropertyAccessExpression(parent):
		name := parent.AsPropertyAccessExpression().Name()
		return name != nil && sameNode(name.AsNode(), node)
	case ast.IsElementAccessExpression(parent):
		return sameNode(parent.AsElementAccessExpression().ArgumentExpression, node)
	default:
		return false
	}
}

func nodeTypeHasMethod(typeChecker *checker.Checker, node *ast.Node, methodName string) bool {
	if node == nil {
		return false
	}

	t := typeChecker.GetTypeAtLocation(node)
	property := checker.Checker_getPropertyOfType(typeChecker, t, methodName)
	if property == nil {
		return false
	}
	if property.Flags&ast.SymbolFlagsMethod != 0 {
		return true
	}
	if property.Flags&ast.SymbolFlagsProperty == 0 {
		return false
	}

	propertyType := typeChecker.GetTypeOfSymbolAtLocation(property, node)
	return len(utils.GetCallSignatures(typeChecker, propertyType)) > 0
}
