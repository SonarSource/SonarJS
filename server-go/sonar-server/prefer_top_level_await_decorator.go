package main

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var preferTopLevelAwaitAllowedImports = map[string]struct{}{
	"zod": {},
}

var PreferTopLevelAwaitDecorator = RuleDecorator{
	FilterDiagnostic: func(ctx rule.RuleContext, diagnostic rule.RuleDiagnostic) bool {
		return ctx.SourceFile == nil || ast.IsExternalModule(ctx.SourceFile)
	},
	FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
		if diagnostic.Message.Id != "promise" || node == nil {
			return true
		}

		parent := node.Parent
		if !isReportedPropertyAccessName(parent, node) {
			return true
		}

		methodName := node.AsIdentifier().Text
		receiver := ast.SkipParentheses(parent.Expression())
		if receiver == nil {
			return true
		}

		if ctx.TypeChecker != nil {
			t := ctx.TypeChecker.GetTypeAtLocation(receiver)
			if utils.IsTypeAnyType(t) {
				return true
			}

			isThenableType := utils.IsThenableType(ctx.TypeChecker, receiver, t)
			supportsReportedMethod := methodName == "then" || promiseLikeTypeHasMethod(ctx.TypeChecker, receiver, methodName)
			return isThenableType && supportsReportedMethod
		}

		root := promiseChainRoot(receiver)
		if !ast.IsIdentifier(root) {
			return true
		}

		return !isImportedFromAllowedSource(ctx.SourceFile, root.AsIdentifier().Text)
	},
}

func promiseLikeTypeHasMethod(typeChecker *checker.Checker, node *ast.Node, methodName string) bool {
	if node == nil {
		return false
	}

	t := typeChecker.GetTypeAtLocation(node)
	property := checker.Checker_getPropertyOfType(typeChecker, t, methodName)
	if property == nil {
		return false
	}
	if property.Flags&ast.SymbolFlagsMethod != 0 {
		return true
	}
	if property.Flags&ast.SymbolFlagsProperty == 0 {
		return false
	}

	propertyType := typeChecker.GetTypeOfSymbolAtLocation(property, node)
	return len(utils.GetCallSignatures(typeChecker, propertyType)) > 0
}

func promiseChainRoot(node *ast.Node) *ast.Node {
	current := ast.SkipParentheses(node)
	for current != nil {
		switch {
		case ast.IsCallExpression(current) && ast.IsAccessExpression(current.AsCallExpression().Expression):
			current = ast.SkipParentheses(current.AsCallExpression().Expression.Expression())
		case ast.IsAccessExpression(current):
			current = ast.SkipParentheses(current.Expression())
		default:
			return current
		}
	}

	return nil
}

func isImportedFromAllowedSource(sourceFile *ast.SourceFile, identifier string) bool {
	if sourceFile == nil || !ast.IsExternalModule(sourceFile) {
		return false
	}

	for _, statement := range sourceFile.Statements.Nodes {
		if !ast.IsImportDeclaration(statement) {
			continue
		}

		importDecl := statement.AsImportDeclaration()
		moduleSpecifier := importDecl.ModuleSpecifier.AsNode()
		if moduleSpecifier == nil || !(ast.IsStringLiteral(moduleSpecifier) || moduleSpecifier.Kind == ast.KindNoSubstitutionTemplateLiteral) {
			continue
		}
		if _, ok := preferTopLevelAwaitAllowedImports[moduleSpecifier.Text()]; !ok {
			continue
		}

		if importClauseIntroducesName(importDecl.ImportClause, identifier) {
			return true
		}
	}

	return false
}

func importClauseIntroducesName(importClause *ast.ImportClauseNode, identifier string) bool {
	if importClause == nil {
		return false
	}

	clause := importClause.AsImportClause()
	if name := clause.Name(); name != nil && name.Text() == identifier {
		return true
	}

	if clause.NamedBindings == nil {
		return false
	}

	bindings := clause.NamedBindings.AsNode()
	switch {
	case ast.IsNamespaceImport(bindings):
		name := bindings.AsNamespaceImport().Name()
		return name != nil && name.Text() == identifier
	case ast.IsNamedImports(bindings):
		for _, element := range bindings.AsNamedImports().Elements.Nodes {
			if name := element.Name(); name != nil && name.Text() == identifier {
				return true
			}
		}
	}

	return false
}
