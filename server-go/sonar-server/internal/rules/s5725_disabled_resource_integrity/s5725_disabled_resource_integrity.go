package s5725_disabled_resource_integrity

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const safeResourceMessageID = "safeResource"

func buildSafeResourceMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          safeResourceMessageID,
		Description: "Make sure not using resource integrity feature is safe here.",
	}
}

func propertyAccessName(node *ast.Node) string {
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return ""
	}
	name := node.AsPropertyAccessExpression().Name()
	if name == nil {
		return ""
	}
	return name.Text()
}

func isDocumentCreateElement(node *ast.CallExpression) bool {
	callee := ast.SkipParentheses(node.Expression)
	if callee == nil || !ast.IsPropertyAccessExpression(callee) {
		return false
	}
	return propertyAccessName(callee) == "createElement" &&
		ast.IsIdentifier(callee.AsPropertyAccessExpression().Expression) &&
		callee.AsPropertyAccessExpression().Expression.AsIdentifier().Text == "document"
}

func isUnsafeSrcAssignment(node *ast.Node) bool {
	if node == nil || !ast.IsStringLiteral(node) && !ast.IsNoSubstitutionTemplateLiteral(node) {
		return false
	}
	text := node.Text()
	return strings.HasPrefix(text, "http") || strings.HasPrefix(text, "//")
}

func shouldReportScript(ctx rule.RuleContext, symbol *ast.Symbol) bool {
	if symbol == nil || ctx.SourceFile == nil || ctx.TypeChecker == nil {
		return false
	}

	srcAssignments := 0
	hasUnsafeSrcAssignment := false
	hasIntegrityAssignment := false

	var visit func(node *ast.Node)
	visit = func(node *ast.Node) {
		if node == nil {
			return
		}

		if ast.IsIdentifier(node) && ctx.TypeChecker.GetSymbolAtLocation(node) == symbol {
			memberExpression := node.Parent
			if memberExpression != nil &&
				ast.IsPropertyAccessExpression(memberExpression) &&
				memberExpression.AsPropertyAccessExpression().Expression == node {
				switch propertyAccessName(memberExpression) {
				case "src":
					parent := memberExpression.Parent
					if parent != nil &&
						ast.IsBinaryExpression(parent) &&
						ast.IsAssignmentExpression(parent, false) &&
						parent.AsBinaryExpression().Left == memberExpression {
						srcAssignments++
						hasUnsafeSrcAssignment = hasUnsafeSrcAssignment || isUnsafeSrcAssignment(parent.AsBinaryExpression().Right)
					}
				case "integrity":
					hasIntegrityAssignment = true
				}
			}
		}

		node.ForEachChild(func(child *ast.Node) bool {
			visit(child)
			return false
		})
	}

	visit(&ctx.SourceFile.Node)
	return srcAssignments == 1 && hasUnsafeSrcAssignment && !hasIntegrityAssignment
}

var DisabledResourceIntegrityRule = rule.Rule{
	Name: "disabled-resource-integrity",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindVariableDeclaration: func(node *ast.Node) {
				declaration := node.AsVariableDeclaration()
				if declaration.Initializer == nil || !ast.IsCallExpression(declaration.Initializer) {
					return
				}

				left := declaration.Name()
				if left == nil || !ast.IsIdentifier(left) {
					return
				}

				callExpression := declaration.Initializer.AsCallExpression()
				if !isDocumentCreateElement(callExpression) {
					return
				}
				if ctx.TypeChecker.TypeToString(ctx.TypeChecker.GetTypeAtLocation(left)) != "HTMLScriptElement" {
					return
				}

				symbol := ctx.TypeChecker.GetSymbolAtLocation(left)
				if shouldReportScript(ctx, symbol) {
					ctx.ReportNode(node, buildSafeResourceMessage())
				}
			},
		}
	},
}
