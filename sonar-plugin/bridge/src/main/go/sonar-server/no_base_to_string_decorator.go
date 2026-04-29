package main

import (
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

var NoBaseToStringDecorator = RuleDecorator{
	FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
		if ctx.TypeChecker == nil || node == nil {
			return true
		}
		return !utils.IsTypeParameter(ctx.TypeChecker.GetTypeAtLocation(node))
	},
}
