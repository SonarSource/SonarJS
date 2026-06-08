package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var noArrayForEachIgnoredObjects = map[string]struct{}{
	"Children":       {},
	"Effect":         {},
	"React.Children": {},
	"R":              {},
	"pIteration":     {},
}

func buildNoArrayForEachMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "no-array-for-each/error",
		Description: "Use `for\u2026of` instead of `.forEach(\u2026)`.",
	}
}

func accessTarget(node *ast.Node) *ast.Node {
	node = ast.SkipParentheses(node)
	switch {
	case ast.IsPropertyAccessExpression(node):
		return node.AsPropertyAccessExpression().Expression
	case ast.IsElementAccessExpression(node):
		return node.AsElementAccessExpression().Expression
	default:
		return nil
	}
}

var NoArrayForEachRule = rule.Rule{
	Name: "no-array-for-each",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				methodName, reportNode, ok := staticPropertyName(callExpr.Expression)
				if !ok || methodName != "forEach" || len(callExpr.Arguments.Nodes) == 0 {
					return
				}

				target := ast.SkipParentheses(accessTarget(callExpr.Expression))
				if target == nil {
					return
				}
				if _, ignored := noArrayForEachIgnoredObjects[sourceTextOfNode(ctx.SourceFile, target)]; ignored {
					return
				}

				ctx.ReportNode(reportNode, buildNoArrayForEachMessage())
			},
		}
	},
}
