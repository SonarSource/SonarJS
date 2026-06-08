package radix

import (
	"math"
	"strconv"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const (
	modeAlways   = "always"
	modeAsNeeded = "as-needed"
)

func buildMissingParametersMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "missingParameters",
		Description: "Missing parameters.",
	}
}

func buildRedundantRadixMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "redundantRadix",
		Description: "Redundant radix parameter.",
	}
}

func buildMissingRadixMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "missingRadix",
		Description: "Missing radix parameter.",
	}
}

func buildInvalidRadixMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "invalidRadix",
		Description: "Invalid radix parameter, must be an integer between 2 and 36.",
	}
}

func normalizeMode(options any) string {
	switch typed := options.(type) {
	case string:
		if typed == modeAsNeeded {
			return modeAsNeeded
		}
	case []any:
		if len(typed) > 0 {
			if value, ok := typed[0].(string); ok && value == modeAsNeeded {
				return modeAsNeeded
			}
		}
	case []string:
		if len(typed) > 0 && typed[0] == modeAsNeeded {
			return modeAsNeeded
		}
	}

	return modeAlways
}

func parseNumericLiteralValue(node *ast.Node) (float64, bool) {
	if !ast.IsNumericLiteral(node) {
		return 0, false
	}

	text := strings.ReplaceAll(node.AsNumericLiteral().Text, "_", "")
	if value, err := strconv.ParseInt(text, 0, 64); err == nil {
		return float64(value), true
	}
	if value, err := strconv.ParseUint(text, 0, 64); err == nil {
		return float64(value), true
	}
	if value, err := strconv.ParseFloat(text, 64); err == nil {
		return value, true
	}

	return 0, false
}

func isDefaultRadix(node *ast.Node) bool {
	value, ok := parseNumericLiteralValue(ast.SkipParentheses(node))
	return ok && value == 10
}

func isValidNumericRadix(node *ast.Node) bool {
	value, ok := parseNumericLiteralValue(ast.SkipParentheses(node))
	return ok && math.Trunc(value) == value && value >= 2 && value <= 36
}

func isValidRadix(node *ast.Node) bool {
	node = ast.SkipParentheses(node)

	switch {
	case node == nil:
		return true
	case ast.IsNumericLiteral(node):
		return isValidNumericRadix(node)
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text != "undefined"
	case ast.IsStringLiteral(node),
		node.Kind == ast.KindNoSubstitutionTemplateLiteral,
		node.Kind == ast.KindBigIntLiteral,
		node.Kind == ast.KindTrueKeyword,
		node.Kind == ast.KindFalseKeyword,
		node.Kind == ast.KindNullKeyword,
		node.Kind == ast.KindRegularExpressionLiteral:
		return false
	default:
		return true
	}
}

func isGlobalIdentifier(ctx rule.RuleContext, node *ast.Node, name string) bool {
	node = ast.SkipParentheses(node)
	return ast.IsIdentifier(node) &&
		node.AsIdentifier().Text == name &&
		rule.ResolvesToGlobalValue(ctx, node, name)
}

func isParseIntCall(ctx rule.RuleContext, callExpr *ast.CallExpression) bool {
	callee := ast.SkipParentheses(callExpr.Expression)

	if isGlobalIdentifier(ctx, callee, "parseInt") {
		return true
	}

	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}

	property := callee.AsPropertyAccessExpression().Name()
	if property == nil || property.Text() != "parseInt" {
		return false
	}

	return isGlobalIdentifier(ctx, callee.AsPropertyAccessExpression().Expression, "Number")
}

var RadixRule = rule.Rule{
	Name: "radix",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		mode := normalizeMode(options)

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				if !isParseIntCall(ctx, callExpr) {
					return
				}

				args := callExpr.Arguments.Nodes
				switch len(args) {
				case 0:
					ctx.ReportNode(node, buildMissingParametersMessage())
				case 1:
					if mode == modeAlways {
						ctx.ReportNode(node, buildMissingRadixMessage())
					}
				default:
					if mode == modeAsNeeded && isDefaultRadix(args[1]) {
						ctx.ReportNode(node, buildRedundantRadixMessage())
						return
					}
					if !isValidRadix(args[1]) {
						ctx.ReportNode(node, buildInvalidRadixMessage())
					}
				}
			},
		}
	},
}
