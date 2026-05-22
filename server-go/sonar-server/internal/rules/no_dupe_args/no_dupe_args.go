package no_dupe_args

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildUnexpectedMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpected",
		Description: fmt.Sprintf("Duplicate param '%s'.", name),
	}
}

func parameterListRange(sourceFile *ast.SourceFile, node *ast.Node) core.TextRange {
	params := node.ParameterList()
	if params == nil {
		return node.Loc
	}

	start := params.Pos()
	if start > 0 {
		start--
	}

	end := params.End()
	closingParen := scanner.GetRangeOfTokenAtPosition(sourceFile, end)
	if closingParen.Pos() == end {
		end = closingParen.End()
	}

	return core.NewTextRange(start, end)
}

func collectBindingNames(node *ast.Node, names *[]string) {
	if node == nil || node.Loc.Len() == 0 {
		return
	}

	switch {
	case ast.IsIdentifier(node):
		name := node.AsIdentifier().Text
		if name != "this" {
			*names = append(*names, name)
		}
	case ast.IsBindingPattern(node):
		for _, element := range node.AsBindingPattern().Elements.Nodes {
			if element == nil || !ast.IsBindingElement(element) {
				continue
			}
			collectBindingNames(element.AsBindingElement().Name(), names)
		}
	}
}

func checkParams(ctx rule.RuleContext, node *ast.Node) {
	counts := map[string]int{}
	order := []string{}

	for _, parameterNode := range node.Parameters() {
		names := []string{}
		collectBindingNames(parameterNode.Name(), &names)

		for _, name := range names {
			if counts[name] == 0 {
				order = append(order, name)
			}
			counts[name]++
		}
	}

	if len(order) == 0 {
		return
	}

	loc := parameterListRange(ctx.SourceFile, node)
	for _, name := range order {
		if counts[name] >= 2 {
			ctx.ReportRange(loc, buildUnexpectedMessage(name))
		}
	}
}

var NoDupeArgsRule = rule.Rule{
	Name: "no-dupe-args",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindFunctionDeclaration: func(node *ast.Node) {
				checkParams(ctx, node)
			},
			ast.KindFunctionExpression: func(node *ast.Node) {
				checkParams(ctx, node)
			},
			ast.KindMethodDeclaration: func(node *ast.Node) {
				checkParams(ctx, node)
			},
			ast.KindConstructor: func(node *ast.Node) {
				checkParams(ctx, node)
			},
			ast.KindGetAccessor: func(node *ast.Node) {
				checkParams(ctx, node)
			},
			ast.KindSetAccessor: func(node *ast.Node) {
				checkParams(ctx, node)
			},
		}
	},
}
