package s6959_reduce_initial_value

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

func buildReduceInitialValueMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "message",
		Description: "Add an initial value to this \"reduce()\" call.",
	}
}

func isArrayReceiver(typeChecker *checker.Checker, node *ast.Node) bool {
	if node == nil {
		return false
	}

	t := typeChecker.GetTypeAtLocation(ast.SkipParentheses(node))
	symbol := checker.Type_symbol(t)
	return symbol != nil && symbol.Name == "Array"
}

func isOptionalCall(callExpr *ast.CallExpression) bool {
	if callExpr.QuestionDotToken != nil {
		return true
	}

	if ast.IsPropertyAccessExpression(callExpr.Expression) {
		return callExpr.Expression.AsPropertyAccessExpression().QuestionDotToken != nil
	}

	return false
}

var ReduceInitialValueRule = rule.Rule{
	Name: "reduce-initial-value",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				if isOptionalCall(callExpr) {
					return
				}

				if len(callExpr.Arguments.Nodes) != 1 || !ast.IsPropertyAccessExpression(callExpr.Expression) {
					return
				}

				propertyAccess := callExpr.Expression.AsPropertyAccessExpression()
				if propertyAccess.Name().Text() != "reduce" {
					return
				}

				if !isArrayReceiver(ctx.TypeChecker, propertyAccess.Expression) {
					return
				}

				ctx.ReportNode(propertyAccess.Name(), buildReduceInitialValueMessage())
			},
		}
	},
}
