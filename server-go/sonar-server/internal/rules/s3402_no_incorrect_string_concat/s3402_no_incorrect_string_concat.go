package s3402_no_incorrect_string_concat

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const reviewConcatMessageID = "reviewConcat"

func buildReviewConcatMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          reviewConcatMessageID,
		Description: "Review this expression to be sure that the concatenation was intended.",
	}
}

func buildConcatDiagnostic(
	ctx rule.RuleContext,
	operator *ast.Node,
	left *ast.Node,
	right *ast.Node,
	leftType *checker.Type,
	rightType *checker.Type,
) rule.RuleDiagnostic {
	return rule.RuleDiagnostic{
		Range:   scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, operator.Pos()),
		Message: buildReviewConcatMessage(),
		LabeledRanges: []rule.RuleLabeledRange{
			{
				Range: utils.TrimNodeTextRange(ctx.SourceFile, left),
				Label: "left operand has type " + ctx.TypeChecker.TypeToString(leftType) + ".",
			},
			{
				Range: utils.TrimNodeTextRange(ctx.SourceFile, right),
				Label: "right operand has type " + ctx.TypeChecker.TypeToString(rightType) + ".",
			},
		},
	}
}

func isStringType(t *checker.Type) bool {
	return utils.IsTypeFlagSet(t, checker.TypeFlagsStringLike)
}

func isLiteralType(t *checker.Type) bool {
	if utils.IsUnionType(t) {
		for _, part := range t.Types() {
			if isLiteralType(part) {
				return true
			}
		}
		return false
	}

	return utils.IsTypeFlagSet(t, checker.TypeFlagsStringLiteral)
}

func isStringLiteralNode(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil && (ast.IsStringLiteral(node) || node.Kind == ast.KindNoSubstitutionTemplateLiteral)
}

func isConcatenation(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil &&
		ast.IsBinaryExpression(node) &&
		node.AsBinaryExpression().OperatorToken.Kind == ast.KindPlusToken
}

func isStringPlusNonString(typeChecker *checker.Checker, type1 *checker.Type, type2 *checker.Type) bool {
	if isLiteralType(type1) || isLiteralType(type2) {
		return false
	}

	type2Text := typeChecker.TypeToString(type2)
	isObjectLike := type2Text == "object" || type2Text == "Object"
	return isStringType(type1) && !isObjectLike && !checker.Checker_isTypeAssignableTo(typeChecker, type1, type2)
}

var NoIncorrectStringConcatRule = rule.Rule{
	Name: "no-incorrect-string-concat",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		checkConcatenation := func(operator *ast.Node, left *ast.Node, right *ast.Node) {
			if isStringLiteralNode(left) || isStringLiteralNode(right) || isConcatenation(left) || isConcatenation(right) {
				return
			}

			leftType := ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(left))
			rightType := ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(right))
			if isStringPlusNonString(ctx.TypeChecker, leftType, rightType) || isStringPlusNonString(ctx.TypeChecker, rightType, leftType) {
				ctx.ReportDiagnostic(buildConcatDiagnostic(ctx, operator, left, right, leftType, rightType))
			}
		}

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()
				switch expr.OperatorToken.Kind {
				case ast.KindPlusToken, ast.KindPlusEqualsToken:
					checkConcatenation(expr.OperatorToken, expr.Left, expr.Right)
				}
			},
		}
	},
}
