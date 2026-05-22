package s5856_no_invalid_regexp

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexutil"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildNoInvalidRegexpMessage(description string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: description,
	}
}

func invalidRegexpMessage(pattern string, flags string, validationMessage string) string {
	display := regexutil.DisplayRegex(pattern, flags)
	if regexutil.HasUnterminatedCharacterClass(pattern) {
		return fmt.Sprintf("Invalid regular expression: %s: Unterminated character class", display)
	}
	return fmt.Sprintf("Invalid regular expression: %s: %s", display, validationMessage)
}

func validatePattern(pattern string, flags string) (string, bool) {
	errors := regexutil.ValidatePatternWithFlags(pattern, flags)
	if len(errors) == 0 {
		return "", false
	}
	return invalidRegexpMessage(pattern, flags, errors[0].Message), true
}

func isRegExpConstructor(node *ast.Node) bool {
	node = regexutil.UnwrapExpression(node)
	if node == nil {
		return false
	}

	switch {
	case ast.IsCallExpression(node), ast.IsNewExpression(node):
		callee := regexutil.UnwrapExpression(node.Expression())
		if ast.IsIdentifier(callee) {
			return callee.AsIdentifier().Text == "RegExp"
		}
		if ast.IsPropertyAccessExpression(callee) {
			object := regexutil.UnwrapExpression(callee.AsPropertyAccessExpression().Expression)
			name := callee.AsPropertyAccessExpression().Name()
			return name != nil && name.Text() == "RegExp" && ast.IsIdentifier(object) && object.AsIdentifier().Text == "globalThis"
		}
	}

	return false
}

func checkInvalidRegexp(ctx rule.RuleContext, node *ast.Node) {
	if !isRegExpConstructor(node) && !(ast.IsCallExpression(node) && regexutil.IsStringMatchCall(ctx, node.AsCallExpression())) {
		return
	}

	args := node.Arguments()
	if len(args) == 0 {
		return
	}

	patternInfo, ok := regexutil.ResolvePatternFlags(ctx, args[0])
	if !ok {
		return
	}

	if isRegExpConstructor(node) {
		flagsKnown := true
		flags := ""
		if len(args) >= 2 {
			if value, ok := regexutil.StaticStringValue(ctx, args[1]); ok {
				flags = value
			} else {
				flagsKnown = false
			}
		}

		if flagsKnown {
			if !regexutil.ValidateFlags(flags) {
				ctx.ReportNode(node, buildNoInvalidRegexpMessage(fmt.Sprintf("Invalid flags supplied to RegExp constructor '%s'", flags)))
				return
			}

			if message, ok := validatePattern(patternInfo.Pattern, flags); ok {
				ctx.ReportNode(node, buildNoInvalidRegexpMessage(message))
			}
			return
		}

		messageWithoutU, invalidWithoutU := validatePattern(patternInfo.Pattern, "")
		_, invalidWithU := validatePattern(patternInfo.Pattern, "u")
		if invalidWithoutU && invalidWithU {
			ctx.ReportNode(node, buildNoInvalidRegexpMessage(messageWithoutU))
		}
		return
	}

	if message, ok := validatePattern(patternInfo.Pattern, ""); ok {
		ctx.ReportNode(node, buildNoInvalidRegexpMessage(message))
	}
}

var NoInvalidRegexpRule = rule.Rule{
	Name: "no-invalid-regexp",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				checkInvalidRegexp(ctx, node)
			},
			ast.KindNewExpression: func(node *ast.Node) {
				checkInvalidRegexp(ctx, node)
			},
		}
	},
}
