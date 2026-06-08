package s1154_useless_string_operation

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildUselessStringOperationMessage(symbol string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "uselessStringOp",
		Description: symbol + " is an immutable object; you must either store or return the result of the operation.",
	}
}

func isString(typeChecker *checker.Checker, node *ast.Node) bool {
	t := typeChecker.GetTypeAtLocation(ast.SkipParentheses(node))
	return utils.IsTypeFlagSet(t, checker.TypeFlagsStringLike)
}

func getVariableText(sourceFile *ast.SourceFile, node *ast.Node) string {
	variable := scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, node, false /* includeTrivia */)
	if len(variable) > 30 {
		return "String"
	}
	return variable
}

func isFunctionLike(node *ast.Node) bool {
	return ast.IsFunctionExpression(node) || ast.IsArrowFunction(node)
}

func isFunctionType(typeChecker *checker.Checker, node *ast.Node) bool {
	if node == nil || node.Kind == ast.KindSpreadElement {
		return false
	}

	t := typeChecker.GetTypeAtLocation(node)
	return len(utils.GetCallSignatures(typeChecker, t)) > 0
}

func isCallbackBasedReplacement(
	typeChecker *checker.Checker,
	propertyName string,
	replacementArg *ast.Node,
) bool {
	if propertyName != "replace" && propertyName != "replaceAll" {
		return false
	}

	return isFunctionLike(replacementArg) || isFunctionType(typeChecker, replacementArg)
}

func argumentAt(callExpr *ast.CallExpression, index int) *ast.Node {
	if index < 0 || index >= len(callExpr.Arguments.Nodes) {
		return nil
	}
	return callExpr.Arguments.Nodes[index]
}

var UselessStringOperationRule = rule.Rule{
	Name: "useless-string-operation",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				if node.Parent == nil || node.Parent.Kind != ast.KindExpressionStatement {
					return
				}

				callExpr := node.AsCallExpression()
				if !ast.IsPropertyAccessExpression(callExpr.Expression) {
					return
				}

				propertyAccess := callExpr.Expression.AsPropertyAccessExpression()
				object := ast.SkipParentheses(propertyAccess.Expression)
				property := propertyAccess.Name()

				if !isString(ctx.TypeChecker, object) {
					return
				}

				if isCallbackBasedReplacement(ctx.TypeChecker, property.Text(), argumentAt(callExpr, 1)) {
					return
				}

				ctx.ReportNode(property, buildUselessStringOperationMessage(getVariableText(ctx.SourceFile, object)))
			},
		}
	},
}
