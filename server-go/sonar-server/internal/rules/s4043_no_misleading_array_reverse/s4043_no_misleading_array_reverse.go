package s4043_no_misleading_array_reverse

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const (
	moveMethodMessageID    = "moveMethod"
	suggestMethodMessageID = "suggestMethod"
)

var arrayMutatingMethods = map[string]struct{}{
	"reverse":   {},
	"'reverse'": {},
	`"reverse"`: {},
	"sort":      {},
	"'sort'":    {},
	`"sort"`:    {},
}

func buildMoveMethodMessage(method string, suggestedMethod string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          moveMethodMessageID,
		Description: `Move this array "` + method + `" operation to a separate statement or replace it with "` + suggestedMethod + `".`,
	}
}

func buildSuggestMethodMessage(suggestedMethod string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          suggestMethodMessageID,
		Description: `Replace with "` + suggestedMethod + `" method`,
	}
}

func arrayMutatingPropertyText(sourceFile *ast.SourceFile, node *ast.Node) (string, *ast.Node, bool) {
	switch {
	case ast.IsPropertyAccessExpression(node):
		property := node.AsPropertyAccessExpression().Name().AsNode()
		return scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, property, false), property, true
	case ast.IsElementAccessExpression(node):
		property := ast.SkipParentheses(node.AsElementAccessExpression().ArgumentExpression)
		if ast.IsStringLiteral(property) || property.Kind == ast.KindNoSubstitutionTemplateLiteral {
			return scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, property, false), property, true
		}
	}
	return "", nil, false
}

func formatMethod(propertyText string) string {
	return strings.Trim(propertyText, `"'`)
}

func isArrayExpression(typeChecker *checker.Checker, node *ast.Node) bool {
	if typeChecker == nil || node == nil {
		return false
	}

	t := checker.Checker_getApparentType(typeChecker, typeChecker.GetTypeAtLocation(ast.SkipParentheses(node)))
	return checker.Checker_isArrayOrTupleType(typeChecker, t)
}

func isGetAccessorProperty(typeChecker *checker.Checker, node *ast.Node) bool {
	if typeChecker == nil || node == nil {
		return false
	}

	symbol := typeChecker.GetSymbolAtLocation(node)
	if symbol == nil || len(symbol.Declarations) != 1 {
		return false
	}

	return symbol.Declarations[0].Kind == ast.KindGetAccessor
}

func isIdentifierOrPropertyAccessExpression(typeChecker *checker.Checker, node *ast.Node) bool {
	switch {
	case node == nil:
		return false
	case ast.IsIdentifier(node):
		return true
	case ast.IsPropertyAccessExpression(node):
		return !isGetAccessorProperty(typeChecker, node.AsPropertyAccessExpression().Name().AsNode())
	case ast.IsElementAccessExpression(node):
		property := ast.SkipParentheses(node.AsElementAccessExpression().ArgumentExpression)
		return !isGetAccessorProperty(typeChecker, property)
	default:
		return false
	}
}

func isSelfAssignment(mutatedArray *ast.Node, callNode *ast.Node) bool {
	parent := callNode.Parent
	return parent != nil &&
		ast.IsBinaryExpression(parent) &&
		ast.IsAssignmentExpression(parent, true) &&
		parent.AsBinaryExpression().OperatorToken.Kind == ast.KindEqualsToken &&
		ast.IsIdentifier(parent.AsBinaryExpression().Left) &&
		ast.IsIdentifier(mutatedArray) &&
		parent.AsBinaryExpression().Left.AsIdentifier().Text == mutatedArray.AsIdentifier().Text
}

func isLogicalLikeExpression(node *ast.Node) bool {
	return ast.IsBinaryExpression(node) && (node.AsBinaryExpression().OperatorToken.Kind == ast.KindAmpersandAmpersandToken ||
		node.AsBinaryExpression().OperatorToken.Kind == ast.KindBarBarToken ||
		node.AsBinaryExpression().OperatorToken.Kind == ast.KindQuestionQuestionToken)
}

func isStandaloneExpression(callNode *ast.Node) bool {
	for current := callNode.Parent; current != nil; current = current.Parent {
		switch {
		case ast.IsExpressionStatement(current):
			return true
		case isLogicalLikeExpression(current):
			continue
		case ast.IsParenthesizedExpression(current):
			continue
		default:
			return false
		}
	}
	return false
}

func isAllowedReturnedExpression(callNode *ast.Node) bool {
	for current := callNode.Parent; current != nil; current = current.Parent {
		switch {
		case ast.IsReturnStatement(current):
			return true
		case ast.IsArrayLiteralExpression(current), ast.IsObjectLiteralExpression(current), ast.IsConditionalExpression(current), ast.IsSpreadElement(current), ast.IsParenthesizedExpression(current):
			continue
		default:
			return false
		}
	}
	return false
}

func sortSuggestion(method string) string {
	if method == "sort" {
		return "toSorted"
	}
	return "toReversed"
}

func accessExpressionObject(node *ast.Node) *ast.Node {
	switch {
	case ast.IsPropertyAccessExpression(node):
		return node.AsPropertyAccessExpression().Expression
	case ast.IsElementAccessExpression(node):
		return node.AsElementAccessExpression().Expression
	default:
		return nil
	}
}

var NoMisleadingArrayReverseRule = rule.Rule{
	Name: "no-misleading-array-reverse",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				propertyText, propertyNode, ok := arrayMutatingPropertyText(ctx.SourceFile, callExpr.Expression)
				if !ok {
					return
				}
				if _, ok := arrayMutatingMethods[propertyText]; !ok {
					return
				}
				if callExpr.QuestionDotToken != nil {
					// Optional call expressions are still subject to the rule. Keep going.
				}

				mutatedArray := accessExpressionObject(callExpr.Expression)
				if !isArrayExpression(ctx.TypeChecker, mutatedArray) {
					return
				}
				if !isIdentifierOrPropertyAccessExpression(ctx.TypeChecker, mutatedArray) {
					return
				}
				if isSelfAssignment(mutatedArray, node) {
					return
				}
				if isStandaloneExpression(node) || isAllowedReturnedExpression(node) {
					return
				}

				method := formatMethod(propertyText)
				suggestedMethod := sortSuggestion(method)
				ctx.ReportNodeWithSuggestions(node, buildMoveMethodMessage(method, suggestedMethod), func() []rule.RuleSuggestion {
					replacement := strings.Replace(propertyText, method, suggestedMethod, 1)
					return []rule.RuleSuggestion{{
						Message: buildSuggestMethodMessage(suggestedMethod),
						FixesArr: []rule.RuleFix{
							rule.RuleFixReplaceRange(utils.TrimNodeTextRange(ctx.SourceFile, propertyNode), replacement),
						},
					}}
				})
			},
		}
	},
}
