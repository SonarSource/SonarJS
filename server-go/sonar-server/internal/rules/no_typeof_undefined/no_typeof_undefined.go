package no_typeof_undefined

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildNoTypeofUndefinedMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "no-typeof-undefined/error",
		Description: "Compare with `undefined` directly instead of using `typeof`.",
	}
}

func isEqualityOperator(kind ast.Kind) bool {
	switch kind {
	case ast.KindEqualsEqualsToken,
		ast.KindExclamationEqualsToken,
		ast.KindEqualsEqualsEqualsToken,
		ast.KindExclamationEqualsEqualsToken:
		return true
	default:
		return false
	}
}

func isUndefinedStringLiteral(node *ast.Node) bool {
	return ast.IsStringLiteralLike(node) && node.Text() == "undefined"
}

func parseCheckGlobalVariablesOption(options any) bool {
	optionMap, ok := options.(map[string]any)
	if !ok {
		return false
	}

	value, ok := optionMap["checkGlobalVariables"].(bool)
	return ok && value
}

func isGlobalOrUnresolvedIdentifier(ctx rule.RuleContext, node *ast.Node) bool {
	if !ast.IsIdentifier(node) {
		return false
	}

	resolution := rule.ResolveValueName(ctx, node, node.AsIdentifier().Text)
	return resolution.LocalSymbol == nil && resolution.NonGlobalSymbol == nil
}

var NoTypeofUndefinedRule = rule.Rule{
	Name: "no-typeof-undefined",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		checkGlobalVariables := parseCheckGlobalVariablesOption(options)

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				binaryExpr := node.AsBinaryExpression()
				if !isEqualityOperator(binaryExpr.OperatorToken.Kind) {
					return
				}

				left := ast.SkipParentheses(binaryExpr.Left)
				if !ast.IsTypeOfExpression(left) || !isUndefinedStringLiteral(ast.SkipParentheses(binaryExpr.Right)) {
					return
				}

				target := ast.SkipParentheses(left.AsTypeOfExpression().Expression)
				if !checkGlobalVariables && isGlobalOrUnresolvedIdentifier(ctx, target) {
					return
				}

				ctx.ReportRange(
					scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, left.Pos()),
					buildNoTypeofUndefinedMessage(),
				)
			},
		}
	},
}
