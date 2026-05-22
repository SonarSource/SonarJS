package s2201_no_ignored_return

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const (
	useForEachMessageID          = "useForEach"
	returnValueMustBeUsedMessage = "returnValueMustBeUsed"
)

var methodsWithoutSideEffects = map[string]map[string]struct{}{
	"array": {
		"concat":         {},
		"includes":       {},
		"join":           {},
		"slice":          {},
		"indexOf":        {},
		"lastIndexOf":    {},
		"entries":        {},
		"filter":         {},
		"findIndex":      {},
		"findLast":       {},
		"findLastIndex":  {},
		"keys":           {},
		"map":            {},
		"values":         {},
		"find":           {},
		"reduce":         {},
		"reduceRight":    {},
		"toString":       {},
		"toLocaleString": {},
	},
	"date": {
		"getDate":            {},
		"getDay":             {},
		"getFullYear":        {},
		"getHours":           {},
		"getMilliseconds":    {},
		"getMinutes":         {},
		"getMonth":           {},
		"getSeconds":         {},
		"getTime":            {},
		"getTimezoneOffset":  {},
		"getUTCDate":         {},
		"getUTCDay":          {},
		"getUTCFullYear":     {},
		"getUTCHours":        {},
		"getUTCMilliseconds": {},
		"getUTCMinutes":      {},
		"getUTCMonth":        {},
		"getUTCSeconds":      {},
		"getYear":            {},
		"toDateString":       {},
		"toISOString":        {},
		"toJSON":             {},
		"toGMTString":        {},
		"toLocaleDateString": {},
		"toLocaleTimeString": {},
		"toTimeString":       {},
		"toUTCString":        {},
		"toString":           {},
		"toLocaleString":     {},
	},
	"math": {
		"E":       {},
		"LN2":     {},
		"LN10":    {},
		"LOG2E":   {},
		"LOG10E":  {},
		"PI":      {},
		"SQRT1_2": {},
		"SQRT2":   {},
		"abs":     {},
		"acos":    {},
		"acosh":   {},
		"asin":    {},
		"asinh":   {},
		"atan":    {},
		"atanh":   {},
		"atan2":   {},
		"cbrt":    {},
		"ceil":    {},
		"clz32":   {},
		"cos":     {},
		"cosh":    {},
		"exp":     {},
		"expm1":   {},
		"floor":   {},
		"fround":  {},
		"hypot":   {},
		"imul":    {},
		"log":     {},
		"log1p":   {},
		"log10":   {},
		"log2":    {},
		"max":     {},
		"min":     {},
		"pow":     {},
		"random":  {},
		"round":   {},
		"sign":    {},
		"sin":     {},
		"sinh":    {},
		"sqrt":    {},
		"tan":     {},
		"tanh":    {},
		"trunc":   {},
	},
	"number": {
		"toExponential":  {},
		"toFixed":        {},
		"toPrecision":    {},
		"toLocaleString": {},
		"toString":       {},
	},
	"regexp": {
		"test":     {},
		"toString": {},
	},
	"string": {
		"charAt":            {},
		"charCodeAt":        {},
		"codePointAt":       {},
		"concat":            {},
		"includes":          {},
		"endsWith":          {},
		"indexOf":           {},
		"lastIndexOf":       {},
		"localeCompare":     {},
		"match":             {},
		"normalize":         {},
		"padEnd":            {},
		"padStart":          {},
		"repeat":            {},
		"replace":           {},
		"search":            {},
		"slice":             {},
		"split":             {},
		"startsWith":        {},
		"substr":            {},
		"substring":         {},
		"toLocaleLowerCase": {},
		"toLocaleUpperCase": {},
		"toLowerCase":       {},
		"toUpperCase":       {},
		"trim":              {},
		"length":            {},
		"toString":          {},
		"valueOf":           {},
		"anchor":            {},
		"big":               {},
		"blink":             {},
		"bold":              {},
		"fixed":             {},
		"fontcolor":         {},
		"fontsize":          {},
		"italics":           {},
		"link":              {},
		"small":             {},
		"strike":            {},
		"sub":               {},
		"sup":               {},
	},
}

var earlyExitArrayMethods = map[string]struct{}{
	"find":          {},
	"findIndex":     {},
	"findLast":      {},
	"findLastIndex": {},
}

func buildUseForEachMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          useForEachMessageID,
		Description: `Consider using "forEach" instead of "map" as its return value is not being used here.`,
	}
}

func buildReturnValueMustBeUsedMessage(methodName string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          returnValueMustBeUsedMessage,
		Description: `The return value of "` + methodName + `" must be used.`,
	}
}

