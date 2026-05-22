package no_octal

import (
	"regexp"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var legacyOctalLiteralPattern = regexp.MustCompile(`^0\d`)

func buildNoOctalMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "noOctal",
		Description: "Octal literals should not be used.",
	}
}

func isLegacyOctalLiteral(sourceFile *ast.SourceFile, node *ast.Node) bool {
	raw := scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, node, false)
	return legacyOctalLiteralPattern.MatchString(raw)
}

var NoOctalRule = rule.Rule{
	Name: "no-octal",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindNumericLiteral: func(node *ast.Node) {
				if isLegacyOctalLiteral(ctx.SourceFile, node) {
					ctx.ReportNode(node, buildNoOctalMessage())
				}
			},
		}
	},
}
