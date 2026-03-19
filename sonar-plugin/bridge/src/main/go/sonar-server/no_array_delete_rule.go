package main

import (
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
	"github.com/typescript-eslint/tsgolint/internal/rule"
)

func buildRemoveDeleteMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "removeDelete",
		Description: "Remove this use of \"delete\".",
	}
}

// S2870 custom implementation:
// report `delete arr[index]` when `arr` resolves to Array.
var NoArrayDeleteRule = rule.Rule{
	Name: "no-array-delete",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindDeleteExpression: func(node *ast.Node) {
				deleteExpression := ast.SkipParentheses(node.AsDeleteExpression().Expression)
				if !ast.IsElementAccessExpression(deleteExpression) {
					return
				}

				arrayExpression := deleteExpression.AsElementAccessExpression().Expression
				arrayType := ctx.TypeChecker.GetTypeAtLocation(arrayExpression)
				symbol := checker.Type_symbol(arrayType)
				if symbol == nil || symbol.Name != "Array" {
					return
				}

				deleteTokenRange := scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, node.Pos())
				ctx.ReportRange(deleteTokenRange, buildRemoveDeleteMessage())
			},
		}
	},
}
