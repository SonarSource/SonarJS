package s2692_index_of_compare_to_positive_number

import (
	"strconv"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

func buildConsiderIncludesMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "considerIncludes",
		Description: "This check ignores index 0; consider using 'includes' method to make this check safe and explicit.",
	}
}

func isArrayExpression(typeChecker *checker.Checker, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if typeChecker == nil || node == nil {
		return false
	}

	t := typeChecker.GetTypeAtLocation(node)
	symbol := checker.Type_symbol(t)
	return symbol != nil && symbol.Name == "Array"
}

func isZero(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsNumericLiteral(node) {
		return false
	}

	value, err := strconv.ParseFloat(strings.ReplaceAll(node.AsNumericLiteral().Text, "_", ""), 64)
	return err == nil && value == 0
}

func isArrayIndexOfCall(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsCallExpression(node) {
		return false
	}

	callExpr := node.AsCallExpression()
	if len(callExpr.Arguments.Nodes) != 1 || !ast.IsPropertyAccessExpression(callExpr.Expression) {
		return false
	}

	memberExpr := callExpr.Expression.AsPropertyAccessExpression()
	name := memberExpr.Name()
	return name != nil && name.Text() == "indexOf" && isArrayExpression(ctx.TypeChecker, memberExpr.Expression)
}

var IndexOfCompareToPositiveNumberRule = rule.Rule{
	Name: "index-of-compare-to-positive-number",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()
				if expr.OperatorToken.Kind != ast.KindGreaterThanToken {
					return
				}
				if !isZero(expr.Right) || !isArrayIndexOfCall(ctx, expr.Left) {
					return
				}

				ctx.ReportNode(node, buildConsiderIncludesMessage())
			},
		}
	},
}
