package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var PreferSingleCallDecorator = RuleDecorator{
	FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
		if node == nil || ctx.TypeChecker == nil {
			return true
		}

		callee := reportedSingleCallCallee(node)
		if callee == nil {
			return true
		}

		return calleeAcceptsMultipleArguments(ctx.TypeChecker, callee)
	},
}

func reportedSingleCallCallee(node *ast.Node) *ast.Node {
	parent := node.Parent
	if parent == nil {
		return nil
	}

	switch {
	case isReportedPropertyAccessName(parent, node):
		return parent
	case ast.IsCallExpression(parent) && sameNode(parent.AsCallExpression().Expression, node):
		return node
	default:
		return nil
	}
}

func calleeAcceptsMultipleArguments(typeChecker *checker.Checker, callee *ast.Node) bool {
	signatures := utils.GetCallSignatures(typeChecker, typeChecker.GetTypeAtLocation(callee))
	if len(signatures) == 0 {
		return true
	}

	return utils.Some(signatures, func(signature *checker.Signature) bool {
		parameters := checker.Signature_parameters(signature)
		if len(parameters) == 0 {
			return false
		}

		lastParameter := parameters[len(parameters)-1]
		declaration := lastParameter.ValueDeclaration
		return (declaration != nil &&
			ast.IsParameterDeclaration(declaration) &&
			declaration.AsParameterDeclaration().DotDotDotToken != nil) ||
			len(parameters) > 1
	})
}
