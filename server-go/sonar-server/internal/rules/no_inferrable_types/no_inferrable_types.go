package no_inferrable_types

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

type noInferrableTypesOptions struct {
	IgnoreParameters bool `json:"ignoreParameters"`
	IgnoreProperties bool `json:"ignoreProperties"`
}

var inferrableKeywordNames = map[ast.Kind]string{
	ast.KindBigIntKeyword:    "bigint",
	ast.KindBooleanKeyword:   "boolean",
	ast.KindNullKeyword:      "null",
	ast.KindNumberKeyword:    "number",
	ast.KindStringKeyword:    "string",
	ast.KindSymbolKeyword:    "symbol",
	ast.KindUndefinedKeyword: "undefined",
}

func buildNoInferrableTypeMessage(typeName string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "noInferrableType",
		Description: fmt.Sprintf("Type %s trivially inferred from a %s literal, remove type annotation.", typeName, typeName),
	}
}

func isIdentifierNamed(node *ast.Node, names ...string) bool {
	if !ast.IsIdentifier(node) {
		return false
	}

	identifierName := node.AsIdentifier().Text
	for _, name := range names {
		if identifierName == name {
			return true
		}
	}
	return false
}

func isFunctionCall(init *ast.Node, callName string) bool {
	node := ast.SkipParentheses(init)
	if !ast.IsCallExpression(node) {
		return false
	}

	callee := ast.SkipParentheses(node.AsCallExpression().Expression)
	return ast.IsIdentifier(callee) && callee.AsIdentifier().Text == callName
}

func hasUnaryPrefix(init *ast.Node, operators ...ast.Kind) bool {
	node := ast.SkipParentheses(init)
	if !ast.IsPrefixUnaryExpression(node) {
		return false
	}

	for _, operator := range operators {
		if node.AsPrefixUnaryExpression().Operator == operator {
			return true
		}
	}
	return false
}

func unwrapUnary(init *ast.Node, operators ...ast.Kind) *ast.Node {
	node := ast.SkipParentheses(init)
	if !ast.IsPrefixUnaryExpression(node) {
		return node
	}

	for _, operator := range operators {
		if node.AsPrefixUnaryExpression().Operator == operator {
			return ast.SkipParentheses(node.AsPrefixUnaryExpression().Operand)
		}
	}

	return node
}

func isInferrableType(typeNode *ast.Node, init *ast.Node) bool {
	switch typeNode.Kind {
	case ast.KindBigIntKeyword:
		unwrapped := unwrapUnary(init, ast.KindMinusToken)
		return isFunctionCall(unwrapped, "BigInt") || unwrapped.Kind == ast.KindBigIntLiteral
	case ast.KindBooleanKeyword:
		unwrapped := ast.SkipParentheses(init)
		return hasUnaryPrefix(unwrapped, ast.KindExclamationToken) ||
			isFunctionCall(unwrapped, "Boolean") ||
			unwrapped.Kind == ast.KindTrueKeyword ||
			unwrapped.Kind == ast.KindFalseKeyword
	case ast.KindNumberKeyword:
		unwrapped := unwrapUnary(init, ast.KindPlusToken, ast.KindMinusToken)
		return ast.IsNumericLiteral(unwrapped) ||
			isFunctionCall(unwrapped, "Number") ||
			isIdentifierNamed(unwrapped, "Infinity", "NaN")
	case ast.KindNullKeyword:
		return ast.SkipParentheses(init).Kind == ast.KindNullKeyword
	case ast.KindStringKeyword:
		unwrapped := ast.SkipParentheses(init)
		return ast.IsStringLiteral(unwrapped) ||
			unwrapped.Kind == ast.KindNoSubstitutionTemplateLiteral ||
			unwrapped.Kind == ast.KindTemplateExpression ||
			isFunctionCall(unwrapped, "String")
	case ast.KindSymbolKeyword:
		return isFunctionCall(init, "Symbol")
	case ast.KindTypeReference:
		typeName := typeNode.AsTypeReferenceNode().TypeName
		if !ast.IsIdentifier(typeName) || typeName.AsIdentifier().Text != "RegExp" {
			return false
		}

		unwrapped := ast.SkipParentheses(init)
		if ast.IsRegularExpressionLiteral(unwrapped) {
			return true
		}
		if ast.IsNewExpression(unwrapped) {
			callee := ast.SkipParentheses(unwrapped.AsNewExpression().Expression)
			return ast.IsIdentifier(callee) && callee.AsIdentifier().Text == "RegExp"
		}
		return isFunctionCall(unwrapped, "RegExp")
	case ast.KindUndefinedKeyword:
		return utils.IsUndefinedLiteral(ast.SkipParentheses(init))
	default:
		return false
	}
}

