package s3403_different_types_comparison

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const (
	differentTypesComparisonMessageID = "differentTypesComparison"
	replaceOperatorMessageID          = "replaceOperator"
)

func buildDifferentTypesComparisonMessage(actual string, expected string, outcome string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          differentTypesComparisonMessageID,
		Description: fmt.Sprintf("Remove this %q check; it will always be %s. Did you mean to use %q?", actual, outcome, expected),
	}
}

func buildReplaceOperatorMessage(actual string, expected string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          replaceOperatorMessageID,
		Description: fmt.Sprintf("Replace %q with %q", actual, expected),
	}
}

func isDefensiveIndexedNullishCheck(left *ast.Node, right *ast.Node) bool {
	return (utils.IsNullishLiteral(ast.SkipParentheses(left)) && isIndexedAccess(right)) ||
		(utils.IsNullishLiteral(ast.SkipParentheses(right)) && isIndexedAccess(left))
}

func isIndexedAccess(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil && ast.IsElementAccessExpression(node)
}

func isIndeterminateType(t *checker.Type) bool {
	return utils.IsTypeFlagSet(t, checker.TypeFlagsUnknown|checker.TypeFlagsTypeParameter|checker.TypeFlagsIndexedAccess)
}

func isComparableTo(typeChecker *checker.Checker, lhs *ast.Node, rhs *ast.Node) bool {
	lhsType := checker.Checker_getBaseTypeOfLiteralType(typeChecker, typeChecker.GetTypeAtLocation(ast.SkipParentheses(lhs)))
	rhsType := checker.Checker_getBaseTypeOfLiteralType(typeChecker, typeChecker.GetTypeAtLocation(ast.SkipParentheses(rhs)))

	if isIndeterminateType(lhsType) || isIndeterminateType(rhsType) {
		return true
	}

	return checker.Checker_isTypeAssignableTo(typeChecker, lhsType, rhsType) ||
		checker.Checker_isTypeAssignableTo(typeChecker, rhsType, lhsType)
}

func buildComparisonDiagnostic(ctx rule.RuleContext, expr *ast.BinaryExpression, actual string, expected string, outcome string) rule.RuleDiagnostic {
	return rule.RuleDiagnostic{
		Range:   scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, expr.OperatorToken.Pos()),
		Message: buildDifferentTypesComparisonMessage(actual, expected, outcome),
		LabeledRanges: []rule.RuleLabeledRange{
			{Range: utils.TrimNodeTextRange(ctx.SourceFile, expr.Left)},
			{Range: utils.TrimNodeTextRange(ctx.SourceFile, expr.Right)},
		},
	}
}

var DifferentTypesComparisonRule = rule.Rule{
	Name: "different-types-comparison",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()

				var actual string
				var expected string
				var outcome string

				switch expr.OperatorToken.Kind {
				case ast.KindEqualsEqualsEqualsToken:
					actual = "==="
					expected = "=="
					outcome = "false"
				case ast.KindExclamationEqualsEqualsToken:
					actual = "!=="
					expected = "!="
					outcome = "true"
				default:
					return
				}

				if isDefensiveIndexedNullishCheck(expr.Left, expr.Right) || isComparableTo(ctx.TypeChecker, expr.Left, expr.Right) {
					return
				}

				diagnostic := buildComparisonDiagnostic(ctx, expr, actual, expected, outcome)
				suggestions := []rule.RuleSuggestion{{
					Message: buildReplaceOperatorMessage(actual, expected),
					FixesArr: []rule.RuleFix{
						rule.RuleFixReplaceRange(diagnostic.Range, expected),
					},
				}}
				diagnostic.Suggestions = &suggestions
				ctx.ReportDiagnostic(diagnostic)
			},
		}
	},
}
