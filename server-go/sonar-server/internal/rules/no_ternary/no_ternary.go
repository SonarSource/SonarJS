package no_ternary

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildNoTernaryOperatorMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "noTernaryOperator",
		Description: "Ternary operator used.",
	}
}

var NoTernaryRule = rule.Rule{
	Name: "no-ternary",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindConditionalExpression: func(node *ast.Node) {
				ctx.ReportNode(node, buildNoTernaryOperatorMessage())
			},
		}
	},
}
