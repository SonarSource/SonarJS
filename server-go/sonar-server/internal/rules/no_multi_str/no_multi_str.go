package no_multi_str

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildMultilineStringMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "multilineString",
		Description: "Multiline support is limited to browsers supporting ES5 only.",
	}
}

func isJSXNode(node *ast.Node) bool {
	if node == nil {
		return false
	}

	switch node.Kind {
	case ast.KindJsxAttribute,
		ast.KindJsxAttributes,
		ast.KindJsxClosingElement,
		ast.KindJsxClosingFragment,
		ast.KindJsxElement,
		ast.KindJsxExpression,
		ast.KindJsxFragment,
		ast.KindJsxNamespacedName,
		ast.KindJsxOpeningElement,
		ast.KindJsxOpeningFragment,
		ast.KindJsxSelfClosingElement,
		ast.KindJsxSpreadAttribute:
		return true
	default:
		return false
	}
}

func hasLineBreak(sourceFile *ast.SourceFile, node *ast.Node) bool {
	raw := scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, node, false)
	return strings.ContainsAny(raw, "\n\r\u2028\u2029")
}

var NoMultiStrRule = rule.Rule{
	Name: "no-multi-str",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindStringLiteral: func(node *ast.Node) {
				if hasLineBreak(ctx.SourceFile, node) && !isJSXNode(node.Parent) {
					ctx.ReportNode(node, buildMultilineStringMessage())
				}
			},
		}
	},
}
