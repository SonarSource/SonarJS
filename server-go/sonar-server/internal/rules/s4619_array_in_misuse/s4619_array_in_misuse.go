package s4619_array_in_misuse

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildInMisuseMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "inMisuse",
		Description: "Use \"indexOf\" or \"includes\" (available from ES2016) instead.",
	}
}

func buildSuggestIndexOfMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "suggestIndexOf",
		Description: "Replace with \"indexOf\" method",
	}
}

func buildSuggestIncludesMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "suggestIncludes",
		Description: "Replace with \"includes\" method",
	}
}

func isArray(typeChecker *checker.Checker, node *ast.Node) bool {
	if node == nil {
		return false
	}

	t := typeChecker.GetTypeAtLocation(ast.SkipParentheses(node))
	symbol := checker.Type_symbol(t)
	return symbol != nil && symbol.Name == "Array"
}

func isNumber(typeChecker *checker.Checker, node *ast.Node) bool {
	if node == nil {
		return false
	}

	t := typeChecker.GetTypeAtLocation(ast.SkipParentheses(node))
	return utils.IsTypeFlagSet(t, checker.TypeFlagsNumberLike)
}

func isPrototypeProperty(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if !ast.IsStringLiteral(node) {
		return false
	}

	switch node.Text() {
	case "indexOf", "lastIndexOf", "forEach", "map", "filter", "every", "some":
		return true
	default:
		return false
	}
}

func nodeText(sourceFile *ast.SourceFile, node *ast.Node) string {
	return scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, node, false /* includeTrivia */)
}

var NoInMisuseRule = rule.Rule{
	Name: "no-in-misuse",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()
				if expr.OperatorToken.Kind != ast.KindInKeyword {
					return
				}

				left := ast.SkipParentheses(expr.Left)
				right := ast.SkipParentheses(expr.Right)

				if !isArray(ctx.TypeChecker, right) || isPrototypeProperty(left) || isNumber(ctx.TypeChecker, left) {
					return
				}

				leftText := nodeText(ctx.SourceFile, expr.Left)
				rightText := nodeText(ctx.SourceFile, expr.Right)

				ctx.ReportNodeWithSuggestions(node, buildInMisuseMessage(), func() []rule.RuleSuggestion {
					return []rule.RuleSuggestion{
						{
							Message: buildSuggestIndexOfMessage(),
							FixesArr: []rule.RuleFix{
								rule.RuleFixReplace(ctx.SourceFile, node, rightText+".indexOf("+leftText+") > -1"),
							},
						},
						{
							Message: buildSuggestIncludesMessage(),
							FixesArr: []rule.RuleFix{
								rule.RuleFixReplace(ctx.SourceFile, node, rightText+".includes("+leftText+")"),
							},
						},
					}
				})
			},
		}
	},
}
