package no_negation_in_equality_check

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildNoNegationInEqualityCheckMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "no-negation-in-equality-check/error",
		Description: "Negated expression is not allowed in equality check.",
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

func isNegatedExpression(node *ast.Node) bool {
	return ast.IsPrefixUnaryExpression(node) && node.AsPrefixUnaryExpression().Operator == ast.KindExclamationToken
}

var NoNegationInEqualityCheckRule = rule.Rule{
	Name: "no-negation-in-equality-check",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				binaryExpr := node.AsBinaryExpression()
				if !isEqualityOperator(binaryExpr.OperatorToken.Kind) {
					return
				}

				left := ast.SkipParentheses(binaryExpr.Left)
				if !isNegatedExpression(left) {
					return
				}

				if isNegatedExpression(ast.SkipParentheses(left.AsPrefixUnaryExpression().Operand)) {
					return
				}

				ctx.ReportRange(
					scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, left.Pos()),
					buildNoNegationInEqualityCheckMessage(),
				)
			},
		}
	},
}
