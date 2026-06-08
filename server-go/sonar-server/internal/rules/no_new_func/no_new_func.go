package no_new_func

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var callMethods = map[string]struct{}{
	"apply": {},
	"bind":  {},
	"call":  {},
}

func buildNoFunctionConstructorMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "noFunctionConstructor",
		Description: "The Function constructor is eval.",
	}
}

func getStaticPropertyName(node *ast.Node) (string, bool) {
	switch {
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		if name == nil {
			return "", false
		}
		return name.Text(), true
	case ast.IsElementAccessExpression(node):
		argument := ast.SkipParentheses(node.AsElementAccessExpression().ArgumentExpression)
		if argument == nil {
			return "", false
		}
		if ast.IsStringLiteral(argument) || argument.Kind == ast.KindNoSubstitutionTemplateLiteral {
			return argument.Text(), true
		}
	}
	return "", false
}

func isGlobalFunctionIdentifier(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return ast.IsIdentifier(node) &&
		node.AsIdentifier().Text == "Function" &&
		rule.ResolvesToGlobalValue(ctx, node, "Function")
}

func isFunctionConstructorUsage(ctx rule.RuleContext, callee *ast.Node) bool {
	callee = ast.SkipParentheses(callee)

	if isGlobalFunctionIdentifier(ctx, callee) {
		return true
	}

	if !ast.IsPropertyAccessExpression(callee) && !ast.IsElementAccessExpression(callee) {
		return false
	}

	methodName, ok := getStaticPropertyName(callee)
	if !ok {
		return false
	}
	if _, ok := callMethods[methodName]; !ok {
		return false
	}

	var target *ast.Node
	switch {
	case ast.IsPropertyAccessExpression(callee):
		target = callee.AsPropertyAccessExpression().Expression
	case ast.IsElementAccessExpression(callee):
		target = callee.AsElementAccessExpression().Expression
	}

	return isGlobalFunctionIdentifier(ctx, target)
}

var NoNewFuncRule = rule.Rule{
	Name: "no-new-func",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		report := func(node *ast.Node) {
			ctx.ReportNode(node, buildNoFunctionConstructorMessage())
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				if isFunctionConstructorUsage(ctx, node.AsCallExpression().Expression) {
					report(node)
				}
			},
			ast.KindNewExpression: func(node *ast.Node) {
				if isFunctionConstructorUsage(ctx, node.AsNewExpression().Expression) {
					report(node)
				}
			},
		}
	},
}
