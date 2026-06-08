package no_misused_new

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildClassMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "errorMessageClass",
		Description: "Class cannot have method named `new`.",
	}
}

func buildInterfaceMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "errorMessageInterface",
		Description: "Interfaces cannot be constructed, only classes.",
	}
}

func getTypeReferenceName(node *ast.Node) string {
	if node == nil {
		return ""
	}

	switch {
	case ast.IsTypeReferenceNode(node):
		return getTypeReferenceName(node.AsTypeReferenceNode().TypeName)
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text
	default:
		return ""
	}
}

func isMatchingParentType(parent *ast.Node, returnType *ast.Node) bool {
	if parent == nil || returnType == nil {
		return false
	}
	if !ast.IsClassDeclaration(parent) && !ast.IsClassExpression(parent) && !ast.IsInterfaceDeclaration(parent) {
		return false
	}

	name := parent.Name()
	if name == nil || !ast.IsIdentifier(name) {
		return false
	}

	return getTypeReferenceName(returnType) == name.AsIdentifier().Text
}

func isNamedIdentifier(node *ast.Node, want string) bool {
	return node != nil && ast.IsIdentifier(node) && node.AsIdentifier().Text == want
}

var NoMisusedNewRule = rule.Rule{
	Name: "no-misused-new",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindMethodDeclaration: func(node *ast.Node) {
				if !isNamedIdentifier(node.Name(), "new") {
					return
				}
				if node.AsMethodDeclaration().Body != nil {
					return
				}
				if !isMatchingParentType(node.Parent, node.Type()) {
					return
				}

				ctx.ReportNode(node, buildClassMessage())
			},
			ast.KindConstructSignature: func(node *ast.Node) {
				if !ast.IsInterfaceDeclaration(node.Parent) {
					return
				}
				if !isMatchingParentType(node.Parent, node.Type()) {
					return
				}

				ctx.ReportNode(node, buildInterfaceMessage())
			},
			ast.KindMethodSignature: func(node *ast.Node) {
				if !isNamedIdentifier(node.Name(), "constructor") {
					return
				}

				ctx.ReportNode(node, buildInterfaceMessage())
			},
		}
	},
}
