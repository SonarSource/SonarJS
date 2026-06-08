package s3757_operation_returning_nan

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const noEvaluatedNaNMessageID = "noEvaluatedNaN"

func buildNoEvaluatedNaNMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          noEvaluatedNaNMessageID,
		Description: `Change the expression which uses this operand so that it can't evaluate to "NaN" (Not a Number).`,
	}
}

func isExcludedObjectType(t *checker.Type) bool {
	symbol := checker.Type_symbol(t)
	if symbol == nil {
		return false
	}

	switch symbol.Name {
	case "Date", "Number", "Boolean":
		return true
	default:
		return false
	}
}

func isObjectType(t *checker.Type) bool {
	return utils.IsTypeFlagSet(t, checker.TypeFlagsObject) && !isExcludedObjectType(t)
}

func isBinaryNaNOperator(kind ast.Kind) bool {
	switch kind {
	case ast.KindSlashToken,
		ast.KindAsteriskToken,
		ast.KindPercentToken,
		ast.KindMinusToken,
		ast.KindMinusEqualsToken,
		ast.KindAsteriskEqualsToken,
		ast.KindSlashEqualsToken,
		ast.KindPercentEqualsToken:
		return true
	default:
		return false
	}
}

func isUnaryNaNOperator(kind ast.Kind) bool {
	switch kind {
	case ast.KindPlusPlusToken,
		ast.KindMinusMinusToken,
		ast.KindPlusToken,
		ast.KindMinusToken:
		return true
	default:
		return false
	}
}

var OperationReturningNaNRule = rule.Rule{
	Name: "operation-returning-nan",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()
				if !isBinaryNaNOperator(expr.OperatorToken.Kind) {
					return
				}

				leftType := ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(expr.Left))
				rightType := ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(expr.Right))
				if isObjectType(leftType) {
					ctx.ReportNode(expr.Left, buildNoEvaluatedNaNMessage())
				}
				if isObjectType(rightType) {
					ctx.ReportNode(expr.Right, buildNoEvaluatedNaNMessage())
				}
			},
			ast.KindPrefixUnaryExpression: func(node *ast.Node) {
				expr := node.AsPrefixUnaryExpression()
				if !isUnaryNaNOperator(expr.Operator) {
					return
				}

				if isObjectType(ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(expr.Operand))) {
					ctx.ReportNode(node, buildNoEvaluatedNaNMessage())
				}
			},
			ast.KindPostfixUnaryExpression: func(node *ast.Node) {
				expr := node.AsPostfixUnaryExpression()
				if !isUnaryNaNOperator(expr.Operator) {
					return
				}

				if isObjectType(ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(expr.Operand))) {
					ctx.ReportNode(node, buildNoEvaluatedNaNMessage())
				}
			},
		}
	},
}
