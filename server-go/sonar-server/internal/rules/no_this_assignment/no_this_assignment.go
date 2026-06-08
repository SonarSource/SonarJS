package no_this_assignment

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildNoThisAssignmentMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "no-this-assignment",
		Description: fmt.Sprintf("Do not assign `this` to `%s`.", name),
	}
}

func reportNoThisAssignment(
	ctx rule.RuleContext,
	reportNode *ast.Node,
	variableNode *ast.Node,
	valueNode *ast.Node,
) {
	if !ast.IsIdentifier(variableNode) || valueNode == nil || valueNode.Kind != ast.KindThisKeyword {
		return
	}

	ctx.ReportNode(reportNode, buildNoThisAssignmentMessage(variableNode.AsIdentifier().Text))
}

var NoThisAssignmentRule = rule.Rule{
	Name: "no-this-assignment",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindVariableDeclaration: func(node *ast.Node) {
				reportNoThisAssignment(ctx, node, node.Name(), node.Initializer())
			},
			ast.KindBinaryExpression: func(node *ast.Node) {
				if !ast.IsAssignmentExpression(node, false) {
					return
				}

				binaryExpr := node.AsBinaryExpression()
				reportNoThisAssignment(
					ctx,
					node,
					ast.SkipParentheses(binaryExpr.Left),
					ast.SkipParentheses(binaryExpr.Right),
				)
			},
		}
	},
}
