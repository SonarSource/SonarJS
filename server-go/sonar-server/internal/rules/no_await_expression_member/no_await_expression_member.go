package no_await_expression_member

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildNoAwaitExpressionMemberMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "no-await-expression-member",
		Description: "Do not access a member directly from an await expression.",
	}
}

func isAwaitedMemberBase(node *ast.Node) bool {
	return node != nil && ast.SkipParentheses(node).Kind == ast.KindAwaitExpression
}

var NoAwaitExpressionMemberRule = rule.Rule{
	Name: "no-await-expression-member",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindPropertyAccessExpression: func(node *ast.Node) {
				propertyAccess := node.AsPropertyAccessExpression()
				if !isAwaitedMemberBase(propertyAccess.Expression) {
					return
				}

				ctx.ReportNode(propertyAccess.Name(), buildNoAwaitExpressionMemberMessage())
			},
			ast.KindElementAccessExpression: func(node *ast.Node) {
				elementAccess := node.AsElementAccessExpression()
				if !isAwaitedMemberBase(elementAccess.Expression) || elementAccess.ArgumentExpression == nil {
					return
				}

				ctx.ReportNode(elementAccess.ArgumentExpression, buildNoAwaitExpressionMemberMessage())
			},
		}
	},
}
