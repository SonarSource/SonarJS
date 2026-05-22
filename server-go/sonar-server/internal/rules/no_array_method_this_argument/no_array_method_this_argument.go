package no_array_method_this_argument

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var prototypeArrayMethods = map[string]struct{}{
	"every":         {},
	"filter":        {},
	"find":          {},
	"findIndex":     {},
	"findLast":      {},
	"findLastIndex": {},
	"flatMap":       {},
	"forEach":       {},
	"map":           {},
	"some":          {},
}

var staticArrayMethods = map[string]struct{}{
	"from":      {},
	"fromAsync": {},
}

func buildPrototypeMethodMessage(method string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "error-prototype-method",
		Description: fmt.Sprintf("Do not use the `this` argument in `Array#%s()`.", method),
	}
}

func buildStaticMethodMessage(method string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "error-static-method",
		Description: fmt.Sprintf("Do not use the `this` argument in `Array.%s()`.", method),
	}
}

func isCallableValue(typeChecker *checker.Checker, node *ast.Node) bool {
	if node == nil {
		return false
	}

	t := checker.Checker_getApparentType(typeChecker, typeChecker.GetTypeAtLocation(ast.SkipParentheses(node)))
	return len(checker.Checker_getSignaturesOfType(typeChecker, t, checker.SignatureKindCall)) > 0
}

func isConcreteArrayReceiver(typeChecker *checker.Checker, node *ast.Node) bool {
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
	switch {
	case ast.IsPropertyAccessExpression(callExpr.Expression):
		return callExpr.Expression.AsPropertyAccessExpression().QuestionDotToken != nil
	case ast.IsElementAccessExpression(callExpr.Expression):
		return callExpr.Expression.AsElementAccessExpression().QuestionDotToken != nil
	default:
		return false
	}
}

func accessExpressionTarget(expr *ast.Node) *ast.Node {
	switch {
	case ast.IsPropertyAccessExpression(expr):
		return expr.AsPropertyAccessExpression().Expression
	case ast.IsElementAccessExpression(expr):
		return expr.AsElementAccessExpression().Expression
	default:
		return nil
	}
}

var NoArrayMethodThisArgumentRule = rule.Rule{
	Name: "no-array-method-this-argument",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				if isOptionalCall(callExpr) {
					return
				}

				methodName, ok := checker.Checker_getAccessedPropertyName(ctx.TypeChecker, callExpr.Expression)
				if !ok {
					return
				}

				args := callExpr.Arguments.Nodes
				if len(args) == 2 {
					if _, ok := prototypeArrayMethods[methodName]; !ok {
						return
					}
					if !isCallableValue(ctx.TypeChecker, args[0]) {
						return
					}

					receiver := accessExpressionTarget(callExpr.Expression)
					if !isConcreteArrayReceiver(ctx.TypeChecker, receiver) {
						return
					}

					ctx.ReportNode(args[1], buildPrototypeMethodMessage(methodName))
					return
				}

				if len(args) != 3 {
					return
				}
				if _, ok := staticArrayMethods[methodName]; !ok {
					return
				}
				if !isCallableValue(ctx.TypeChecker, args[1]) {
					return
				}

				target := accessExpressionTarget(callExpr.Expression)
				if !ast.IsIdentifier(target) || target.AsIdentifier().Text != "Array" {
					return
				}

				ctx.ReportNode(args[2], buildStaticMethodMessage(methodName))
			},
		}
	},
}
