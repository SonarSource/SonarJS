package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var NoArrayCallbackReferenceDecorator = RuleDecorator{
	FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
		if ctx.TypeChecker == nil || node == nil {
			return false
		}

		callExpr := callbackReferenceCallExpression(node)
		if callExpr == nil {
			return false
		}

		callee := ast.SkipParentheses(callExpr.Expression)
		if !ast.IsAccessExpression(callee) {
			return false
		}

		receiverType := utils.GetConstrainedTypeAtLocation(ctx.TypeChecker, callee.Expression())
		if !isArrayTypeOrUnionOfArrays(ctx.TypeChecker, receiverType) {
			return false
		}

		paramCount, ok := getReportedCallbackParameterCount(ctx.TypeChecker, node)
		return !ok || paramCount > 1
	},
}

func callbackReferenceCallExpression(node *ast.Node) *ast.CallExpression {
	parent := node.Parent
	if parent == nil || !ast.IsCallExpression(parent) {
		return nil
	}

	callExpr := parent.AsCallExpression()
	for _, argument := range callExpr.Arguments.Nodes {
		if sameNode(argument, node) {
			return callExpr
		}
	}

	return nil
}

func isArrayTypeOrUnionOfArrays(typeChecker *checker.Checker, t *checker.Type) bool {
	if t == nil {
		return false
	}

	return utils.Every(utils.UnionTypeParts(t), func(typePart *checker.Type) bool {
		return checker.Checker_isArrayType(typeChecker, typePart)
	})
}

func getReportedCallbackParameterCount(typeChecker *checker.Checker, node *ast.Node) (int, bool) {
	if node == nil {
		return 0, false
	}

	switch {
	case ast.IsIdentifier(node), utils.IsPropertyOrElementAccess(node):
	default:
		return 0, false
	}

	t := typeChecker.GetTypeAtLocation(node)
	if symbol := checker.Type_symbol(t); symbol != nil && symbol.Flags&ast.SymbolFlagsClass != 0 {
		return 0, false
	}

	signatures := utils.GetCallSignatures(typeChecker, t)
	if len(signatures) == 0 {
		return 0, false
	}

	maxParameters := 0
	for _, signature := range signatures {
		if params := len(checker.Signature_parameters(signature)); params > maxParameters {
			maxParameters = params
		}
	}

	return maxParameters, true
}

func sameNode(left, right *ast.Node) bool {
	return left != nil && right != nil && left.Pos() == right.Pos() && left.End() == right.End()
}
