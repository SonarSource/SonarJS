package main

import (
	"strconv"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildPreferAtNegativeIndexMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "negative-index",
		Description: "Prefer `.at(\u2026)` over `[\u2026.length - index]`.",
	}
}

func isPositiveIntegerLiteral(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil || node.Kind != ast.KindNumericLiteral {
		return false
	}

	value, err := strconv.Atoi(node.Text())
	return err == nil && value >= 0
}

func isMatchingLengthAccess(sourceFile *ast.SourceFile, node *ast.Node, object *ast.Node) bool {
	node = ast.SkipParentheses(node)
	object = ast.SkipParentheses(object)
	if node == nil || object == nil || !ast.IsPropertyAccessExpression(node) {
		return false
	}

	propertyAccess := node.AsPropertyAccessExpression()
	name := propertyAccess.Name()
	return name != nil &&
		name.Text() == "length" &&
		sourceTextOfNode(sourceFile, ast.SkipParentheses(propertyAccess.Expression)) == sourceTextOfNode(sourceFile, object)
}

var PreferAtRule = rule.Rule{
	Name: "prefer-at",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				binaryExpr := node.AsBinaryExpression()
				if binaryExpr.OperatorToken.Kind != ast.KindMinusToken {
					return
				}

				parent := node.Parent
				if parent == nil || !ast.IsElementAccessExpression(parent) || !sameNode(parent.AsElementAccessExpression().ArgumentExpression, node) {
					return
				}
				if ast.IsAssignmentExpression(parent.Parent, true) && parent.Parent.AsBinaryExpression().Left == parent {
					return
				}

				elementAccess := parent.AsElementAccessExpression()
				if !isMatchingLengthAccess(ctx.SourceFile, binaryExpr.Left, elementAccess.Expression) || !isPositiveIntegerLiteral(binaryExpr.Right) {
					return
				}

				ctx.ReportNode(node, buildPreferAtNegativeIndexMessage())
			},
		}
	},
}
