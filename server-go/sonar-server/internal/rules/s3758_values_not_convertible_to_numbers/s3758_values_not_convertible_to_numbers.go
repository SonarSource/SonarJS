package s3758_values_not_convertible_to_numbers

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const reEvaluateDataFlowMessageID = "reEvaluateDataFlow"

func buildReEvaluateDataFlowMessage(typeName string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          reEvaluateDataFlowMessageID,
		Description: "Re-evaluate the data flow; this operand of a numeric comparison could be of type " + typeName + ".",
	}
}

func isComparisonOperator(kind ast.Kind) bool {
	switch kind {
	case ast.KindGreaterThanToken,
		ast.KindLessThanToken,
		ast.KindGreaterThanEqualsToken,
		ast.KindLessThanEqualsToken:
		return true
	default:
		return false
	}
}

func isStringType(t *checker.Type) bool {
	if utils.IsTypeFlagSet(t, checker.TypeFlagsStringLike) {
		return true
	}

	symbol := checker.Type_symbol(t)
	return symbol != nil && symbol.Name == "String"
}

func getValueOfSignatures(typeChecker *checker.Checker, t *checker.Type) []*checker.Signature {
	valueOfSymbol := checker.Checker_getPropertyOfType(typeChecker, t, "valueOf")
	if valueOfSymbol == nil {
		return nil
	}

	var signatures []*checker.Signature
	for _, declaration := range valueOfSymbol.Declarations {
		signatures = append(signatures, utils.GetCallSignatures(typeChecker, typeChecker.GetTypeAtLocation(declaration))...)
	}

	return signatures
}

func isConvertibleToNumber(typeChecker *checker.Checker, t *checker.Type) bool {
	flags := checker.Type_flags(t)
	if flags&checker.TypeFlagsBooleanLike != 0 {
		return true
	}
	if flags&checker.TypeFlagsUndefined != 0 {
		return false
	}

	valueOfSignatures := getValueOfSignatures(typeChecker, t)
	if len(valueOfSignatures) == 0 {
		return true
	}

	return utils.Some(valueOfSignatures, func(signature *checker.Signature) bool {
		returnType := checker.Checker_getReturnTypeOfSignature(typeChecker, signature)
		return utils.IsTypeFlagSet(returnType, checker.TypeFlagsNumberLike|checker.TypeFlagsBigIntLike)
	})
}

var ValuesNotConvertibleToNumbersRule = rule.Rule{
	Name: "values-not-convertible-to-numbers",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()
				if !isComparisonOperator(expr.OperatorToken.Kind) {
					return
				}

				left := ast.SkipParentheses(expr.Left)
				right := ast.SkipParentheses(expr.Right)
				if utils.IsPropertyOrElementAccess(left) || utils.IsPropertyOrElementAccess(right) {
					return
				}

				leftType := ctx.TypeChecker.GetTypeAtLocation(left)
				rightType := ctx.TypeChecker.GetTypeAtLocation(right)
				if isStringType(leftType) || isStringType(rightType) {
					return
				}

				if !isConvertibleToNumber(ctx.TypeChecker, leftType) {
					ctx.ReportNode(left, buildReEvaluateDataFlowMessage(ctx.TypeChecker.TypeToString(leftType)))
				}
				if !isConvertibleToNumber(ctx.TypeChecker, rightType) {
					ctx.ReportNode(right, buildReEvaluateDataFlowMessage(ctx.TypeChecker.TypeToString(rightType)))
				}
			},
		}
	},
}
