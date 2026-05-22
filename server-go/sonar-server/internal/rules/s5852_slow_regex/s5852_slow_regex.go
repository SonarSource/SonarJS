package s5852_slow_regex

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	regexhelpers "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regex_batch_helpers"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexutil"
	"github.com/microsoft/typescript-go/shim/ast"
)

const slowRegexMessage = "Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service."

func buildSlowRegexMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: slowRegexMessage,
	}
}

func containsUnboundedQuantifier(node regexhelpers.RegexNode) bool {
	found := false
	regexhelpers.Walk(node, func(current regexhelpers.RegexNode) {
		if found {
			return
		}
		quantifier, ok := current.(*regexhelpers.Quantifier)
		if ok && quantifier.Max < 0 {
			found = true
		}
	})
	return found
}

func quantifierSetKey(element regexhelpers.Element) string {
	switch typed := element.(type) {
	case *regexhelpers.Character:
		return "char:" + string(rune(typed.Value))
	case *regexhelpers.CharacterSet:
		return "set:" + string(typed.Kind) + ":" + map[bool]string{true: "neg", false: "pos"}[typed.Negate]
	case *regexhelpers.CharacterClass:
		return "class"
	case *regexhelpers.Other:
		return "other"
	case *regexhelpers.Group:
		return "group"
	default:
		return ""
	}
}

func hasSeparatedQuantifiers(alternative *regexhelpers.Alternative) bool {
	type quantified struct {
		key   string
		index int
	}

	quantifieds := []quantified{}
	for index, element := range alternative.Elements {
		quantifier, ok := element.(*regexhelpers.Quantifier)
		if !ok || quantifier.Max < 0 {
			if ok {
				quantifieds = append(quantifieds, quantified{key: quantifierSetKey(quantifier.Element), index: index})
			}
			continue
		}
	}

	for index := 0; index < len(quantifieds)-1; index++ {
		left := quantifieds[index]
		right := quantifieds[index+1]
		if right.index-left.index <= 1 {
			continue
		}
		if left.key == "" || right.key == "" {
			continue
		}
		if left.key == right.key || left.key == "other" || right.key == "other" || left.key == "class" || right.key == "class" {
			return true
		}
	}

	return false
}

func trailingUnboundedToEnd(alternative *regexhelpers.Alternative) bool {
	if len(alternative.Elements) < 2 {
		return false
	}

	lastAssertion, ok := alternative.Elements[len(alternative.Elements)-1].(*regexhelpers.Assertion)
	if !ok || lastAssertion.Kind != regexhelpers.AssertionEnd {
		return false
	}

	quantifier, ok := alternative.Elements[len(alternative.Elements)-2].(*regexhelpers.Quantifier)
	return ok && quantifier.Max < 0
}

func hasNestedUnboundedQuantifier(node regexhelpers.RegexNode) bool {
	found := false
	regexhelpers.Walk(node, func(current regexhelpers.RegexNode) {
		if found {
			return
		}
		quantifier, ok := current.(*regexhelpers.Quantifier)
		if !ok || quantifier.Max >= 0 {
			return
		}
		if containsUnboundedQuantifier(quantifier.Element) {
			found = true
		}
	})
	return found
}

func isTrimStyleAlternation(pattern *regexhelpers.Pattern) bool {
	if len(pattern.Alternatives) < 2 {
		return false
	}

	hasStart := false
	hasEnd := false
	for _, alternative := range pattern.Alternatives {
		if len(alternative.Elements) == 0 {
			continue
		}
		if assertion, ok := alternative.Elements[0].(*regexhelpers.Assertion); ok && assertion.Kind == regexhelpers.AssertionStart {
			hasStart = hasStart || containsUnboundedQuantifier(alternative)
		}
		if assertion, ok := alternative.Elements[len(alternative.Elements)-1].(*regexhelpers.Assertion); ok && assertion.Kind == regexhelpers.AssertionEnd {
			hasEnd = hasEnd || containsUnboundedQuantifier(alternative)
		}
	}

	return hasStart && hasEnd
}

func isSlowPattern(pattern *regexhelpers.Pattern) bool {
	if hasNestedUnboundedQuantifier(pattern) || isTrimStyleAlternation(pattern) {
		return true
	}

	slow := false
	regexhelpers.Walk(pattern, func(current regexhelpers.RegexNode) {
		if slow {
			return
		}
		alternative, ok := current.(*regexhelpers.Alternative)
		if !ok {
			return
		}
		if hasSeparatedQuantifiers(alternative) || trailingUnboundedToEnd(alternative) {
			slow = true
		}
	})
	return slow
}

func reportSlowRegex(ctx rule.RuleContext, node *ast.Node) {
	ctx.ReportNode(node, buildSlowRegexMessage())
}

func checkPatternNode(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !regexbatch.ValidatePatternWithFlags(source.Pattern, source.Flags) {
		return
	}
	pattern, ok := regexhelpers.ParsePattern(source.Pattern, source.Flags)
	if !ok {
		return
	}
	if isSlowPattern(pattern) {
		reportSlowRegex(ctx, node)
	}
}

func checkStringRegexMethod(ctx rule.RuleContext, callExpr *ast.CallExpression) {
	callee := regexutil.UnwrapExpression(callExpr.Expression)
	if !ast.IsPropertyAccessExpression(callee) || !regexutil.IsStringType(ctx, callee.AsPropertyAccessExpression().Expression) {
		return
	}

	name := callee.AsPropertyAccessExpression().Name()
	if name == nil {
		return
	}
	switch name.Text() {
	case "match", "matchAll", "search":
	default:
		return
	}

	if len(callExpr.Arguments.Nodes) == 0 {
		return
	}
	if !regexutil.IsStringType(ctx, callExpr.Arguments.Nodes[0]) {
		return
	}
	patternInfo, ok := regexutil.ResolvePatternFlags(ctx, callExpr.Arguments.Nodes[0])
	if !ok || !patternInfo.FlagsKnown || !regexbatch.ValidatePatternWithFlags(patternInfo.Pattern, patternInfo.Flags) {
		return
	}

	pattern, ok := regexhelpers.ParsePattern(patternInfo.Pattern, patternInfo.Flags)
	if ok && isSlowPattern(pattern) {
		reportSlowRegex(ctx, callExpr.Arguments.Nodes[0])
	}
}

var SlowRegexRule = rule.Rule{
	Name: "slow-regex",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindRegularExpressionLiteral: func(node *ast.Node) {
				checkPatternNode(ctx, node)
			},
			ast.KindCallExpression: func(node *ast.Node) {
				checkPatternNode(ctx, node)
				checkStringRegexMethod(ctx, node.AsCallExpression())
			},
			ast.KindNewExpression: func(node *ast.Node) {
				checkPatternNode(ctx, node)
			},
		}
	},
}
