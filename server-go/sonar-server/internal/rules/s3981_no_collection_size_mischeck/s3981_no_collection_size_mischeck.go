package s3981_no_collection_size_mischeck

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const (
	fixCollectionSizeCheckMessageID = "fixCollectionSizeCheck"
	suggestFixedSizeCheckMessageID  = "suggestFixedSizeCheck"
)

var (
	collectionTypeNames = map[string]struct{}{
		"Array":   {},
		"Map":     {},
		"Set":     {},
		"WeakMap": {},
		"WeakSet": {},
	}
	collectionSizeProperties = map[string]struct{}{
		"length": {},
		"size":   {},
	}
)

func buildFixCollectionSizeCheckMessage(propertyName string, objectName string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          fixCollectionSizeCheckMessageID,
		Description: "Fix this expression; " + propertyName + ` of "` + objectName + `" is always greater or equal to zero.`,
	}
}

func buildSuggestFixedSizeCheckMessage(propertyName string, operator string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          suggestFixedSizeCheckMessageID,
		Description: `Use "` + operator + `" for ` + propertyName + ` check`,
	}
}

func isZeroLiteral(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil && ast.IsNumericLiteral(node) && strings.TrimSpace(node.Text()) == "0"
}

func isCollectionObject(typeChecker *checker.Checker, node *ast.Node) bool {
	if typeChecker == nil || node == nil {
		return true
	}

	t := checker.Checker_getApparentType(typeChecker, typeChecker.GetTypeAtLocation(ast.SkipParentheses(node)))
	symbol := checker.Type_symbol(t)
	if symbol == nil {
		return false
	}

	_, ok := collectionTypeNames[symbol.Name]
	return ok
}

func fixedOperator(kind ast.Kind) string {
	if kind == ast.KindLessThanToken {
		return "=="
	}
	return ">"
}

func propertyAccessDetails(node *ast.Node) (propertyName string, object *ast.Node, ok bool) {
	if !ast.IsPropertyAccessExpression(node) {
		return "", nil, false
	}

	propertyAccess := node.AsPropertyAccessExpression()
	name := propertyAccess.Name()
	if name == nil {
		return "", nil, false
	}
	propertyName = name.Text()
	_, ok = collectionSizeProperties[propertyName]
	return propertyName, propertyAccess.Expression, ok
}

var NoCollectionSizeMischeckRule = rule.Rule{
	Name: "no-collection-size-mischeck",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()
				if expr.OperatorToken.Kind != ast.KindLessThanToken && expr.OperatorToken.Kind != ast.KindGreaterThanEqualsToken {
					return
				}
				if !isZeroLiteral(expr.Right) {
					return
				}

				propertyName, object, ok := propertyAccessDetails(expr.Left)
				if !ok || !isCollectionObject(ctx.TypeChecker, object) {
					return
				}

				objectName := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, object, false)
				message := buildFixCollectionSizeCheckMessage(propertyName, objectName)
				operator := fixedOperator(expr.OperatorToken.Kind)

				ctx.ReportNodeWithSuggestions(node, message, func() []rule.RuleSuggestion {
					return []rule.RuleSuggestion{{
						Message: buildSuggestFixedSizeCheckMessage(propertyName, operator),
						FixesArr: []rule.RuleFix{
							rule.RuleFixReplaceRange(
								scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, expr.OperatorToken.Pos()),
								operator,
							),
						},
					}}
				})
			},
		}
	},
}
