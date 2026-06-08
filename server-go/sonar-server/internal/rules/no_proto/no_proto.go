package no_proto

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildUnexpectedProtoMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpectedProto",
		Description: "The '__proto__' property is deprecated.",
	}
}

func getStaticPropertyName(node *ast.Node) (string, bool) {
	switch {
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		if name == nil {
			return "", false
		}
		return name.Text(), true
	case ast.IsElementAccessExpression(node):
		argument := ast.SkipParentheses(node.AsElementAccessExpression().ArgumentExpression)
		if argument == nil {
			return "", false
		}
		if ast.IsStringLiteral(argument) || argument.Kind == ast.KindNoSubstitutionTemplateLiteral {
			return argument.Text(), true
		}
	}

	return "", false
}

var NoProtoRule = rule.Rule{
	Name: "no-proto",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		reportIfNeeded := func(node *ast.Node) {
			propertyName, ok := getStaticPropertyName(node)
			if !ok || propertyName != "__proto__" {
				return
			}

			ctx.ReportNode(node, buildUnexpectedProtoMessage())
		}

		return rule.RuleListeners{
			ast.KindPropertyAccessExpression: reportIfNeeded,
			ast.KindElementAccessExpression:  reportIfNeeded,
		}
	},
}
