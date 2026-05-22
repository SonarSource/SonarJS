package no_template_curly_in_string

import (
	"regexp"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var templateExpressionPattern = regexp.MustCompile(`\$\{[^}]+\}`)

func buildUnexpectedTemplateExpressionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpectedTemplateExpression",
		Description: "Unexpected template string expression.",
	}
}

var NoTemplateCurlyInStringRule = rule.Rule{
	Name: "no-template-curly-in-string",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindStringLiteral: func(node *ast.Node) {
				if templateExpressionPattern.MatchString(node.Text()) {
					ctx.ReportNode(node, buildUnexpectedTemplateExpressionMessage())
				}
			},
		}
	},
}
