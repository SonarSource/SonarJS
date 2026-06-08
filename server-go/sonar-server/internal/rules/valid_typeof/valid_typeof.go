package valid_typeof

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

type ValidTypeofOptions struct {
	RequireStringLiterals bool `json:"requireStringLiterals"`
}

var validTypes = map[string]struct{}{
	"symbol":    {},
	"undefined": {},
	"object":    {},
	"boolean":   {},
	"number":    {},
	"string":    {},
	"function":  {},
	"bigint":    {},
}

func buildInvalidValueMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "invalidValue",
		Description: "Invalid typeof comparison value.",
	}
}

func buildNotStringMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "notString",
		Description: "Typeof comparisons should be to string literals.",
	}
}

func isComparisonOperator(kind ast.Kind) bool {
	switch kind {
	case ast.KindEqualsEqualsToken,
		ast.KindEqualsEqualsEqualsToken,
		ast.KindExclamationEqualsToken,
		ast.KindExclamationEqualsEqualsToken:
		return true
	default:
		return false
	}
}

func isGlobalUndefinedIdentifier(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return ast.IsIdentifier(node) &&
		node.AsIdentifier().Text == "undefined" &&
		rule.ResolvesToGlobalValue(ctx, node, "undefined")
}

func isLiteralLikeComparison(node *ast.Node) (string, bool) {
	node = ast.SkipParentheses(node)

	switch {
	case node == nil:
		return "", false
	case ast.IsStringLiteral(node), node.Kind == ast.KindNoSubstitutionTemplateLiteral:
		return node.Text(), true
	case ast.IsNumericLiteral(node),
		node.Kind == ast.KindBigIntLiteral,
		node.Kind == ast.KindRegularExpressionLiteral,
		node.Kind == ast.KindTrueKeyword,
		node.Kind == ast.KindFalseKeyword,
		node.Kind == ast.KindNullKeyword:
		return "__invalid_literal__", true
	default:
		return "", false
	}
}

var ValidTypeofRule = rule.Rule{
	Name: "valid-typeof",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		opts := ValidTypeofOptions{}
		if options != nil {
			opts = utils.UnmarshalOptions[ValidTypeofOptions](options, "valid-typeof")
		}

		return rule.RuleListeners{
			ast.KindTypeOfExpression: func(node *ast.Node) {
				parent := node.Parent
				if !ast.IsBinaryExpression(parent) || !isComparisonOperator(parent.AsBinaryExpression().OperatorToken.Kind) {
					return
				}

				sibling := parent.AsBinaryExpression().Left
				if sibling == node {
					sibling = parent.AsBinaryExpression().Right
				}
				sibling = ast.SkipParentheses(sibling)
				if sibling == nil {
					return
				}

				if literalValue, ok := isLiteralLikeComparison(sibling); ok {
					if _, valid := validTypes[literalValue]; !valid {
						ctx.ReportNode(sibling, buildInvalidValueMessage())
					}
					return
				}

				if isGlobalUndefinedIdentifier(ctx, sibling) {
					message := buildInvalidValueMessage()
					if opts.RequireStringLiterals {
						message = buildNotStringMessage()
					}
					ctx.ReportNode(sibling, message)
					return
				}

				if opts.RequireStringLiterals && sibling.Kind != ast.KindTypeOfExpression {
					ctx.ReportNode(sibling, buildNotStringMessage())
				}
			},
		}
	},
}
