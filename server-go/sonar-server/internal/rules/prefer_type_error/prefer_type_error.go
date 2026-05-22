package prefer_type_error

import (
	"regexp"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const messageID = "prefer-type-error"

var errorNameRegexp = regexp.MustCompile(`^(?:[A-Z][\da-z]*)*Error$`)

var typeCheckIdentifiers = map[string]struct{}{
	"isArguments":       {},
	"isArray":           {},
	"isArrayBuffer":     {},
	"isArrayLike":       {},
	"isArrayLikeObject": {},
	"isBigInt":          {},
	"isBoolean":         {},
	"isBuffer":          {},
	"isDate":            {},
	"isElement":         {},
	"isError":           {},
	"isFinite":          {},
	"isFunction":        {},
	"isInteger":         {},
	"isLength":          {},
	"isMap":             {},
	"isNaN":             {},
	"isNative":          {},
	"isNil":             {},
	"isNull":            {},
	"isNumber":          {},
	"isObject":          {},
	"isObjectLike":      {},
	"isPlainObject":     {},
	"isPrototypeOf":     {},
	"isRegExp":          {},
	"isSafeInteger":     {},
	"isSet":             {},
	"isString":          {},
	"isSymbol":          {},
	"isTypedArray":      {},
	"isUndefined":       {},
	"isView":            {},
	"isWeakMap":         {},
	"isWeakSet":         {},
	"isWindow":          {},
	"isXMLDoc":          {},
}

var typeCheckGlobalIdentifiers = map[string]struct{}{
	"isFinite": {},
	"isNaN":    {},
}

func buildPreferTypeErrorMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          messageID,
		Description: "`new Error()` is too unspecific for a type check. Use `new TypeError()` instead.",
	}
}

func isLoneThrowInBlock(node *ast.Node) bool {
	parent := node.Parent
	return ast.IsBlock(parent) &&
		parent.AsBlock().Statements != nil &&
		len(parent.AsBlock().Statements.Nodes) == 1
}

func isDirectGlobalTypecheckIdentifier(ctx rule.RuleContext, node *ast.Node, callExpression *ast.CallExpression) bool {
	if callExpression == nil || len(callExpression.Arguments.Nodes) == 0 || !ast.IsIdentifier(node) {
		return false
	}

	name := node.AsIdentifier().Text
	if _, ok := typeCheckGlobalIdentifiers[name]; !ok {
		return false
	}

	return rule.ResolvesToGlobalValue(ctx, node, name)
}

func isTypecheckMemberProperty(node *ast.Node, callExpression *ast.CallExpression) bool {
	if callExpression == nil || len(callExpression.Arguments.Nodes) == 0 || !ast.IsIdentifier(node) {
		return false
	}

	_, ok := typeCheckIdentifiers[node.AsIdentifier().Text]
	return ok
}

func isAccessExpression(node *ast.Node) bool {
	return ast.IsPropertyAccessExpression(node) || ast.IsElementAccessExpression(node)
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

func isTypecheckingMemberExpression(node *ast.Node, callExpression *ast.CallExpression) bool {
	switch {
	case ast.IsPropertyAccessExpression(node):
		if isTypecheckMemberProperty(node.AsPropertyAccessExpression().Name(), callExpression) {
			return true
		}
	case ast.IsElementAccessExpression(node):
		// The unicorn rule only treats identifier properties as matches.
	}

	object := accessExpressionObject(node)
	return object != nil && isAccessExpression(object) && isTypecheckingMemberExpression(object, callExpression)
}

func isErrorConstructor(node *ast.Node) bool {
	switch {
	case ast.IsIdentifier(node):
		return errorNameRegexp.MatchString(node.AsIdentifier().Text)
	case ast.IsPropertyAccessExpression(node) && !ast.IsOptionalChain(node):
		name := node.AsPropertyAccessExpression().Name()
		return name != nil && errorNameRegexp.MatchString(name.Text())
	default:
		return false
	}
}

func isLogicalOperator(kind ast.Kind) bool {
	switch kind {
	case ast.KindAmpersandAmpersandToken, ast.KindBarBarToken, ast.KindQuestionQuestionToken:
		return true
	default:
		return false
	}
}

func isTypecheckingExpression(ctx rule.RuleContext, node *ast.Node, callExpression *ast.CallExpression) bool {
	if node == nil {
		return false
	}

	for ast.IsParenthesizedExpression(node) {
		node = node.AsParenthesizedExpression().Expression
	}

	switch {
	case ast.IsIdentifier(node):
		return isDirectGlobalTypecheckIdentifier(ctx, node, callExpression)

	case ast.IsPropertyAccessExpression(node), ast.IsElementAccessExpression(node):
		return isTypecheckingMemberExpression(node, callExpression)

	case ast.IsCallExpression(node):
		return isTypecheckingExpression(ctx, node.AsCallExpression().Expression, node.AsCallExpression())

	case ast.IsTypeOfExpression(node):
		return true

	case ast.IsPrefixUnaryExpression(node):
		prefix := node.AsPrefixUnaryExpression()
		return prefix.Operator == ast.KindExclamationToken &&
			isTypecheckingExpression(ctx, prefix.Operand, nil)

	case ast.IsBinaryExpression(node):
		binary := node.AsBinaryExpression()

		if isLogicalOperator(binary.OperatorToken.Kind) {
			return isTypecheckingExpression(ctx, binary.Left, callExpression) &&
				isTypecheckingExpression(ctx, binary.Right, callExpression)
		}

		if binary.OperatorToken.Kind == ast.KindInstanceOfKeyword {
			return !isErrorConstructor(ast.SkipParentheses(binary.Right))
		}

		return isTypecheckingExpression(ctx, binary.Left, callExpression) ||
			isTypecheckingExpression(ctx, binary.Right, callExpression)

	default:
		return false
	}
}

func isTypecheckingIfStatement(ctx rule.RuleContext, node *ast.Node) bool {
	return ast.IsIfStatement(node) && isTypecheckingExpression(ctx, node.AsIfStatement().Expression, nil)
}

func isNewErrorExpression(node *ast.Node) *ast.Node {
	if !ast.IsNewExpression(node) {
		return nil
	}

	callee := ast.SkipParentheses(node.AsNewExpression().Expression)
	if !ast.IsIdentifier(callee) || callee.AsIdentifier().Text != "Error" {
		return nil
	}

	return callee
}

var PreferTypeErrorRule = rule.Rule{
	Name: "prefer-type-error",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindThrowStatement: func(node *ast.Node) {
				errorConstructor := isNewErrorExpression(node.AsThrowStatement().Expression)
				if errorConstructor == nil || !isLoneThrowInBlock(node) {
					return
				}

				if node.Parent == nil || node.Parent.Parent == nil || !isTypecheckingIfStatement(ctx, node.Parent.Parent) {
					return
				}

				ctx.ReportNodeWithFixes(errorConstructor, buildPreferTypeErrorMessage(), func() []rule.RuleFix {
					return []rule.RuleFix{rule.RuleFixInsertBefore(ctx.SourceFile, errorConstructor, "Type")}
				})
			},
		}
	},
}
