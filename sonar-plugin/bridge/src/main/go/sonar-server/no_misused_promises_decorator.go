package main

import (
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

var NoMisusedPromisesDecorator = RuleDecorator{
	FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
		return diagnostic.Message.Id != "conditional" || !isLazyInitializationPattern(ctx.SourceFile, node)
	},
	TransformNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) rule.RuleDiagnostic {
		if ctx.SourceFile != nil && node != nil && ast.IsFunctionLike(node) {
			diagnostic.Range = utils.GetFunctionHeadLoc(ctx.SourceFile, node)
		}
		return diagnostic
	},
}

func isLazyInitializationPattern(sourceFile *ast.SourceFile, node *ast.Node) bool {
	if sourceFile == nil || node == nil || !isVariableLikeNode(node) {
		return false
	}

	ifStatement := firstLocalIfStatement(node)
	return ifStatement != nil && hasAssignmentInIfBody(sourceFile, ifStatement, node)
}

func isVariableLikeNode(node *ast.Node) bool {
	return ast.IsIdentifier(node) || utils.IsPropertyOrElementAccess(node)
}

func firstLocalIfStatement(node *ast.Node) *ast.IfStatement {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsIfStatement(current) {
			return current.AsIfStatement()
		}
		if ast.IsFunctionLike(current) {
			return nil
		}
	}
	return nil
}

func hasAssignmentInIfBody(sourceFile *ast.SourceFile, ifStatement *ast.IfStatement, variable *ast.Node) bool {
	var statements []*ast.Node
	if ast.IsBlock(ifStatement.ThenStatement) {
		statements = ifStatement.ThenStatement.AsBlock().Statements.Nodes
	} else {
		statements = []*ast.Node{ifStatement.ThenStatement}
	}

	for _, statement := range statements {
		if !ast.IsExpressionStatement(statement) {
			continue
		}

		expression := ast.SkipParentheses(statement.AsExpressionStatement().Expression)
		if !ast.IsAssignmentExpression(expression, false) {
			continue
		}

		if equivalentNodeText(sourceFile, expression.AsBinaryExpression().Left, variable) {
			return true
		}
	}
	return false
}

func equivalentNodeText(sourceFile *ast.SourceFile, left, right *ast.Node) bool {
	return trimmedNodeText(sourceFile, left) == trimmedNodeText(sourceFile, right)
}

func trimmedNodeText(sourceFile *ast.SourceFile, node *ast.Node) string {
	textRange := utils.TrimNodeTextRange(sourceFile, ast.SkipParentheses(node))
	return sourceFile.Text()[textRange.Pos():textRange.End()]
}
