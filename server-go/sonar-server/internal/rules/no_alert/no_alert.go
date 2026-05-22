package no_alert

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var prohibitedAlertCalls = map[string]struct{}{
	"alert":   {},
	"confirm": {},
	"prompt":  {},
}

func buildUnexpectedAlertMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpected",
		Description: fmt.Sprintf("Unexpected %s.", name),
	}
}

func isProhibitedAlertName(name string) bool {
	_, ok := prohibitedAlertCalls[name]
	return ok
}

func isShadowedValueName(ctx rule.RuleContext, location *ast.Node, name string) bool {
	resolution := rule.ResolveValueName(ctx, location, name)
	return resolution.LocalSymbol != nil || (resolution.AnySymbol != nil && resolution.NonGlobalSymbol != nil)
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

func isGlobalThisReference(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	if !ast.IsIdentifier(node) {
		return false
	}

	name := node.AsIdentifier().Text
	switch name {
	case "window":
		return !isShadowedValueName(ctx, node, name)
	case "globalThis":
		resolution := rule.ResolveValueName(ctx, node, name)
		return resolution.LocalSymbol == nil &&
			resolution.NonGlobalSymbol == nil &&
			(resolution.AnySymbol != nil || resolution.ConfiguredGlobalOnly)
	default:
		return false
	}
}

func getMemberCallTarget(callee *ast.Node) (*ast.Node, string, bool) {
	callee = ast.SkipParentheses(callee)

	switch {
	case ast.IsPropertyAccessExpression(callee):
		name, ok := getStaticPropertyName(callee)
		if !ok {
			return nil, "", false
		}
		return callee.AsPropertyAccessExpression().Expression, name, true
	case ast.IsElementAccessExpression(callee):
		name, ok := getStaticPropertyName(callee)
		if !ok {
			return nil, "", false
		}
		return callee.AsElementAccessExpression().Expression, name, true
	default:
		return nil, "", false
	}
}

var NoAlertRule = rule.Rule{
	Name: "no-alert",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				callee := ast.SkipParentheses(callExpr.Expression)

				if ast.IsIdentifier(callee) {
					name := callee.AsIdentifier().Text
					if isProhibitedAlertName(name) && !isShadowedValueName(ctx, callee, name) {
						ctx.ReportNode(node, buildUnexpectedAlertMessage(name))
					}
					return
				}

				receiver, name, ok := getMemberCallTarget(callee)
				if !ok || !isProhibitedAlertName(name) || !isGlobalThisReference(ctx, receiver) {
					return
				}

				ctx.ReportNode(node, buildUnexpectedAlertMessage(name))
			},
		}
	},
}