func isExpressionStatementCall(node *ast.Node) bool {
	return node != nil && ast.IsExpressionStatement(node.Parent) && node.Parent.AsExpressionStatement().Expression == node
}

func methodName(callExpr *ast.CallExpression) (string, *ast.Node, bool) {
	callee := ast.SkipParentheses(callExpr.Expression)
	switch {
	case ast.IsPropertyAccessExpression(callee):
		access := callee.AsPropertyAccessExpression()
		name := access.Name()
		return name.Text(), access.Expression, true
	case ast.IsElementAccessExpression(callee):
		access := callee.AsElementAccessExpression()
		argument := ast.SkipParentheses(access.ArgumentExpression)
		if ast.IsStringLiteral(argument) || argument.Kind == ast.KindNoSubstitutionTemplateLiteral {
			return argument.Text(), access.Expression, true
		}
	}
	return "", nil, false
}

func containsAssignment(root *ast.Node) bool {
	if root == nil {
		return false
	}

	found := false
	var visit func(node *ast.Node, allowFunction bool)
	visit = func(node *ast.Node, allowFunction bool) {
		if node == nil || found {
			return
		}
		if !allowFunction && ast.IsFunctionLikeDeclaration(node) {
			return
		}
		if ast.IsAssignmentExpression(node, true) {
			found = true
			return
		}

		node.ForEachChild(func(child *ast.Node) bool {
			visit(child, false)
			return false
		})
	}

	visit(root, true)
	return found
}

func isReplaceWithCallback(ctx rule.RuleContext, methodName string, callExpr *ast.CallExpression) bool {
	if methodName != "replace" || len(callExpr.Arguments.Nodes) < 2 || ctx.TypeChecker == nil {
		return false
	}

	t := checker.Checker_getApparentType(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(callExpr.Arguments.Nodes[1]))
	return len(utils.CollectAllCallSignatures(ctx.TypeChecker, t)) > 0
}

func isFindWithAssignmentCallback(methodName string, callExpr *ast.CallExpression) bool {
	if _, ok := earlyExitArrayMethods[methodName]; !ok || len(callExpr.Arguments.Nodes) == 0 {
		return false
	}

	callback := ast.SkipParentheses(callExpr.Arguments.Nodes[0])
	switch {
	case ast.IsArrowFunction(callback):
		return containsAssignment(callback.AsArrowFunction().Body)
	case ast.IsFunctionExpression(callback):
		return containsAssignment(callback.AsFunctionExpression().Body)
	default:
		return false
	}
}

func isGlobalMath(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return ast.IsIdentifier(node) &&
		node.AsIdentifier().Text == "Math" &&
		rule.ResolvesToGlobalValue(ctx, node, "Math")
}

func classifyReceiverType(ctx rule.RuleContext, node *ast.Node) string {
	node = ast.SkipParentheses(node)
	if ctx.TypeChecker == nil || node == nil {
		return ""
	}

	if isGlobalMath(ctx, node) {
		return "math"
	}

	t := checker.Checker_getApparentType(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(node))
	switch {
	case t == nil:
		return ""
	case checker.Checker_isArrayOrTupleType(ctx.TypeChecker, t):
		return "array"
	case utils.IsTypeFlagSet(t, checker.TypeFlagsStringLike):
		return "string"
	case utils.IsTypeFlagSet(t, checker.TypeFlagsNumberLike):
		return "number"
	}

	if symbol := checker.Type_symbol(t); symbol != nil {
		switch symbol.Name {
		case "Array":
			return "array"
		case "Date":
			return "date"
		case "Math":
			return "math"
		case "RegExp":
			return "regexp"
		}
	}

	return ""
}

func hasSideEffect(ctx rule.RuleContext, methodName string, receiver *ast.Node) bool {
	category := classifyReceiverType(ctx, receiver)
	if category == "" {
		return true
	}

	_, ok := methodsWithoutSideEffects[category][methodName]
	return !ok
}

var NoIgnoredReturnRule = rule.Rule{
	Name: "no-ignored-return",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				if !isExpressionStatementCall(node) {
					return
				}

				callExpr := node.AsCallExpression()
				methodName, receiver, ok := methodName(callExpr)
				if !ok || hasSideEffect(ctx, methodName, receiver) {
					return
				}
				if isReplaceWithCallback(ctx, methodName, callExpr) || isFindWithAssignmentCallback(methodName, callExpr) {
					return
				}

				if methodName == "map" {
					ctx.ReportNode(node, buildUseForEachMessage())
					return
				}
				ctx.ReportNode(node, buildReturnValueMustBeUsedMessage(methodName))
			},
		}
	},
}
