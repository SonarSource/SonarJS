package no_object_as_default_parameter

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildIdentifierMessage(parameter string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "identifier",
		Description: fmt.Sprintf("Do not use an object literal as default for parameter `%s`.", parameter),
	}
}

func buildNonIdentifierMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "non-identifier",
		Description: "Do not use an object literal as default.",
	}
}

var NoObjectAsDefaultParameterRule = rule.Rule{
	Name: "no-object-as-default-parameter",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindParameter: func(node *ast.Node) {
				param := node.AsParameterDeclaration()
				if param.Initializer == nil {
					return
				}
				if !ast.IsObjectLiteralExpression(param.Initializer) {
					return
				}

				objectLiteral := param.Initializer.AsObjectLiteralExpression()
				if len(objectLiteral.Properties.Nodes) == 0 {
					return
				}

				nameNode := param.Name()
				if ast.IsIdentifier(nameNode) {
					ctx.ReportNode(nameNode, buildIdentifierMessage(nameNode.AsIdentifier().Text))
					return
				}

				ctx.ReportNode(param.Initializer, buildNonIdentifierMessage())
			},
		}
	},
}
