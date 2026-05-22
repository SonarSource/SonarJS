package no_caller

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildUnexpectedMessage(propertyName string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpected",
		Description: fmt.Sprintf("Avoid arguments.%s.", propertyName),
	}
}

func isForbiddenArgumentsPropertyAccess(node *ast.Node) (string, bool) {
	if !ast.IsPropertyAccessExpression(node) {
		return "", false
	}

	propertyAccess := node.AsPropertyAccessExpression()
	object := ast.SkipParentheses(propertyAccess.Expression)
	if !ast.IsIdentifier(object) || object.AsIdentifier().Text != "arguments" {
		return "", false
	}

	name := propertyAccess.Name()
	if name == nil {
		return "", false
	}

	switch propertyName := name.Text(); propertyName {
	case "callee", "caller":
		return propertyName, true
	default:
		return "", false
	}
}

var NoCallerRule = rule.Rule{
	Name: "no-caller",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindPropertyAccessExpression: func(node *ast.Node) {
				propertyName, ok := isForbiddenArgumentsPropertyAccess(node)
				if !ok {
					return
				}

				ctx.ReportNode(node, buildUnexpectedMessage(propertyName))
			},
		}
	},
}
