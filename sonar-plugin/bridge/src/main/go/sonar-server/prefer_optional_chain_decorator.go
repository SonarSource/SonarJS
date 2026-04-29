package main

import (
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

var PreferOptionalChainDecorator = RuleDecorator{
	FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
		if ctx.TypeChecker == nil || ctx.Program == nil || node == nil {
			return true
		}
		if !isPreferOptionalChainCandidate(node) {
			return true
		}

		compilerOptions := ctx.Program.Options()
		if !utils.IsStrictCompilerOptionEnabled(compilerOptions, compilerOptions.StrictNullChecks) {
			return true
		}

		return !isUnsafePreferOptionalChainContext(ctx, ast.SkipParentheses(node))
	},
}

func isPreferOptionalChainCandidate(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return ast.IsBinaryExpression(node) && node.AsBinaryExpression().OperatorToken.Kind == ast.KindAmpersandAmpersandToken
}

func isUnsafePreferOptionalChainContext(ctx rule.RuleContext, node *ast.Node) bool {
	return matchesFunctionReturnFalsePositive(ctx, node) ||
		matchesTypedVariableInitializerFalsePositive(ctx, node) ||
		matchesObjectLiteralPropertyFalsePositive(ctx, node) ||
		matchesCallArgumentFalsePositive(ctx, node) ||
		matchesAssignmentFalsePositive(ctx, node)
}

func allowsUndefinedType(t *checker.Type) bool {
	for _, constituent := range utils.UnionTypeParts(t) {
		flags := checker.Type_flags(constituent)
		if flags&(checker.TypeFlagsUndefined|checker.TypeFlagsAny|checker.TypeFlagsUnknown|checker.TypeFlagsVoid) != 0 {
			return true
		}
	}
	return false
}

func contextualTypeSubject(node *ast.Node) *ast.Node {
	current := node
	for current.Parent != nil &&
		ast.IsLogicalExpression(current.Parent) &&
		(current.Parent.AsBinaryExpression().Left == current || current.Parent.AsBinaryExpression().Right == current) {
		current = current.Parent
	}
	return current
}

func hasTypeUnsafeContextualType(ctx rule.RuleContext, node *ast.Node) bool {
	contextualType := checker.Checker_getContextualType(ctx.TypeChecker, contextualTypeSubject(node), checker.ContextFlagsNone)
	return contextualType != nil && !allowsUndefinedType(contextualType)
}

func matchesFunctionReturnFalsePositive(ctx rule.RuleContext, node *ast.Node) bool {
	return node.Parent != nil &&
		node.Parent.Kind == ast.KindReturnStatement &&
		!ast.IsBinaryExpression(ast.SkipParentheses(node.AsBinaryExpression().Right)) &&
		hasTypeUnsafeContextualType(ctx, node)
}

func matchesTypedVariableInitializerFalsePositive(ctx rule.RuleContext, node *ast.Node) bool {
	return ast.IsVariableDeclaration(node.Parent) &&
		node.Parent.AsVariableDeclaration().Initializer == node &&
		!ast.IsBinaryExpression(ast.SkipParentheses(node.AsBinaryExpression().Right)) &&
		hasTypeUnsafeContextualType(ctx, node)
}

func matchesObjectLiteralPropertyFalsePositive(ctx rule.RuleContext, node *ast.Node) bool {
	return ast.IsPropertyAssignment(node.Parent) &&
		node.Parent.AsPropertyAssignment().Initializer == node &&
		!ast.IsBinaryExpression(ast.SkipParentheses(node.AsBinaryExpression().Right)) &&
		hasTypeUnsafeContextualType(ctx, node)
}

func matchesCallArgumentFalsePositive(ctx rule.RuleContext, node *ast.Node) bool {
	if ast.IsBinaryExpression(ast.SkipParentheses(node.AsBinaryExpression().Right)) {
		return false
	}

	subject := contextualTypeSubject(node)
	parent := subject.Parent
	if parent == nil || !ast.IsCallExpression(parent) {
		return false
	}

	for _, argument := range parent.AsCallExpression().Arguments.Nodes {
		if argument == subject {
			contextualType := checker.Checker_getContextualType(ctx.TypeChecker, subject, checker.ContextFlagsNone)
			return contextualType != nil && !allowsUndefinedType(contextualType)
		}
	}
	return false
}

func matchesAssignmentFalsePositive(ctx rule.RuleContext, node *ast.Node) bool {
	parent := node.Parent
	if parent == nil || !ast.IsAssignmentExpression(parent, false) || parent.AsBinaryExpression().Right != node {
		return false
	}
	if ast.IsBinaryExpression(ast.SkipParentheses(node.AsBinaryExpression().Right)) {
		return false
	}

	target := parent.AsBinaryExpression().Left
	if !(ast.IsIdentifier(target) || utils.IsPropertyOrElementAccess(target)) {
		return false
	}

	targetType := ctx.TypeChecker.GetTypeAtLocation(target)
	return targetType != nil && !allowsUndefinedType(targetType)
}
