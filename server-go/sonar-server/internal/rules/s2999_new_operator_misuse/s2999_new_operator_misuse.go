package s2999_new_operator_misuse

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const constructorFunctionMessageID = "constructorFunction"

type newOperatorMisuseOptions struct {
	considerJSDoc bool
}

func buildConstructorFunctionMessage(text string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          constructorFunctionMessageID,
		Description: "Replace " + text + " with a constructor function.",
	}
}

func parseNewOperatorMisuseOptions(options any) newOperatorMisuseOptions {
	result := newOperatorMisuseOptions{}

	switch value := options.(type) {
	case []any:
		if len(value) > 0 {
			return parseNewOperatorMisuseOptions(value[0])
		}
	case map[string]any:
		if considerJSDoc, ok := value["considerJSDoc"].(bool); ok {
			result.considerJSDoc = considerJSDoc
		}
	}

	return result
}

func isClassType(t *checker.Type) bool {
	symbol := checker.Type_symbol(t)
	return symbol != nil && symbol.Flags&ast.SymbolFlagsClass != 0
}

func isFunctionType(t *checker.Type) bool {
	symbol := checker.Type_symbol(t)
	return symbol != nil && symbol.Flags&ast.SymbolFlagsFunction != 0
}

func isModuleType(t *checker.Type) bool {
	symbol := checker.Type_symbol(t)
	return symbol != nil && symbol.Flags&ast.SymbolFlagsModule != 0
}

func referencedDeclaration(ctx rule.RuleContext, callee *ast.Node, t *checker.Type) *ast.Node {
	callee = ast.SkipParentheses(callee)
	if callee == nil {
		return nil
	}

	if ast.IsIdentifier(callee) {
		if symbol := ctx.TypeChecker.GetSymbolAtLocation(callee); symbol != nil {
			if symbol.ValueDeclaration != nil {
				return symbol.ValueDeclaration
			}
			if len(symbol.Declarations) > 0 {
				return symbol.Declarations[0]
			}
		}
	}

	if symbol := checker.Type_symbol(t); symbol != nil {
		if symbol.ValueDeclaration != nil {
			return symbol.ValueDeclaration
		}
		if len(symbol.Declarations) > 0 {
			return symbol.Declarations[0]
		}
	}

	return callee
}

func hasConstructorLikeJSDoc(node *ast.Node) bool {
	if node == nil {
		return false
	}

	for _, jsdoc := range node.JSDoc(nil) {
		tags := jsdoc.AsJSDoc().Tags
		if tags == nil {
			continue
		}

		for _, tag := range tags.Nodes {
			name := tag.TagName()
			if name == nil {
				continue
			}

			switch name.Text() {
			case "class", "constructor":
				return true
			}
		}
	}

	return false
}

func isInstantiable(ctx rule.RuleContext, callee *ast.Node, t *checker.Type, considerJSDoc bool) bool {
	if t == nil {
		return false
	}

	if utils.IsUnionType(t) || utils.IsIntersectionType(t) {
		for _, part := range t.Types() {
			if isInstantiable(ctx, callee, part, considerJSDoc) {
				return true
			}
		}
		return false
	}

	if isClassType(t) || isModuleType(t) {
		return true
	}

	if isFunctionType(t) {
		if !considerJSDoc {
			return true
		}
		return hasConstructorLikeJSDoc(referencedDeclaration(ctx, callee, t))
	}

	return len(utils.GetConstructSignatures(ctx.TypeChecker, t)) > 0
}

func reportNewOperatorMisuse(ctx rule.RuleContext, newExpr *ast.Node, callee *ast.Node) {
	callee = ast.SkipParentheses(callee)
	if newExpr == nil || callee == nil {
		return
	}

	reportRange := utils.TrimNodeTextRange(ctx.SourceFile, callee)
	reportText := ctx.SourceFile.Text()[reportRange.Pos():reportRange.End()]
	if ast.IsFunctionExpression(callee) {
		reportRange = scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, callee.Pos())
		reportText = "this function"
	}

	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:   reportRange,
		Message: buildConstructorFunctionMessage(reportText),
		LabeledRanges: []rule.RuleLabeledRange{{
			Range: scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, newExpr.Pos()),
		}},
	})
}

var NewOperatorMisuseRule = rule.Rule{
	Name: "new-operator-misuse",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		opts := parseNewOperatorMisuseOptions(options)

		return rule.RuleListeners{
			ast.KindNewExpression: func(node *ast.Node) {
				newExpr := node.AsNewExpression()
				callee := ast.SkipParentheses(newExpr.Expression)
				if callee == nil || callee.Kind == ast.KindThisKeyword {
					return
				}

				t := ctx.TypeChecker.GetTypeAtLocation(callee)
				if utils.IsTypeAnyType(t) || isInstantiable(ctx, callee, t, opts.considerJSDoc) {
					return
				}

				reportNewOperatorMisuse(ctx, node, callee)
			},
		}
	},
}
