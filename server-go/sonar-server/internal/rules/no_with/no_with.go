package no_with

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildUnexpectedWithMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpectedWith",
		Description: "Unexpected use of 'with' statement.",
	}
}

var NoWithRule = rule.Rule{
	Name: "no-with",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindWithStatement: func(node *ast.Node) {
				ctx.ReportNode(node, buildUnexpectedWithMessage())
			},
		}
	},
}
