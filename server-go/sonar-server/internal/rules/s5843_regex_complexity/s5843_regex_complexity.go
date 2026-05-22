package s5843_regex_complexity

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	regexhelpers "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regex_batch_helpers"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexutil"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
)

const (
	regexComplexityMessageID = "issue"
	defaultThreshold         = 20
)

type complexitySource interface {
	PatternText() string
	FlagsText() string
	ContentRange() core.TextRange
	Resolve(start int, end int) (core.TextRange, bool)
}

type mappedComplexitySource struct {
	source *regexbatch.PatternSource
}

func (m mappedComplexitySource) PatternText() string {
	return m.source.Pattern
}

func (m mappedComplexitySource) FlagsText() string {
	return m.source.Flags
}

func (m mappedComplexitySource) ContentRange() core.TextRange {
	return m.source.ContentRange()
}

func (m mappedComplexitySource) Resolve(start int, end int) (core.TextRange, bool) {
	return m.source.ResolvePatternRange(start, end)
}

type fallbackComplexitySource struct {
	pattern string
	node    *ast.Node
	file    *ast.SourceFile
}

func (f fallbackComplexitySource) PatternText() string {
	return f.pattern
}

func (f fallbackComplexitySource) FlagsText() string {
	return ""
}

func (f fallbackComplexitySource) ContentRange() core.TextRange {
	return utils.TrimNodeTextRange(f.file, f.node)
}

func (f fallbackComplexitySource) Resolve(start int, end int) (core.TextRange, bool) {
	return utils.TrimNodeTextRange(f.file, f.node), true
}

type complexityComponent struct {
	start     int
	end       int
	increment int
}

type complexityCalculator struct {
	source     complexitySource
	nesting    int
	complexity int
	components []complexityComponent
}

func (c *complexityCalculator) add(increment int, node regexhelpers.RegexNode) {
	start, end := node.Span()
	c.addSpan(increment, start, end)
}

func (c *complexityCalculator) addSpan(increment int, start int, end int) {
	c.complexity += increment
	c.components = append(c.components, complexityComponent{
		start:     start,
		end:       end,
		increment: increment,
	})
}

func (c *complexityCalculator) visitPattern(pattern *regexhelpers.Pattern) {
	c.visitAlternatives(pattern.Alternatives)
	c.visitBackreferences()
}

func (c *complexityCalculator) visitAlternatives(alternatives []*regexhelpers.Alternative) {
	if len(alternatives) > 1 {
		increment := c.nesting
		for _, alternative := range alternatives[1:] {
			start, end := alternative.Span()
			c.addSpan(increment, start, end)
			increment = 1
		}
		c.nesting++
		defer func() {
			c.nesting--
		}()
	}

	for _, alternative := range alternatives {
		c.visitAlternative(alternative)
	}
}

func (c *complexityCalculator) visitAlternative(alternative *regexhelpers.Alternative) {
	for _, element := range alternative.Elements {
		c.visitElement(element)
	}
}

func (c *complexityCalculator) visitElement(element regexhelpers.Element) {
	switch typed := element.(type) {
	case *regexhelpers.Group:
		c.visitAlternatives(typed.Alternatives)
	case *regexhelpers.Assertion:
		switch typed.Kind {
		case regexhelpers.AssertionLookahead,
			regexhelpers.AssertionNegativeLookahead,
			regexhelpers.AssertionLookbehind,
			regexhelpers.AssertionNegativeLookbehind:
			c.add(c.nesting, typed)
			c.nesting++
			c.visitAlternatives(typed.Alternatives)
			c.nesting--
		}
	case *regexhelpers.CharacterClass:
		c.add(1, typed)
	case *regexhelpers.Quantifier:
		c.add(c.nesting, typed)
		c.nesting++
		c.visitElement(typed.Element)
		c.nesting--
	}
}

func (c *complexityCalculator) visitBackreferences() {
	for _, backreference := range scanBackreferences(c.source.PatternText()) {
		c.addSpan(1, backreference.start, backreference.end)
	}
}

type backreferenceSpan struct {
	start int
	end   int
}