func inferrableTypeName(typeNode *ast.Node) (string, bool) {
	if typeNode.Kind == ast.KindTypeReference {
		typeName := typeNode.AsTypeReferenceNode().TypeName
		if ast.IsIdentifier(typeName) && typeName.AsIdentifier().Text == "RegExp" {
			return "RegExp", true
		}
		return "", false
	}

	typeName, ok := inferrableKeywordNames[typeNode.Kind]
	return typeName, ok
}

func reportInferrableType(ctx rule.RuleContext, node *ast.Node, typeNode *ast.Node, init *ast.Node) {
	if typeNode == nil || init == nil {
		return
	}
	if !isInferrableType(typeNode, init) {
		return
	}

	typeName, ok := inferrableTypeName(typeNode)
	if !ok {
		return
	}

	ctx.ReportNode(node, buildNoInferrableTypeMessage(typeName))
}

func checkFunctionParameters(ctx rule.RuleContext, node *ast.Node, opts noInferrableTypesOptions) {
	if opts.IgnoreParameters {
		return
	}

	for _, parameterNode := range node.Parameters() {
		parameter := parameterNode.AsParameterDeclaration()
		reportInferrableType(ctx, parameterNode, parameter.Type, parameter.Initializer)
	}
}

func checkProperty(ctx rule.RuleContext, node *ast.Node, opts noInferrableTypesOptions) {
	if opts.IgnoreProperties {
		return
	}
	if node.ModifierFlags()&ast.ModifierFlagsReadonly != 0 {
		return
	}
	if postfix := node.PostfixToken(); postfix != nil && postfix.Kind == ast.KindQuestionToken {
		return
	}

	property := node.AsPropertyDeclaration()
	reportInferrableType(ctx, node, property.Type, property.Initializer)
}

var NoInferrableTypesRule = rule.Rule{
	Name: "no-inferrable-types",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		opts := utils.UnmarshalOptions[noInferrableTypesOptions](options, "no-inferrable-types")

		return rule.RuleListeners{
			ast.KindVariableDeclaration: func(node *ast.Node) {
				declaration := node.AsVariableDeclaration()
				reportInferrableType(ctx, node, declaration.Type, declaration.Initializer)
			},
			ast.KindPropertyDeclaration: func(node *ast.Node) {
				checkProperty(ctx, node, opts)
			},
			ast.KindArrowFunction: func(node *ast.Node) {
				checkFunctionParameters(ctx, node, opts)
			},
			ast.KindFunctionDeclaration: func(node *ast.Node) {
				checkFunctionParameters(ctx, node, opts)
			},
			ast.KindFunctionExpression: func(node *ast.Node) {
				checkFunctionParameters(ctx, node, opts)
			},
			ast.KindMethodDeclaration: func(node *ast.Node) {
				checkFunctionParameters(ctx, node, opts)
			},
			ast.KindConstructor: func(node *ast.Node) {
				checkFunctionParameters(ctx, node, opts)
			},
			ast.KindGetAccessor: func(node *ast.Node) {
				checkFunctionParameters(ctx, node, opts)
			},
			ast.KindSetAccessor: func(node *ast.Node) {
				checkFunctionParameters(ctx, node, opts)
			},
		}
	},
}
