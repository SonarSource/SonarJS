package s3785_in_operator_type_error

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const inOperatorTypeErrorMessageID = "inOperatorTypeError"

func buildInOperatorTypeErrorMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          inOperatorTypeErrorMessageID,
		Description: "TypeError can be thrown as this operand might have primitive type.",
	}
}

func isPrimitiveRightOperand(t *checker.Type) bool {
	if t == nil {
		return false
	}

	flags := checker.Type_flags(t)
	return flags&(checker.TypeFlagsStringLike|
		checker.TypeFlagsNumberLike|
		checker.TypeFlagsBooleanLike|
		checker.TypeFlagsNull|
		checker.TypeFlagsUndefined) != 0
}

func buildInOperatorDiagnostic(ctx rule.RuleContext, expr *ast.BinaryExpression) rule.RuleDiagnostic {
	return rule.RuleDiagnostic{
		Range:   utils.TrimNodeTextRange(ctx.SourceFile, expr.Right),
		Message: buildInOperatorTypeErrorMessage(),
		LabeledRanges: []rule.RuleLabeledRange{{
			Range: scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, expr.OperatorToken.Pos()),
		}},
	}
}

var InOperatorTypeErrorRule = rule.Rule{
	Name: "in-operator-type-error",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()
				if expr.OperatorToken.Kind != ast.KindInKeyword {
					return
				}

				rightType := ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(expr.Right))
				if !isPrimitiveRightOperand(rightType) {
					return
				}

				ctx.ReportDiagnostic(buildInOperatorDiagnostic(ctx, expr))
			},
		}
	},
}
