package no_unreadable_iife

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildNoUnreadableIifeMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "no-unreadable-iife",
		Description: "IIFE with parenthesized arrow function body is considered unreadable.",
	}
}

var NoUnreadableIifeRule = rule.Rule{
	Name: "no-unreadable-iife",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				callee := ast.SkipParentheses(callExpr.Expression)
				if !ast.IsArrowFunction(callee) {
					return
				}

				body := callee.AsArrowFunction().Body
				if body == nil || body.Kind == ast.KindBlock || !ast.IsParenthesizedExpression(body) {
					return
				}

				ctx.ReportNode(body, buildNoUnreadableIifeMessage())
			},
		}
	},
}
