package s6353_concise_regex

import (
	"fmt"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildConciseCharacterClassMessage(expected string, actual string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: fmt.Sprintf("Use concise character class syntax '%s' instead of '%s'.", expected, actual),
	}
}

func buildConciseQuantifierMessage(concise string, verbose string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: fmt.Sprintf("Use concise quantifier syntax '%s' instead of '%s'.", concise, verbose),
	}
}

func buildRemoveRedundantQuantifierMessage(quantifier string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: fmt.Sprintf("Remove redundant quantifier %s.", quantifier),
	}
}

func buildRemoveRedundantExpressionMessage(expression string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: fmt.Sprintf("Remove redundant %s.", expression),
	}
}

func classHasSet(class *regexbatch.CharacterClass, kind regexbatch.CharacterSetKind, negate bool) bool {
	for _, element := range class.Elements {
		set, ok := element.(*regexbatch.CharacterSet)
		if ok && set.Kind == kind && set.Negate == negate {
			return true
		}
	}
	return false
}

func classHasRange(class *regexbatch.CharacterClass, raw string) bool {
	for _, element := range class.Elements {
		rangeElement, ok := element.(*regexbatch.CharacterClassRange)
		if ok && rangeElement.Raw == raw {
			return true
		}
	}
	return false
}

func classHasUnderscore(class *regexbatch.CharacterClass) bool {
	for _, element := range class.Elements {
		character, ok := element.(*regexbatch.Character)
		if ok && character.Raw == "_" {
			return true
		}
	}
	return false
}

func reportCharacterClass(ctx rule.RuleContext, source *regexbatch.PatternSource, class *regexbatch.CharacterClass, message rule.RuleMessage) {
	if textRange, ok := source.ResolvePatternRange(class.Start, class.End); ok {
		ctx.ReportRange(textRange, message)
	}
}

func reportQuantifier(ctx rule.RuleContext, source *regexbatch.PatternSource, quantifier *regexbatch.Quantifier, message rule.RuleMessage) {
	start := quantifier.Start - len(quantifier.ElementRaw)
	if start < 0 {
		start = 0
	}
	if textRange, ok := source.ResolvePatternRange(start, quantifier.End); ok {
		ctx.ReportRange(textRange, message)
	}
}

func checkBulkyAnyCharacterClass(ctx rule.RuleContext, source *regexbatch.PatternSource, class *regexbatch.CharacterClass, dotAll bool) {
	if class == nil || class.Negate || len(class.Elements) != 2 {
		return
	}

	isBulkyAny := (classHasSet(class, regexbatch.CharacterSetWord, false) && classHasSet(class, regexbatch.CharacterSetWord, true)) ||
		(classHasSet(class, regexbatch.CharacterSetDigit, false) && classHasSet(class, regexbatch.CharacterSetDigit, true)) ||
		(dotAll && classHasSet(class, regexbatch.CharacterSetSpace, false) && classHasSet(class, regexbatch.CharacterSetSpace, true))
	if isBulkyAny {
		reportCharacterClass(ctx, source, class, buildConciseCharacterClassMessage(".", class.Raw))
	}
}

func checkBulkyNumericCharacterClass(ctx rule.RuleContext, source *regexbatch.PatternSource, class *regexbatch.CharacterClass) {
	if class == nil || len(class.Elements) != 1 || !classHasRange(class, "0-9") {
		return
	}

	expected := `\d`
	if class.Negate {
		expected = `\D`
	}
	reportCharacterClass(ctx, source, class, buildConciseCharacterClassMessage(expected, class.Raw))
}

func checkBulkyAlphaNumericCharacterClass(ctx rule.RuleContext, source *regexbatch.PatternSource, class *regexbatch.CharacterClass) {
	if class == nil || len(class.Elements) != 4 {
		return
	}
	if !(classHasRange(class, "0-9") && classHasRange(class, "a-z") && classHasRange(class, "A-Z") && classHasUnderscore(class)) {
		return
	}

	expected := `\w`
	if class.Negate {
		expected = `\W`
	}
	reportCharacterClass(ctx, source, class, buildConciseCharacterClassMessage(expected, class.Raw))
}

func checkBulkyQuantifier(ctx rule.RuleContext, source *regexbatch.PatternSource, quantifier *regexbatch.Quantifier) {
	if quantifier == nil {
		return
	}

	raw := quantifier.Raw
	trimmed := strings.TrimSuffix(raw, "?")
	isLazy := len(trimmed) != len(raw)

	switch {
	case trimmed == "{0,1}":
		reportQuantifier(ctx, source, quantifier, buildConciseQuantifierMessage("?", "{0,1}"))
	case trimmed == "{0,0}":
		reportQuantifier(ctx, source, quantifier, buildRemoveRedundantExpressionMessage(quantifier.ElementRaw+"{0,0}"))
	case trimmed == "{0}":
		reportQuantifier(ctx, source, quantifier, buildRemoveRedundantExpressionMessage(quantifier.ElementRaw+"{0}"))
	case trimmed == "{1,1}":
		reportQuantifier(ctx, source, quantifier, buildRemoveRedundantQuantifierMessage("{1,1}"))
	case trimmed == "{1}":
		reportQuantifier(ctx, source, quantifier, buildRemoveRedundantQuantifierMessage("{1}"))
	case trimmed == "{0,}":
		reportQuantifier(ctx, source, quantifier, buildConciseQuantifierMessage("*", "{0,}"))
	case trimmed == "{1,}":
		reportQuantifier(ctx, source, quantifier, buildConciseQuantifierMessage("+", "{1,}"))
	case quantifier.Min == quantifier.Max &&
		quantifier.Min >= 2 &&
		strings.Contains(trimmed, ",") &&
		strings.HasPrefix(trimmed, "{") &&
		strings.HasSuffix(trimmed, "}"):
		reportQuantifier(ctx, source, quantifier, buildConciseQuantifierMessage(fmt.Sprintf("{%d}", quantifier.Min), fmt.Sprintf("{%d,%d}", quantifier.Min, quantifier.Max)))
	default:
		_ = isLazy
	}
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !source.FlagsKnown {
		return
	}

	parsed := regexbatch.Parse(source.Pattern, source.Flags)
	for _, class := range parsed.CharacterClasses {
		checkBulkyAnyCharacterClass(ctx, source, class, parsed.DotAll)
		checkBulkyNumericCharacterClass(ctx, source, class)
		checkBulkyAlphaNumericCharacterClass(ctx, source, class)
	}

	for _, quantifier := range parsed.Quantifiers {
		checkBulkyQuantifier(ctx, source, quantifier)
	}
}

var ConciseRegexRule = rule.Rule{
	Name: "concise-regex",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindRegularExpressionLiteral: func(node *ast.Node) {
				runOnRegex(ctx, node)
			},
			ast.KindCallExpression: func(node *ast.Node) {
				runOnRegex(ctx, node)
			},
			ast.KindNewExpression: func(node *ast.Node) {
				runOnRegex(ctx, node)
			},
		}
	},
}
