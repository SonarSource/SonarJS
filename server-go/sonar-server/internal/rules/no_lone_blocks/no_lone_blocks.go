package no_lone_blocks

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildRedundantBlockMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "redundantBlock",
		Description: "Block is redundant.",
	}
}

func buildRedundantNestedBlockMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "redundantNestedBlock",
		Description: "Nested block is redundant.",
	}
}

func buildLoneBlockMessage(node *ast.Node) rule.RuleMessage {
	if node.Parent != nil && node.Parent.Kind == ast.KindBlock {
		return buildRedundantNestedBlockMessage()
	}

	return buildRedundantBlockMessage()
}

func isLoneBlock(node *ast.Node) bool {
	if node == nil || node.Parent == nil {
		return false
	}

	switch node.Parent.Kind {
	case ast.KindBlock, ast.KindSourceFile:
		return true
	case ast.KindCaseClause, ast.KindDefaultClause:
		statements := node.Parent.Statements()
		return !(len(statements) == 1 && statements[0] == node)
	default:
		return false
	}
}

func markDirectLoneBlock(loneBlocks *[]*ast.Node, declaration *ast.Node) {
	if declaration == nil || declaration.Parent == nil || len(*loneBlocks) == 0 {
		return
	}

	last := len(*loneBlocks) - 1
	if (*loneBlocks)[last] == declaration.Parent {
		*loneBlocks = (*loneBlocks)[:last]
	}
}

var NoLoneBlocksRule = rule.Rule{
	Name: "no-lone-blocks",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		loneBlocks := []*ast.Node{}

		return rule.RuleListeners{
			ast.KindBlock: func(node *ast.Node) {
				if isLoneBlock(node) {
					loneBlocks = append(loneBlocks, node)
				}
			},
			rule.ListenerOnExit(ast.KindBlock): func(node *ast.Node) {
				if len(loneBlocks) > 0 && loneBlocks[len(loneBlocks)-1] == node {
					loneBlocks = loneBlocks[:len(loneBlocks)-1]
					ctx.ReportNode(node, buildLoneBlockMessage(node))
					return
				}

				if node.Parent != nil && node.Parent.Kind == ast.KindBlock && len(node.Parent.Statements()) == 1 {
					ctx.ReportNode(node, buildLoneBlockMessage(node))
				}
			},
			ast.KindVariableStatement: func(node *ast.Node) {
				if node.AsVariableStatement().DeclarationList.Flags&ast.NodeFlagsBlockScoped != 0 {
					markDirectLoneBlock(&loneBlocks, node)
				}
			},
			ast.KindFunctionDeclaration: func(node *ast.Node) {
				markDirectLoneBlock(&loneBlocks, node)
			},
			ast.KindClassDeclaration: func(node *ast.Node) {
				markDirectLoneBlock(&loneBlocks, node)
			},
		}
	},
}
