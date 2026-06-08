package no_sparse_arrays

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildUnexpectedSparseArrayMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpectedSparseArray",
		Description: "Unexpected comma in middle of array.",
	}
}

var NoSparseArraysRule = rule.Rule{
	Name: "no-sparse-arrays",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindArrayLiteralExpression: func(node *ast.Node) {
				for _, element := range node.AsArrayLiteralExpression().Elements.Nodes {
					if !ast.IsOmittedExpression(element) {
						continue
					}

					ctx.ReportRange(
						scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, element.Pos()),
						buildUnexpectedSparseArrayMessage(),
					)
				}
			},
		}
	},
}
