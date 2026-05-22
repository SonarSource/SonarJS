package prefer_as_const

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildPreferConstAssertionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "preferConstAssertion",
		Description: "Expected a `const` instead of a literal type assertion.",
	}
}

func buildVariableConstAssertionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "variableConstAssertion",
		Description: "Expected a `const` assertion instead of a literal type annotation.",
	}
}

func comparableLiteralRaw(sourceFile *ast.SourceFile, node *ast.Node) (string, bool) {
	switch node.Kind {
	case ast.KindStringLiteral,
		ast.KindNumericLiteral,
		ast.KindBigIntLiteral,
		ast.KindTrueKeyword,
		ast.KindFalseKeyword,
		ast.KindNullKeyword:
		return scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, node, false), true
	default:
		return "", false
	}
}

func matchesLiteralTypeAssertion(sourceFile *ast.SourceFile, valueNode *ast.Node, typeNode *ast.Node) bool {
	if valueNode == nil || typeNode == nil || !ast.IsLiteralTypeNode(typeNode) {
		return false
	}

	valueRaw, ok := comparableLiteralRaw(sourceFile, ast.SkipParentheses(valueNode))
	if !ok {
		return false
	}

	typeLiteral := typeNode.AsLiteralTypeNode().Literal
	if typeLiteral == nil {
		return false
	}

	typeRaw, ok := comparableLiteralRaw(sourceFile, typeLiteral)
	return ok && valueRaw == typeRaw
}

var PreferAsConstRule = rule.Rule{
	Name: "prefer-as-const",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		reportVariableAnnotation := func(typeNode *ast.Node, valueNode *ast.Node) {
			if matchesLiteralTypeAssertion(ctx.SourceFile, valueNode, typeNode) {
				ctx.ReportNode(typeNode, buildVariableConstAssertionMessage())
			}
		}

		reportAssertion := func(typeNode *ast.Node, valueNode *ast.Node) {
			if matchesLiteralTypeAssertion(ctx.SourceFile, valueNode, typeNode) {
				ctx.ReportNode(typeNode, buildPreferConstAssertionMessage())
			}
		}

		return rule.RuleListeners{
			ast.KindAsExpression: func(node *ast.Node) {
				expression := node.AsAsExpression()
				reportAssertion(expression.Type, expression.Expression)
			},
			ast.KindTypeAssertionExpression: func(node *ast.Node) {
				expression := node.AsTypeAssertion()
				reportAssertion(expression.Type, expression.Expression)
			},
			ast.KindVariableDeclaration: func(node *ast.Node) {
				declaration := node.AsVariableDeclaration()
				reportVariableAnnotation(declaration.Type, declaration.Initializer)
			},
			ast.KindPropertyDeclaration: func(node *ast.Node) {
				declaration := node.AsPropertyDeclaration()
				reportVariableAnnotation(declaration.Type, declaration.Initializer)
			},
		}
	},
}
