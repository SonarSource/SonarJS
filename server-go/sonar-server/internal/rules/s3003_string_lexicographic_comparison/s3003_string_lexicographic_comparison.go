package s3003_string_lexicographic_comparison

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const convertOperandsMessageID = "convertOperands"

var comparisonOperators = map[ast.Kind]string{
	ast.KindLessThanToken:          "<",
	ast.KindLessThanEqualsToken:    "<=",
	ast.KindGreaterThanToken:       ">",
	ast.KindGreaterThanEqualsToken: ">=",
}

func buildConvertOperandsMessage(operator string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          convertOperandsMessageID,
		Description: `Convert operands of this use of "` + operator + `" to number type.`,
	}
}

func buildConvertOperandsDiagnostic(
	ctx rule.RuleContext,
	binaryExpr *ast.BinaryExpression,
	operator string,
) rule.RuleDiagnostic {
	return rule.RuleDiagnostic{
		Range:   scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, binaryExpr.OperatorToken.Pos()),
		Message: buildConvertOperandsMessage(operator),
		LabeledRanges: []rule.RuleLabeledRange{
			{Range: utils.TrimNodeTextRange(ctx.SourceFile, binaryExpr.Left)},
			{Range: utils.TrimNodeTextRange(ctx.SourceFile, binaryExpr.Right)},
		},
	}
}

func isStringType(ctx rule.RuleContext, node *ast.Node) bool {
	t := ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(node))
	return utils.GetTypeName(ctx.TypeChecker, t) == "string"
}

func isLiteralException(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsStringLiteral(node) {
		return false
	}

	textRange := utils.TrimNodeTextRange(ctx.SourceFile, node)
	return textRange.End()-textRange.Pos() == 3
}

func isCallArgument(callExpr *ast.CallExpression, callback *ast.Node) bool {
	for _, argument := range callExpr.Arguments.Nodes {
		if argument == callback {
			return true
		}
	}
	return false
}

func calleeName(node *ast.Node) (string, bool) {
	node = ast.SkipParentheses(node)
	switch {
	case node == nil:
		return "", false
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text, true
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		if name != nil {
			return name.Text(), true
		}
	}
	return "", false
}

func isWithinSortCallback(node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsFunctionExpression(current) && !ast.IsArrowFunction(current) {
			continue
		}

		parent := current.Parent
		if parent == nil || !ast.IsCallExpression(parent) {
			return false
		}

		callExpr := parent.AsCallExpression()
		if !isCallArgument(callExpr, current) {
			return false
		}

		name, ok := calleeName(callExpr.Expression)
		return ok && strings.Contains(strings.ToLower(name), "sort")
	}

	return false
}

var StringLexicographicComparisonRule = rule.Rule{
	Name: "strings-comparison",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				binaryExpr := node.AsBinaryExpression()
				operator, ok := comparisonOperators[binaryExpr.OperatorToken.Kind]
				if !ok {
					return
				}

				if !isStringType(ctx, binaryExpr.Left) || !isStringType(ctx, binaryExpr.Right) {
					return
				}
				if isLiteralException(ctx, binaryExpr.Left) || isLiteralException(ctx, binaryExpr.Right) {
					return
				}
				if isWithinSortCallback(node) {
					return
				}

				ctx.ReportDiagnostic(buildConvertOperandsDiagnostic(ctx, binaryExpr, operator))
			},
		}
	},
}
