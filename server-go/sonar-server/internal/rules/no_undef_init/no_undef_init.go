package no_undef_init

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildUnnecessaryUndefinedInitMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unnecessaryUndefinedInit",
		Description: fmt.Sprintf("It's not necessary to initialize '%s' to undefined.", name),
	}
}

func isConstantBinding(node *ast.Node) bool {
	return ast.IsVariableDeclarationList(node) && node.Flags&ast.NodeFlagsConstant != 0
}

func isGlobalUndefinedIdentifier(ctx rule.RuleContext, node *ast.Node) bool {
	return ast.IsIdentifier(node) &&
		node.AsIdentifier().Text == "undefined" &&
		rule.ResolvesToGlobalValue(ctx, node, "undefined")
}

var NoUndefInitRule = rule.Rule{
	Name: "no-undef-init",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindVariableDeclaration: func(node *ast.Node) {
				declaration := node.AsVariableDeclaration()
				if declaration.Initializer == nil || isConstantBinding(node.Parent) {
					return
				}

				init := ast.SkipParentheses(declaration.Initializer)
				if !isGlobalUndefinedIdentifier(ctx, init) {
					return
				}

				ctx.ReportNode(
					node,
					buildUnnecessaryUndefinedInitMessage(
						scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, declaration.Name(), false),
					),
				)
			},
		}
	},
}
