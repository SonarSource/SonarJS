package s3579_no_associative_arrays

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

func buildNoAssociativeArrayMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "noAssociativeArray",
		Description: "Make it an object if it must have named properties; otherwise, use a numeric index here.",
	}
}

func isArrayExpression(typeChecker *checker.Checker, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if typeChecker == nil || node == nil {
		return false
	}

	t := typeChecker.GetTypeAtLocation(node)
	symbol := checker.Type_symbol(t)
	return symbol != nil && symbol.Name == "Array"
}

func isStringLike(typeChecker *checker.Checker, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if typeChecker == nil || node == nil {
		return false
	}

	t := typeChecker.GetTypeAtLocation(node)
	return checker.Type_flags(t)&checker.TypeFlagsStringLike != 0
}

func hasStringProperty(ctx rule.RuleContext, node *ast.Node) bool {
	switch {
	case ast.IsPropertyAccessExpression(node):
		return true
	case ast.IsElementAccessExpression(node):
		return isStringLike(ctx.TypeChecker, node.AsElementAccessExpression().ArgumentExpression)
	default:
		return false
	}
}

var NoAssociativeArraysRule = rule.Rule{
	Name: "no-associative-arrays",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				if !ast.IsAssignmentExpression(node, true) {
					return
				}

				expr := node.AsBinaryExpression()
				left := ast.SkipParentheses(expr.Left)
				if left == nil || !hasStringProperty(ctx, left) {
					return
				}

				var object *ast.Node
				switch {
				case ast.IsPropertyAccessExpression(left):
					object = left.AsPropertyAccessExpression().Expression
				case ast.IsElementAccessExpression(left):
					object = left.AsElementAccessExpression().Expression
				}

				if !isArrayExpression(ctx.TypeChecker, object) {
					return
				}

				ctx.ReportNode(node, buildNoAssociativeArrayMessage())
			},
		}
	},
}
