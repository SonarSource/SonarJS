package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

var NoBaseToStringDecorator = RuleDecorator{
	FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
		if ctx.TypeChecker == nil || node == nil {
			return true
		}
		return !utils.IsTypeParameter(ctx.TypeChecker.GetTypeAtLocation(node))
	},
}
