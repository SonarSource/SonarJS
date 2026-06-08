package no_case_declarations

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildUnexpectedLexicalDeclarationMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpected",
		Description: "Unexpected lexical declaration in case block.",
	}
}

func isLexicalDeclaration(node *ast.Node) bool {
	switch {
	case ast.IsFunctionDeclaration(node), ast.IsClassDeclaration(node):
		return true
	case ast.IsVariableStatement(node):
		return node.AsVariableStatement().DeclarationList.Flags&ast.NodeFlagsBlockScoped != 0
	default:
		return false
	}
}

func reportLexicalDeclarationsInClause(ctx rule.RuleContext, clause *ast.Node) {
	statements := clause.AsCaseOrDefaultClause().Statements
	if statements == nil {
		return
	}

	for _, statement := range statements.Nodes {
		if isLexicalDeclaration(statement) {
			ctx.ReportNode(statement, buildUnexpectedLexicalDeclarationMessage())
		}
	}
}

var NoCaseDeclarationsRule = rule.Rule{
	Name: "no-case-declarations",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCaseClause: func(node *ast.Node) {
				reportLexicalDeclarationsInClause(ctx, node)
			},
			ast.KindDefaultClause: func(node *ast.Node) {
				reportLexicalDeclarationsInClause(ctx, node)
			},
		}
	},
}
