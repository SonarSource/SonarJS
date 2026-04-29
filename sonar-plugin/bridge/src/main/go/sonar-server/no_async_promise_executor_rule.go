package main

import (
	"strings"

	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

func buildNoAsyncPromiseExecutorMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "noAsyncPromiseExecutor",
		Description: "Promise executor functions should not be async.",
	}
}

var NoAsyncPromiseExecutorRule = rule.Rule{
	Name: "no-async-promise-executor",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if !isJavaScriptLikeFile(ctx.SourceFile.FileName()) {
			return nil
		}

		return rule.RuleListeners{
			ast.KindNewExpression: func(node *ast.Node) {
				newExpression := node.AsNewExpression()
				if !isPromiseConstructor(newExpression.Expression) || newExpression.Arguments == nil || len(newExpression.Arguments.Nodes) == 0 {
					return
				}

				executor := ast.SkipParentheses(newExpression.Arguments.Nodes[0])
				if !ast.IsFunctionLike(executor) || !utils.IncludesModifier(executor, ast.KindAsyncKeyword) {
					return
				}

				if asyncModifier := utils.FindModifier(executor, ast.KindAsyncKeyword); asyncModifier != nil {
					ctx.ReportRange(asyncModifier.Loc, buildNoAsyncPromiseExecutorMessage())
				} else {
					ctx.ReportNode(executor, buildNoAsyncPromiseExecutorMessage())
				}
			},
		}
	},
}

func isJavaScriptLikeFile(fileName string) bool {
	lowerFileName := strings.ToLower(fileName)
	return strings.HasSuffix(lowerFileName, ".js") ||
		strings.HasSuffix(lowerFileName, ".jsx") ||
		strings.HasSuffix(lowerFileName, ".cjs") ||
		strings.HasSuffix(lowerFileName, ".mjs")
}

func isPromiseConstructor(node *ast.Node) bool {
	return ast.IsIdentifier(node) && node.Text() == "Promise"
}
