package no_non_null_assertion

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildNoNonNullMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "noNonNull",
		Description: "Forbidden non-null assertion.",
	}
}

var NoNonNullAssertionRule = rule.Rule{
	Name: "no-non-null-assertion",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindNonNullExpression: func(node *ast.Node) {
				ctx.ReportNode(node, buildNoNonNullMessage())
			},
		}
	},
}
