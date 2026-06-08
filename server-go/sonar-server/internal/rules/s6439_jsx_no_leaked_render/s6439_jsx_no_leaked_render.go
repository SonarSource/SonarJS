package s6439_jsx_no_leaked_render

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexutil"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	shimscanner "github.com/microsoft/typescript-go/shim/scanner"
)

func buildNonBooleanMightRenderMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "nonBooleanMightRender",
		Description: "Convert the conditional to a boolean to avoid leaked value",
	}
}

func buildSuggestConversionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "suggestConversion",
		Description: "Convert the conditional to a boolean",
	}
}

func isReactNativeImport(node *ast.Node) bool {
	if !ast.IsImportDeclaration(node) {
		return false
	}
	moduleSpecifier := node.AsImportDeclaration().ModuleSpecifier
	return moduleSpecifier != nil &&
		(ast.IsStringLiteral(moduleSpecifier) || moduleSpecifier.Kind == ast.KindNoSubstitutionTemplateLiteral) &&
		moduleSpecifier.Text() == "react-native"
}

func isReactNativeRequire(node *ast.Node) bool {
	if !ast.IsCallExpression(node) {
		return false
	}
	args := node.Arguments()
	if len(args) != 1 {
		return false
	}
	callee := regexutil.UnwrapExpression(node.Expression())
	argument := regexutil.UnwrapExpression(args[0])
	return ast.IsIdentifier(callee) &&
		callee.AsIdentifier().Text == "require" &&
		argument != nil &&
		(ast.IsStringLiteral(argument) || argument.Kind == ast.KindNoSubstitutionTemplateLiteral) &&
		argument.Text() == "react-native"
}

func isLeakingType(ctx rule.RuleContext, node *ast.Node, allowStrings bool) bool {
	if ctx.TypeChecker == nil || node == nil {
		return false
	}

	t := ctx.TypeChecker.GetTypeAtLocation(node)
	if utils.IsTypeFlagSet(t, checker.TypeFlagsNumberLike|checker.TypeFlagsBigIntLike) {
		return true
	}
	return allowStrings && (utils.IsTypeFlagSet(t, checker.TypeFlagsStringLike) || utils.GetTypeName(ctx.TypeChecker, t) == "String")
}

func reportLeakedValue(ctx rule.RuleContext, node *ast.Node) {
	node = regexutil.UnwrapExpression(node)
	if node == nil {
		return
	}

	nodeText := shimscanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, node, false)
	ctx.ReportNodeWithSuggestions(node, buildNonBooleanMightRenderMessage(), func() []rule.RuleSuggestion {
		return []rule.RuleSuggestion{{
			Message: buildSuggestConversionMessage(),
			FixesArr: []rule.RuleFix{
				rule.RuleFixReplace(ctx.SourceFile, node, "!!("+nodeText+")"),
			},
		}}
	})
}

func checkNonBoolean(ctx rule.RuleContext, node *ast.Node, allowStrings bool) {
	node = regexutil.UnwrapExpression(node)
	if node == nil {
		return
	}

	if ast.IsBinaryExpression(node) && ast.IsLogicalExpression(node) {
		checkNonBoolean(ctx, node.AsBinaryExpression().Left, allowStrings)
		checkNonBoolean(ctx, node.AsBinaryExpression().Right, allowStrings)
		return
	}

	if isLeakingType(ctx, node, allowStrings) {
		reportLeakedValue(ctx, node)
	}
}

func isJsxShortCircuit(node *ast.Node) bool {
	return ast.IsBinaryExpression(node) &&
		node.AsBinaryExpression().OperatorToken.Kind == ast.KindAmpersandAmpersandToken &&
		node.Parent != nil &&
		node.Parent.Kind == ast.KindJsxExpression
}

var JSXNoLeakedRenderRule = rule.Rule{
	Name: "jsx-no-leaked-render",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		usesReactNative := false
		return rule.RuleListeners{
			ast.KindImportDeclaration: func(node *ast.Node) {
				if isReactNativeImport(node) {
					usesReactNative = true
				}
			},
			ast.KindCallExpression: func(node *ast.Node) {
				if isReactNativeRequire(node) {
					usesReactNative = true
				}
			},
			ast.KindBinaryExpression: func(node *ast.Node) {
				if !isJsxShortCircuit(node) {
					return
				}
				checkNonBoolean(ctx, node.AsBinaryExpression().Left, usesReactNative)
			},
		}
	},
}
