package main

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var preferSingleCallBuiltinIgnoredCallees = map[string]struct{}{
	"process.stderr.push": {},
	"process.stdin.push":  {},
	"process.stdout.push": {},
	"stream.push":         {},
	"this.push":           {},
	"this.stream.push":    {},
}

type preferSingleCallOptions struct {
	ignore map[string]struct{}
}

func parsePreferSingleCallOptions(options any) preferSingleCallOptions {
	result := preferSingleCallOptions{ignore: map[string]struct{}{}}

	optionMap, ok := options.(map[string]any)
	if !ok {
		return result
	}

	items, ok := optionMap["ignore"].([]any)
	if !ok {
		return result
	}

	for _, item := range items {
		if text, ok := item.(string); ok {
			result.ignore[text] = struct{}{}
		}
	}

	return result
}

func buildPreferSingleCallMessage(description string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "error/array-push",
		Description: fmt.Sprintf("Do not call `%s` multiple times.", description),
	}
}

func preferSingleCallMatch(callExpr *ast.CallExpression, sourceFile *ast.SourceFile, opts preferSingleCallOptions) (string, *ast.Node, bool) {
	expression := ast.SkipParentheses(callExpr.Expression)
	if expression == nil {
		return "", nil, false
	}

	if ast.IsIdentifier(expression) && expression.AsIdentifier().Text == "importScripts" {
		if _, ignored := opts.ignore["importScripts"]; ignored {
			return "", nil, false
		}
		return "importScripts()", expression, true
	}

	propertyName, reportNode, ok := staticPropertyName(expression)
	if !ok {
		return "", nil, false
	}

	calleeText := sourceTextOfNode(sourceFile, expression)
	if _, ignored := opts.ignore[calleeText]; ignored {
		return "", nil, false
	}

	switch propertyName {
	case "push":
		if _, ignored := preferSingleCallBuiltinIgnoredCallees[calleeText]; ignored {
			return "", nil, false
		}
		return "Array#push()", reportNode, true
	case "add", "remove":
		target := ast.SkipParentheses(accessTarget(expression))
		if target == nil {
			return "", nil, false
		}
		targetName, _, ok := staticPropertyName(target)
		if !ok || targetName != "classList" {
			return "", nil, false
		}
		if propertyName == "add" {
			return "Element#classList.add()", reportNode, true
		}
		return "Element#classList.remove()", reportNode, true
	default:
		return "", nil, false
	}
}

var PreferSingleCallRule = rule.Rule{
	Name: "prefer-single-call",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		opts := parsePreferSingleCallOptions(options)

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				secondCall := node.AsCallExpression()
				secondDescription, reportNode, ok := preferSingleCallMatch(secondCall, ctx.SourceFile, opts)
				if !ok || !ast.IsExpressionStatement(node.Parent) {
					return
				}

				firstStatement := previousStatement(node.Parent)
				firstCall := expressionStatementCall(firstStatement)
				if firstCall == nil {
					return
				}

				firstDescription, _, ok := preferSingleCallMatch(firstCall, ctx.SourceFile, opts)
				if !ok || firstDescription != secondDescription {
					return
				}
				if sourceTextOfNode(ctx.SourceFile, firstCall.Expression) != sourceTextOfNode(ctx.SourceFile, secondCall.Expression) {
					return
				}

				ctx.ReportNode(reportNode, buildPreferSingleCallMessage(secondDescription))
			},
		}
	},
}
