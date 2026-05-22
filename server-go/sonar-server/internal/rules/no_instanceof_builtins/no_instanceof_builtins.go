package no_instanceof_builtins

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var primitiveWrappers = map[string]struct{}{
	"String":  {},
	"Number":  {},
	"Boolean": {},
	"BigInt":  {},
	"Symbol":  {},
}

var strictStrategyConstructors = map[string]struct{}{
	"Error":                {},
	"EvalError":            {},
	"RangeError":           {},
	"ReferenceError":       {},
	"SyntaxError":          {},
	"TypeError":            {},
	"URIError":             {},
	"AggregateError":       {},
	"SuppressedError":      {},
	"Map":                  {},
	"Set":                  {},
	"WeakMap":              {},
	"WeakRef":              {},
	"WeakSet":              {},
	"ArrayBuffer":          {},
	"Int8Array":            {},
	"Uint8Array":           {},
	"Uint8ClampedArray":    {},
	"Int16Array":           {},
	"Uint16Array":          {},
	"Int32Array":           {},
	"Uint32Array":          {},
	"Float16Array":         {},
	"Float32Array":         {},
	"Float64Array":         {},
	"BigInt64Array":        {},
	"BigUint64Array":       {},
	"Object":               {},
	"RegExp":               {},
	"Promise":              {},
	"Proxy":                {},
	"DataView":             {},
	"Date":                 {},
	"SharedArrayBuffer":    {},
	"FinalizationRegistry": {},
}

type noInstanceofBuiltinsOptions struct {
	useErrorIsError       bool
	exclude               map[string]struct{}
	forbiddenConstructors map[string]struct{}
}

func buildNoInstanceofBuiltinsMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "no-instanceof-builtins",
		Description: "Avoid using `instanceof` for type checking as it can lead to unreliable results.",
	}
}

func parseStringSlice(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}

	result := make([]string, 0, len(items))
	for _, item := range items {
		if text, ok := item.(string); ok {
			result = append(result, text)
		}
	}
	return result
}

func parseNoInstanceofBuiltinsOptions(options any) noInstanceofBuiltinsOptions {
	result := noInstanceofBuiltinsOptions{
		exclude:               map[string]struct{}{},
		forbiddenConstructors: map[string]struct{}{},
	}

	optionMap, ok := options.(map[string]any)
	if !ok {
		return result
	}

	if value, ok := optionMap["useErrorIsError"].(bool); ok {
		result.useErrorIsError = value
	}

	strategy, _ := optionMap["strategy"].(string)
	if strategy == "strict" {
		for name := range strictStrategyConstructors {
			result.forbiddenConstructors[name] = struct{}{}
		}
	}

	for _, name := range parseStringSlice(optionMap["include"]) {
		result.forbiddenConstructors[name] = struct{}{}
	}

	for _, name := range parseStringSlice(optionMap["exclude"]) {
		result.exclude[name] = struct{}{}
	}

	return result
}

var NoInstanceofBuiltinsRule = rule.Rule{
	Name: "no-instanceof-builtins",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		opts := parseNoInstanceofBuiltinsOptions(options)

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				binaryExpr := node.AsBinaryExpression()
				if binaryExpr.OperatorToken.Kind != ast.KindInstanceOfKeyword {
					return
				}

				right := ast.SkipParentheses(binaryExpr.Right)
				if !ast.IsIdentifier(right) {
					return
				}

				constructorName := right.AsIdentifier().Text
				if _, excluded := opts.exclude[constructorName]; excluded {
					return
				}

				switch constructorName {
				case "Array":
					ctx.ReportNode(node, buildNoInstanceofBuiltinsMessage())
					return
				case "Error":
					if opts.useErrorIsError {
						ctx.ReportNode(node, buildNoInstanceofBuiltinsMessage())
					}
					return
				case "Function":
					ctx.ReportNode(node, buildNoInstanceofBuiltinsMessage())
					return
				}

				if _, ok := primitiveWrappers[constructorName]; ok {
					ctx.ReportNode(node, buildNoInstanceofBuiltinsMessage())
					return
				}

				if _, ok := opts.forbiddenConstructors[constructorName]; ok {
					ctx.ReportNode(node, buildNoInstanceofBuiltinsMessage())
				}
			},
		}
	},
}
