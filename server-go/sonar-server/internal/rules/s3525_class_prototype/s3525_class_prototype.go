package s3525_class_prototype

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

func buildDeclareClassMessage(className string, declaration string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "declareClass",
		Description: fmt.Sprintf("Declare a %q class and move this declaration of %q into it.", className, declaration),
	}
}

func isFunctionLikeSyntax(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil && (ast.IsFunctionDeclaration(node) || ast.IsFunctionExpression(node) || ast.IsArrowFunction(node))
}

func isFunctionValue(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	if isFunctionLikeSyntax(node) {
		return true
	}
	if ctx.TypeChecker == nil {
		return false
	}

	t := ctx.TypeChecker.GetTypeAtLocation(node)
	symbol := checker.Type_symbol(t)
	if symbol != nil && symbol.Flags&ast.SymbolFlagsFunction != 0 {
		return true
	}

	if !ast.IsIdentifier(node) {
		return false
	}

	symbol = ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil || symbol.ValueDeclaration == nil {
		return false
	}

	switch {
	case ast.IsFunctionDeclaration(symbol.ValueDeclaration):
		return true
	case ast.IsVariableDeclaration(symbol.ValueDeclaration):
		return isFunctionLikeSyntax(symbol.ValueDeclaration.AsVariableDeclaration().Initializer)
	default:
		return false
	}
}

var ClassPrototypeRule = rule.Rule{
	Name: "class-prototype",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				if !ast.IsAssignmentExpression(node, true) {
					return
				}

				expr := node.AsBinaryExpression()
				left := ast.SkipParentheses(expr.Left)
				if left == nil || !ast.IsPropertyAccessExpression(left) || !isFunctionValue(ctx, expr.Right) {
					return
				}

				memberExpr := left.AsPropertyAccessExpression()
				declaration := memberExpr.Name()
				if declaration == nil {
					return
				}

				prototypeExpr := ast.SkipParentheses(memberExpr.Expression)
				if prototypeExpr == nil || !ast.IsPropertyAccessExpression(prototypeExpr) {
					return
				}

				prototypeAccess := prototypeExpr.AsPropertyAccessExpression()
				prototypeName := prototypeAccess.Name()
				if prototypeName == nil || prototypeName.Text() != "prototype" {
					return
				}

				classExpr := ast.SkipParentheses(prototypeAccess.Expression)
				if classExpr == nil || !ast.IsIdentifier(classExpr) {
					return
				}

				ctx.ReportNode(left, buildDeclareClassMessage(classExpr.AsIdentifier().Text, declaration.Text()))
			},
		}
	},
}
