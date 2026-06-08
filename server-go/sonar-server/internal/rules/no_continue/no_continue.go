package no_continue

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildUnexpectedContinueMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpected",
		Description: "Unexpected use of continue statement.",
	}
}

var NoContinueRule = rule.Rule{
	Name: "no-continue",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindContinueStatement: func(node *ast.Node) {
				ctx.ReportNode(node, buildUnexpectedContinueMessage())
			},
		}
	},
}
