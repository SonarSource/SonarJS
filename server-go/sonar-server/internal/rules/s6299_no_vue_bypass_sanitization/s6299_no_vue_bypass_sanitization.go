package s6299_no_vue_bypass_sanitization

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const safeVueBypassingMessageID = "safeVueBypassing"

func buildSafeVueBypassingMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          safeVueBypassingMessageID,
		Description: "Make sure bypassing Vue built-in sanitization is safe here.",
	}
}

func propertyName(node *ast.Node) (string, bool) {
	switch {
	case node == nil:
		return "", false
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text, true
	case ast.IsStringLiteral(node), node.Kind == ast.KindNoSubstitutionTemplateLiteral:
		return node.Text(), true
	case ast.IsNumericLiteral(node):
		return node.AsNumericLiteral().Text, true
	default:
		return "", false
	}
}

func findProperty(objectLiteral *ast.ObjectLiteralExpression, name string) *ast.Node {
	if objectLiteral == nil {
		return nil
	}

	for _, property := range objectLiteral.Properties.Nodes {
		if !ast.IsPropertyAssignment(property) {
			continue
		}
		propertyText, ok := propertyName(property.AsPropertyAssignment().Name())
		if ok && propertyText == name {
			return property
		}
	}
	return nil
}

func isIdentifierNamed(node *ast.Node, expected string) bool {
	return ast.IsIdentifier(node) && node.AsIdentifier().Text == expected
}

var NoVueBypassSanitizationRule = rule.Rule{
	Name: "no-vue-bypass-sanitization",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindJsxAttribute: func(node *ast.Node) {
				attributeName, ok := propertyName(node.AsJsxAttribute().Name())
				if ok && attributeName == "domPropsInnerHTML" {
					ctx.ReportNode(node, buildSafeVueBypassingMessage())
				}
			},
			ast.KindPropertyAssignment: func(node *ast.Node) {
				parentObject := node.Parent
				if !ast.IsObjectLiteralExpression(parentObject) {
					return
				}

				name, ok := propertyName(node.AsPropertyAssignment().Name())
				if !ok || name != "innerHTML" {
					return
				}

				parentProperty := parentObject.Parent
				if !ast.IsPropertyAssignment(parentProperty) {
					return
				}

				parentName, ok := propertyName(parentProperty.AsPropertyAssignment().Name())
				if ok && parentName == "domProps" {
					ctx.ReportNode(node, buildSafeVueBypassingMessage())
				}
			},
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				callee := ast.SkipParentheses(callExpr.Expression)
				if !isIdentifierNamed(callee, "createElement") && !isIdentifierNamed(callee, "h") {
					return
				}
				if len(callExpr.Arguments.Nodes) < 2 {
					return
				}

				secondArg := ast.SkipParentheses(callExpr.Arguments.Nodes[1])
				if !ast.IsObjectLiteralExpression(secondArg) {
					return
				}

				attrsProperty := findProperty(secondArg.AsObjectLiteralExpression(), "attrs")
				if attrsProperty == nil {
					return
				}

				attrsObject := ast.SkipParentheses(attrsProperty.AsPropertyAssignment().Initializer)
				if !ast.IsObjectLiteralExpression(attrsObject) {
					return
				}

				hrefProperty := findProperty(attrsObject.AsObjectLiteralExpression(), "href")
				if hrefProperty != nil {
					ctx.ReportNode(hrefProperty, buildSafeVueBypassingMessage())
				}
			},
		}
	},
}
