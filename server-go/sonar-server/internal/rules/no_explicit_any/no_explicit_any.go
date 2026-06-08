package no_explicit_any

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

type noExplicitAnyOptions struct {
	FixToUnknown   bool `json:"fixToUnknown"`
	IgnoreRestArgs bool `json:"ignoreRestArgs"`
}

func buildUnexpectedAnyMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpectedAny",
		Description: "Unexpected any. Specify a different type.",
	}
}

func isArrayLikeTypeReference(node *ast.Node) bool {
	if !ast.IsTypeReferenceNode(node) {
		return false
	}

	typeName := node.AsTypeReferenceNode().TypeName
	if !ast.IsIdentifier(typeName) {
		return false
	}

	switch typeName.AsIdentifier().Text {
	case "Array", "ReadonlyArray":
		return true
	default:
		return false
	}
}

func isIgnoredRestArgAny(node *ast.Node) bool {
	current := node.Parent
	for current != nil {
		switch {
		case ast.IsArrayTypeNode(current):
			current = current.Parent
		case ast.IsTypeOperatorNode(current):
			if current.AsTypeOperatorNode().Operator != ast.KindReadonlyKeyword {
				return false
			}
			current = current.Parent
		case isArrayLikeTypeReference(current):
			current = current.Parent
		case ast.IsParenthesizedTypeNode(current):
			current = current.Parent
		case ast.IsParameterDeclaration(current):
			return current.AsParameterDeclaration().DotDotDotToken != nil &&
				current.Parent != nil &&
				ast.IsFunctionLike(current.Parent)
		default:
			return false
		}
	}

	return false
}

var NoExplicitAnyRule = rule.Rule{
	Name: "no-explicit-any",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		opts := utils.UnmarshalOptions[noExplicitAnyOptions](options, "no-explicit-any")

		return rule.RuleListeners{
			ast.KindAnyKeyword: func(node *ast.Node) {
				if opts.IgnoreRestArgs && isIgnoredRestArgAny(node) {
					return
				}

				ctx.ReportNode(node, buildUnexpectedAnyMessage())
			},
		}
	},
}
