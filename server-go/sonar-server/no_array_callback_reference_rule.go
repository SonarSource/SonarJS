package main

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

var noArrayCallbackReferenceIgnoredNamesByMethod = map[string]map[string]struct{}{
	"every": {
		"Boolean": {},
	},
	"filter": {
		"Boolean": {},
	},
	"find": {
		"Boolean": {},
	},
	"findLast": {
		"Boolean": {},
	},
	"findIndex": {
		"Boolean": {},
	},
	"findLastIndex": {
		"Boolean": {},
	},
	"flatMap": {},
	"forEach": {},
	"map": {
		"String":  {},
		"Number":  {},
		"BigInt":  {},
		"Boolean": {},
		"Symbol":  {},
	},
	"reduce":      {},
	"reduceRight": {},
	"some": {
		"Boolean": {},
	},
}

func buildNoArrayCallbackReferenceMessage(callback *ast.Node, method string) rule.RuleMessage {
	if ast.IsIdentifier(callback) {
		return rule.RuleMessage{
			Id:          "error-with-name",
			Description: fmt.Sprintf("Do not pass function `%s` directly to `.%s(\u2026)`.", callback.AsIdentifier().Text, method),
		}
	}

	return rule.RuleMessage{
		Id:          "error-without-name",
		Description: fmt.Sprintf("Do not pass function directly to `.%s(\u2026)`.", method),
	}
}

func isCandidateArrayCallbackReference(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil && (ast.IsIdentifier(node) || utils.IsPropertyOrElementAccess(node))
}

var NoArrayCallbackReferenceRule = rule.Rule{
	Name: "no-array-callback-reference",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				methodName, _, ok := staticPropertyName(callExpr.Expression)
				if !ok {
					return
				}

				ignoredNames, ok := noArrayCallbackReferenceIgnoredNamesByMethod[methodName]
				if !ok || len(callExpr.Arguments.Nodes) == 0 {
					return
				}

				callback := ast.SkipParentheses(callExpr.Arguments.Nodes[0])
				if !isCandidateArrayCallbackReference(callback) {
					return
				}

				if ast.IsIdentifier(callback) {
					if _, ignored := ignoredNames[callback.AsIdentifier().Text]; ignored {
						return
					}
				}

				ctx.ReportNode(callback, buildNoArrayCallbackReferenceMessage(callback, methodName))
			},
		}
	},
}
