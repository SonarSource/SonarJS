package s3735_void_use

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const removeVoidMessageID = "removeVoid"

func buildRemoveVoidMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          removeVoidMessageID,
		Description: `Remove this use of the "void" operator.`,
	}
}

func isVoidZero(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil && ast.IsNumericLiteral(node) && node.AsNumericLiteral().Text == "0"
}

func isIIFE(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsCallExpression(node) {
		return false
	}

	callee := ast.SkipParentheses(node.AsCallExpression().Expression)
	return callee != nil && (ast.IsFunctionExpression(callee) || ast.IsArrowFunction(callee))
}

func hasThenMethod(typeChecker *checker.Checker, node *ast.Node, t *checker.Type) bool {
	thenProperty := checker.Checker_getPropertyOfType(typeChecker, t, "then")
	if thenProperty == nil {
		return false
	}

	thenType := typeChecker.GetTypeOfSymbolAtLocation(thenProperty, node)
	return len(utils.GetCallSignatures(typeChecker, thenType)) > 0
}

func isThenableOrVoidUnion(typeChecker *checker.Checker, node *ast.Node) bool {
	t := typeChecker.GetTypeAtLocation(ast.SkipParentheses(node))
	unionTypes := utils.UnionTypeParts(t)

	hasThenable := false
	allThenableOrVoid := true

	for _, part := range unionTypes {
		isThenable := hasThenMethod(typeChecker, node, part)
		isNothingType := utils.IsTypeFlagSet(part, checker.TypeFlagsVoid|checker.TypeFlagsUndefined|checker.TypeFlagsNull)
		hasThenable = hasThenable || isThenable
		allThenableOrVoid = allThenableOrVoid && (isThenable || isNothingType)
	}

	return hasThenable && allThenableOrVoid
}

func isBareFunctionCall(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil && ast.IsCallExpression(node) && ast.IsIdentifier(ast.SkipParentheses(node.AsCallExpression().Expression))
}

var VoidUseRule = rule.Rule{
	Name: "void-use",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindVoidExpression: func(node *ast.Node) {
				expr := node.AsVoidExpression()
				argument := expr.Expression

				if isVoidZero(argument) || isIIFE(argument) {
					return
				}

				if ctx.TypeChecker != nil {
					if isThenableOrVoidUnion(ctx.TypeChecker, argument) {
						return
					}
				} else if isBareFunctionCall(argument) {
					return
				}

				ctx.ReportRange(
					scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, node.Pos()),
					buildRemoveVoidMessage(),
				)
			},
		}
	},
}
