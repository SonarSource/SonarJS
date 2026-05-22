package s6324_no_control_regex

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

const (
	maxControlCharCode = 0x1f
	escCode            = 0x1b
	belCode            = 0x07
	leftBracketCode    = 0x5b
	rightBracketCode   = 0x5d
)

var controlCharExceptions = map[string]struct{}{
	`\t`: {},
	`\n`: {},
}

func buildControlCharMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: "Remove this control character.",
	}
}

func isSameInterpreted(raw string, value int) bool {
	if raw == "" {
		return false
	}
	return int([]rune(raw)[0]) == value
}

func isCharacterClassRangeBoundary(character *regexbatch.Character) bool {
	return character != nil && character.Range != nil
}

func isInCharacterClassWithControlCharRange(character *regexbatch.Character) bool {
	if character == nil || character.Class == nil {
		return false
	}

	for _, element := range character.Class.Elements {
		rangeElement, ok := element.(*regexbatch.CharacterClassRange)
		if !ok || rangeElement.Min == nil {
			continue
		}
		if rangeElement.Min.Value <= maxControlCharCode {
			return true
		}
	}

	return false
}

func elementIndex(elements []regexbatch.Element, target *regexbatch.Character) int {
	for index, element := range elements {
		character, ok := element.(*regexbatch.Character)
		if ok && character == target {
			return index
		}
	}
	return -1
}

func isAnsiSequenceStart(character *regexbatch.Character) bool {
	if character == nil || character.Value != escCode || character.Alternative == nil {
		return false
	}

	elements := character.Alternative.Elements
	index := elementIndex(elements, character)
	if index < 0 || index >= len(elements)-1 {
		return false
	}

	next, ok := elements[index+1].(*regexbatch.Character)
	if !ok {
		return false
	}
	return next.Value == leftBracketCode || next.Value == rightBracketCode
}

func isOscTerminator(character *regexbatch.Character) bool {
	if character == nil || character.Value != belCode || character.Alternative == nil {
		return false
	}

	elements := character.Alternative.Elements
	index := elementIndex(elements, character)
	for index > 1 {
		current, okCurrent := elements[index-1].(*regexbatch.Character)
		previous, okPrevious := elements[index-2].(*regexbatch.Character)
		if okCurrent && okPrevious && current.Value == rightBracketCode && previous.Value == escCode {
			return true
		}
		index--
	}

	return false
}

func shouldReportControlCharacter(character *regexbatch.Character) bool {
	if character == nil || character.Value < 0 || character.Value > maxControlCharCode {
		return false
	}
	if !(isSameInterpreted(character.Raw, character.Value) ||
		strings.HasPrefix(character.Raw, `\x`) ||
		strings.HasPrefix(character.Raw, `\u`)) {
		return false
	}
	if _, ok := controlCharExceptions[character.Raw]; ok {
		return false
	}
	if isCharacterClassRangeBoundary(character) ||
		isInCharacterClassWithControlCharRange(character) ||
		isAnsiSequenceStart(character) ||
		isOscTerminator(character) {
		return false
	}
	return true
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !source.FlagsKnown {
		return
	}

	for _, character := range regexbatch.Parse(source.Pattern, source.Flags).Characters {
		if !shouldReportControlCharacter(character) {
			continue
		}
		if textRange, ok := source.ResolvePatternRange(character.Start, character.End); ok {
			ctx.ReportRange(textRange, buildControlCharMessage())
		}
	}
}

var NoControlRegexRule = rule.Rule{
	Name: "no-control-regex",
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
