package s3760_non_number_in_arithmetic_expression

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const (
	convertOperandMessageID  = "convertOperand"
	convertOperandsMessageID = "convertOperands"
	ruleName                 = "non-number-in-arithmetic-expression"
)

func buildConvertOperandMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          convertOperandMessageID,
		Description: "Convert this operand into a number.",
	}
}

func buildConvertOperandsMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          convertOperandsMessageID,
		Description: "Convert the operands of this operation into numbers.",
	}
}

func typeSymbolName(t *checker.Type) string {
	symbol := checker.Type_symbol(t)
	if symbol == nil {
		return ""
	}
	return symbol.Name
}

func isBoolean(t *checker.Type) bool {
	return utils.IsTypeFlagSet(t, checker.TypeFlagsBooleanLike) || typeSymbolName(t) == "Boolean"
}

func isNumber(t *checker.Type) bool {
	return utils.IsTypeFlagSet(t, checker.TypeFlagsNumberLike) || typeSymbolName(t) == "Number"
}

func isStringType(t *checker.Type) bool {
	return utils.IsTypeFlagSet(t, checker.TypeFlagsStringLike) || typeSymbolName(t) == "String"
}

func isDateType(t *checker.Type) bool {
	return typeSymbolName(t) == "Date"
}

func isBooleanOrDate(t *checker.Type) bool {
	return isBoolean(t) || isDateType(t)
}

func isBooleanOrNumber(t *checker.Type) bool {
	return isBoolean(t) || isNumber(t)
}

func isBooleanStringOrDate(t *checker.Type) bool {
	return isBoolean(t) || isStringType(t) || isDateType(t)
}

func isDateMinusDateException(leftType *checker.Type, rightType *checker.Type, operator ast.Kind) bool {
	if operator != ast.KindMinusToken && operator != ast.KindMinusEqualsToken {
		return false
	}

	if isDateType(leftType) && (isDateType(rightType) || utils.IsTypeAnyType(rightType)) {
		return true
	}

	return isDateType(rightType) && utils.IsTypeAnyType(leftType)
}

func trimmedRange(sourceFile *ast.SourceFile, node *ast.Node) rule.RuleLabeledRange {
	return rule.RuleLabeledRange{Range: utils.TrimNodeTextRange(sourceFile, node)}
}

func reportOperandWithSecondary(ctx rule.RuleContext, operand *ast.Node, secondary *ast.Node) {
	diagnostic := rule.RuleDiagnostic{
		Range:      utils.TrimNodeTextRange(ctx.SourceFile, operand),
		RuleName:   ruleName,
		Message:    buildConvertOperandMessage(),
		SourceFile: ctx.SourceFile,
	}
	if secondary != nil {
		diagnostic.LabeledRanges = []rule.RuleLabeledRange{trimmedRange(ctx.SourceFile, secondary)}
	}
	ctx.ReportDiagnostic(diagnostic)
}

func reportOperands(ctx rule.RuleContext, expression *ast.Node, operands ...*ast.Node) {
	labeledRanges := make([]rule.RuleLabeledRange, 0, len(operands))
	for _, operand := range operands {
		if operand != nil {
			labeledRanges = append(labeledRanges, trimmedRange(ctx.SourceFile, operand))
		}
	}

	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:         utils.TrimNodeTextRange(ctx.SourceFile, expression),
		RuleName:      ruleName,
		Message:       buildConvertOperandsMessage(),
		SourceFile:    ctx.SourceFile,
		LabeledRanges: labeledRanges,
	})
}

func checkPlus(
	ctx rule.RuleContext,
	expression *ast.Node,
	left *ast.Node,
	right *ast.Node,
	leftType *checker.Type,
	rightType *checker.Type,
) {
	if isNumber(leftType) && isBooleanOrDate(rightType) {
		reportOperandWithSecondary(ctx, right, left)
	}
	if isNumber(rightType) && isBooleanOrDate(leftType) {
		reportOperandWithSecondary(ctx, left, right)
	}
}

func checkComparison(
	ctx rule.RuleContext,
	left *ast.Node,
	right *ast.Node,
	leftType *checker.Type,
	rightType *checker.Type,
) {
	if isBooleanOrNumber(leftType) && isBooleanStringOrDate(rightType) {
		ctx.ReportNode(right, buildConvertOperandMessage())
	} else if isBooleanOrNumber(rightType) && isBooleanStringOrDate(leftType) {
		ctx.ReportNode(left, buildConvertOperandMessage())
	}
}

func checkArithmetic(
	ctx rule.RuleContext,
	expression *ast.Node,
	left *ast.Node,
	right *ast.Node,
	leftType *checker.Type,
	rightType *checker.Type,
	operator ast.Kind,
) {
	if isDateMinusDateException(leftType, rightType, operator) {
		return
	}

	var offending []*ast.Node
	if isBooleanStringOrDate(leftType) {
		offending = append(offending, left)
	}
	if isBooleanStringOrDate(rightType) {
		offending = append(offending, right)
	}

	if len(offending) != 0 {
		reportOperands(ctx, expression, offending...)
	}
}

var NonNumberInArithmeticExpressionRule = rule.Rule{
	Name: ruleName,
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()
				left := ast.SkipParentheses(expr.Left)
				right := ast.SkipParentheses(expr.Right)
				leftType := ctx.TypeChecker.GetTypeAtLocation(left)
				rightType := ctx.TypeChecker.GetTypeAtLocation(right)

				switch expr.OperatorToken.Kind {
				case ast.KindPlusToken, ast.KindPlusEqualsToken:
					checkPlus(ctx, node, left, right, leftType, rightType)
				case ast.KindLessThanToken,
					ast.KindGreaterThanToken,
					ast.KindLessThanEqualsToken,
					ast.KindGreaterThanEqualsToken:
					checkComparison(ctx, left, right, leftType, rightType)
				case ast.KindMinusToken,
					ast.KindAsteriskToken,
					ast.KindSlashToken,
					ast.KindPercentToken,
					ast.KindMinusEqualsToken,
					ast.KindAsteriskEqualsToken,
					ast.KindSlashEqualsToken,
					ast.KindPercentEqualsToken:
					checkArithmetic(ctx, node, left, right, leftType, rightType, expr.OperatorToken.Kind)
				}
			},
			ast.KindPrefixUnaryExpression: func(node *ast.Node) {
				expr := node.AsPrefixUnaryExpression()
				if expr.Operator != ast.KindMinusToken && expr.Operator != ast.KindPlusPlusToken && expr.Operator != ast.KindMinusMinusToken {
					return
				}

				operand := ast.SkipParentheses(expr.Operand)
				if isBooleanStringOrDate(ctx.TypeChecker.GetTypeAtLocation(operand)) {
					ctx.ReportNode(operand, buildConvertOperandMessage())
				}
			},
			ast.KindPostfixUnaryExpression: func(node *ast.Node) {
				expr := node.AsPostfixUnaryExpression()
				if expr.Operator != ast.KindPlusPlusToken && expr.Operator != ast.KindMinusMinusToken {
					return
				}

				operand := ast.SkipParentheses(expr.Operand)
				if isBooleanStringOrDate(ctx.TypeChecker.GetTypeAtLocation(operand)) {
					ctx.ReportNode(operand, buildConvertOperandMessage())
				}
			},
		}
	},
}
