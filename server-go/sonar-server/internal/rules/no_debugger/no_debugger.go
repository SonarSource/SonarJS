package no_debugger

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildUnexpectedDebuggerMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpected",
		Description: "Unexpected 'debugger' statement.",
	}
}

var NoDebuggerRule = rule.Rule{
	Name: "no-debugger",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindDebuggerStatement: func(node *ast.Node) {
				ctx.ReportNode(node, buildUnexpectedDebuggerMessage())
			},
		}
	},
}
