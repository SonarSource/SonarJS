package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const s131MissingDefaultDescription = `Add a "default" clause to this "switch" statement.`
const switchMissingDefaultDescription = "Switch is not exhaustive. Cases not matched: default"

var SwitchExhaustivenessCheckDecorator = RuleDecorator{
	TransformNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) rule.RuleDiagnostic {
		if ctx.SourceFile != nil {
			if switchStatement := firstEnclosingSwitchStatement(node); switchStatement != nil {
				diagnostic.Range = scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, switchStatement.Pos())
			}
		}

		if diagnostic.Message.Id == "switchIsNotExhaustive" && diagnostic.Message.Description == switchMissingDefaultDescription {
			diagnostic.Message = rule.RuleMessage{
				Id:          "switchDefault",
				Description: s131MissingDefaultDescription,
			}
		}

		return diagnostic
	},
}

func firstEnclosingSwitchStatement(node *ast.Node) *ast.Node {
	for current := node; current != nil; current = current.Parent {
		if ast.IsSwitchStatement(current) {
			return current
		}
	}
	return nil
}
