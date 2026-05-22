package main

import (
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func sourceTextOfNode(sourceFile *ast.SourceFile, node *ast.Node) string {
	if sourceFile == nil || node == nil {
		return ""
	}
	return scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, node, false)
}

func staticPropertyName(node *ast.Node) (string, *ast.Node, bool) {
	node = ast.SkipParentheses(node)
	if node == nil {
		return "", nil, false
	}

	switch {
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		if name == nil {
			return "", nil, false
		}
		return name.Text(), name.AsNode(), true
	case ast.IsElementAccessExpression(node):
		argument := ast.SkipParentheses(node.AsElementAccessExpression().ArgumentExpression)
		if argument == nil {
			return "", nil, false
		}
		if ast.IsStringLiteral(argument) || argument.Kind == ast.KindNoSubstitutionTemplateLiteral {
			return argument.Text(), argument, true
		}
	}

	return "", nil, false
}

func statementSiblings(node *ast.Node) []*ast.Node {
	if node == nil || node.Parent == nil {
		return nil
	}

	switch {
	case ast.IsSourceFile(node.Parent):
		return node.Parent.AsSourceFile().Statements.Nodes
	case ast.IsBlock(node.Parent):
		return node.Parent.AsBlock().Statements.Nodes
	case ast.IsCaseClause(node.Parent), ast.IsDefaultClause(node.Parent):
		return node.Parent.AsCaseOrDefaultClause().Statements.Nodes
	default:
		return nil
	}
}

func previousStatement(node *ast.Node) *ast.Node {
	siblings := statementSiblings(node)
	for index, sibling := range siblings {
		if sameNode(sibling, node) && index > 0 {
			return siblings[index-1]
		}
	}
	return nil
}

func expressionStatementCall(node *ast.Node) *ast.CallExpression {
	if !ast.IsExpressionStatement(node) {
		return nil
	}

	expression := ast.SkipParentheses(node.AsExpressionStatement().Expression)
	if expression == nil || !ast.IsCallExpression(expression) {
		return nil
	}

	return expression.AsCallExpression()
}

func isTopLevelCallExpression(node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) || ast.IsClassDeclaration(current) || ast.IsClassExpression(current) {
			return false
		}
	}
	return true
}