func scanBackreferences(pattern string) []backreferenceSpan {
	refs := []backreferenceSpan{}
	inCharacterClass := false
	escaped := false

	for index := 0; index < len(pattern); index++ {
		switch {
		case escaped:
			escaped = false
			continue
		case pattern[index] == '\\':
			if inCharacterClass || index+1 >= len(pattern) {
				escaped = true
				continue
			}
			switch next := pattern[index+1]; {
			case next >= '1' && next <= '9':
				end := index + 2
				for end < len(pattern) && pattern[end] >= '0' && pattern[end] <= '9' {
					end++
				}
				refs = append(refs, backreferenceSpan{start: index, end: end})
				index = end - 1
				continue
			case next == 'k' && index+2 < len(pattern) && pattern[index+2] == '<':
				end := index + 3
				for end < len(pattern) && pattern[end] != '>' {
					end++
				}
				if end < len(pattern) {
					refs = append(refs, backreferenceSpan{start: index, end: end + 1})
					index = end
					continue
				}
			}
			escaped = true
		case pattern[index] == '[':
			inCharacterClass = true
		case pattern[index] == ']' && inCharacterClass:
			inCharacterClass = false
		}
	}

	return refs
}

func buildRegexComplexityMessage(complexity int, threshold int) rule.RuleMessage {
	return rule.RuleMessage{
		Id: regexComplexityMessageID,
		Description: fmt.Sprintf(
			"Simplify this regular expression to reduce its complexity from %d to the %d allowed.",
			complexity,
			threshold,
		),
	}
}

func buildSecondaryLabel(increment int) string {
	if increment <= 1 {
		return "+1"
	}
	return fmt.Sprintf("+%d (incl %d for nesting)", increment, increment-1)
}

func secondaryRanges(source complexitySource, components []complexityComponent) []rule.RuleLabeledRange {
	labels := make([]rule.RuleLabeledRange, 0, len(components))
	for _, component := range components {
		textRange, ok := source.Resolve(component.start, component.end)
		if !ok || textRange.Len() == 0 {
			continue
		}
		labels = append(labels, rule.RuleLabeledRange{
			Label: buildSecondaryLabel(component.increment),
			Range: textRange,
		})
	}
	return labels
}

func thresholdFromOptions(options any) int {
	optionMap, ok := options.(map[string]any)
	if !ok {
		return defaultThreshold
	}
	value, ok := optionMap["threshold"]
	if !ok {
		return defaultThreshold
	}
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	default:
		return defaultThreshold
	}
}

func checkResolvedPattern(ctx rule.RuleContext, source complexitySource, threshold int) {
	pattern, ok := regexhelpers.ParsePattern(source.PatternText(), source.FlagsText())
	if !ok {
		return
	}

	calculator := complexityCalculator{
		source:  source,
		nesting: 1,
	}
	calculator.visitPattern(pattern)
	if calculator.complexity <= threshold {
		return
	}

	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:         source.ContentRange(),
		Message:       buildRegexComplexityMessage(calculator.complexity, threshold),
		LabeledRanges: secondaryRanges(source, calculator.components),
	})
}

func checkRegexNode(ctx rule.RuleContext, node *ast.Node, threshold int) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !regexbatch.ValidatePatternWithFlags(source.Pattern, source.Flags) {
		return
	}
	checkResolvedPattern(ctx, mappedComplexitySource{source: source}, threshold)
}

func isStringRegexMethodCall(ctx rule.RuleContext, callExpr *ast.CallExpression) bool {
	callee := regexutil.UnwrapExpression(callExpr.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}

	name := callee.AsPropertyAccessExpression().Name()
	if name == nil || !regexutil.IsStringType(ctx, callee.AsPropertyAccessExpression().Expression) {
		return false
	}

	switch name.Text() {
	case "match", "matchAll", "replace", "replaceAll", "search", "split":
		return len(callExpr.Arguments.Nodes) > 0
	default:
		return false
	}
}

func checkStringRegexMethod(ctx rule.RuleContext, callExpr *ast.CallExpression, threshold int) {
	if !isStringRegexMethodCall(ctx, callExpr) {
		return
	}

	patternInfo, ok := regexutil.ResolvePatternFlags(ctx, callExpr.Arguments.Nodes[0])
	if !ok || !patternInfo.FlagsKnown || !regexbatch.ValidatePatternWithFlags(patternInfo.Pattern, patternInfo.Flags) {
		return
	}

	checkResolvedPattern(ctx, fallbackComplexitySource{
		pattern: patternInfo.Pattern,
		node:    callExpr.Arguments.Nodes[0],
		file:    ctx.SourceFile,
	}, threshold)
}

var RegexComplexityRule = rule.Rule{
	Name: "regex-complexity",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		threshold := thresholdFromOptions(options)
		return rule.RuleListeners{
			ast.KindRegularExpressionLiteral: func(node *ast.Node) {
				checkRegexNode(ctx, node, threshold)
			},
			ast.KindCallExpression: func(node *ast.Node) {
				checkRegexNode(ctx, node, threshold)
				checkStringRegexMethod(ctx, node.AsCallExpression(), threshold)
			},
			ast.KindNewExpression: func(node *ast.Node) {
				checkRegexNode(ctx, node, threshold)
			},
		}
	},
}
