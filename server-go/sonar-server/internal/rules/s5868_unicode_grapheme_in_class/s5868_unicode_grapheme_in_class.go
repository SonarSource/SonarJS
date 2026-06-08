package s5868_unicode_grapheme_in_class

import (
	"fmt"
	"regexp"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	regexhelpers "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regex_batch_helpers"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

var combiningCharacterRegexp = regexp.MustCompile(`^[\p{Mc}\p{Me}\p{Mn}]$`)

func isCombiningCharacter(value int) bool {
	return combiningCharacterRegexp.MatchString(string(rune(value)))
}

func isSurrogatePair(lead int, tail int) bool {
	return lead >= 0xd800 && lead < 0xdc00 && tail >= 0xdc00 && tail < 0xe000
}

func isEmojiModifier(value int) bool {
	return value >= 0x1f3fb && value <= 0x1f3ff
}

func isRegionalIndicator(value int) bool {
	return value >= 0x1f1e6 && value <= 0x1f1ff
}

func isZeroWidthJoiner(value int) bool {
	return value == 0x200d
}

func rawSlice(pattern string, node regexhelpers.RegexNode) string {
	start, end := node.Span()
	if start < 0 || end < start || end > len(pattern) {
		return ""
	}
	return pattern[start:end]
}

func reportCharacterIssue(
	ctx rule.RuleContext,
	source *regexbatch.PatternSource,
	node regexhelpers.RegexNode,
	message string,
) bool {
	start, end := node.Span()
	textRange, ok := source.ResolvePatternRange(start, end)
	if !ok {
		return false
	}

	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:   textRange,
		Message: rule.RuleMessage{Id: "issue", Description: message},
	})
	return true
}

func characterSequences(elements []regexhelpers.ClassElement) [][]*regexhelpers.Character {
	current := []*regexhelpers.Character{}
	sequences := [][]*regexhelpers.Character{current}

	for _, element := range elements {
		switch typed := element.(type) {
		case *regexhelpers.Character:
			current = append(current, typed)
			sequences[len(sequences)-1] = current
		case *regexhelpers.CharacterClassRange:
			current = append(current, typed.Min)
			sequences[len(sequences)-1] = current
			current = []*regexhelpers.Character{typed.Max}
			sequences = append(sequences, current)
		case *regexhelpers.CharacterSet:
			if len(current) > 0 {
				current = []*regexhelpers.Character{}
				sequences = append(sequences, current)
			}
		}
	}

	return sequences
}

func checkSequence(ctx rule.RuleContext, source *regexbatch.PatternSource, unicode bool, chars []*regexhelpers.Character) {
	for index := 0; index < len(chars); index++ {
		character := chars[index]

		if index > 0 && isCombiningCharacter(character.Value) && !isCombiningCharacter(chars[index-1].Value) {
			combined := rawSlice(source.Pattern, chars[index-1]) + rawSlice(source.Pattern, character)
			if reportCharacterIssue(ctx, source, character, fmt.Sprintf("Move this Unicode combined character '%s' outside of the character class", combined)) {
				return
			}
		}

		if index > 0 && index < len(chars)-1 && isZeroWidthJoiner(character.Value) &&
			!isZeroWidthJoiner(chars[index-1].Value) && !isZeroWidthJoiner(chars[index+1].Value) {
			if reportCharacterIssue(ctx, source, chars[index-1], "Move this Unicode joined character sequence outside of the character class") {
				return
			}
		}

		if index > 0 && isEmojiModifier(character.Value) && !isEmojiModifier(chars[index-1].Value) {
			modified := rawSlice(source.Pattern, chars[index-1]) + rawSlice(source.Pattern, character)
			if reportCharacterIssue(ctx, source, character, fmt.Sprintf("Move this Unicode modified Emoji '%s' outside of the character class", modified)) {
				return
			}
		}

		if index > 0 && isRegionalIndicator(character.Value) && isRegionalIndicator(chars[index-1].Value) {
			indicator := rawSlice(source.Pattern, chars[index-1]) + rawSlice(source.Pattern, character)
			if reportCharacterIssue(ctx, source, character, fmt.Sprintf("Move this Unicode regional indicator '%s' outside of the character class", indicator)) {
				return
			}
		}

		if !unicode && index > 0 && isSurrogatePair(chars[index-1].Value, character.Value) {
			surrogate := rawSlice(source.Pattern, chars[index-1]) + rawSlice(source.Pattern, character)
			if reportCharacterIssue(ctx, source, character, fmt.Sprintf("Move this Unicode surrogate pair '%s' outside of the character class or use 'u' flag", surrogate)) {
				return
			}
		}
	}
}

func runOnUnicodeClassRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !regexbatch.ValidatePatternWithFlags(source.Pattern, source.Flags) {
		return
	}

	pattern, ok := regexhelpers.ParsePattern(source.Pattern, source.Flags)
	if !ok {
		return
	}

	unicode := regexhelpers.Flags{Unicode: true}.Unicode && (containsRune(source.Flags, 'u') || containsRune(source.Flags, 'v'))
	regexhelpers.Walk(pattern, func(current regexhelpers.RegexNode) {
		characterClass, ok := current.(*regexhelpers.CharacterClass)
		if !ok {
			return
		}
		for _, sequence := range characterSequences(characterClass.Elements) {
			checkSequence(ctx, source, unicode, sequence)
		}
	})
}

func containsRune(text string, want rune) bool {
	for _, current := range text {
		if current == want {
			return true
		}
	}
	return false
}

var UnicodeGraphemeInClassRule = rule.Rule{
	Name: "no-misleading-character-class",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindRegularExpressionLiteral: func(node *ast.Node) {
				runOnUnicodeClassRegex(ctx, node)
			},
			ast.KindCallExpression: func(node *ast.Node) {
				runOnUnicodeClassRegex(ctx, node)
			},
			ast.KindNewExpression: func(node *ast.Node) {
				runOnUnicodeClassRegex(ctx, node)
			},
		}
	},
}
