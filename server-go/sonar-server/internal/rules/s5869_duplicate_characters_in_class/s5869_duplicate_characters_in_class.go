package s5869_duplicate_characters_in_class

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	regexhelpers "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regex_batch_helpers"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

const duplicateCharactersMessageID = "issue"

func buildDuplicateCharactersMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          duplicateCharactersMessageID,
		Description: "Remove duplicates in this character class.",
	}
}

func regexFlags(flags string) regexhelpers.Flags {
	return regexhelpers.Flags{
		IgnoreCase: strings.Contains(flags, "i"),
		Unicode:    strings.Contains(flags, "u") || strings.Contains(flags, "v"),
	}
}

func reportDuplicates(ctx rule.RuleContext, source *regexbatch.PatternSource, duplicates []regexhelpers.RegexNode) {
	if len(duplicates) == 0 {
		return
	}

	start, end := duplicates[0].Span()
	primaryRange, ok := source.ResolvePatternRange(start, end)
	if !ok {
		return
	}

	secondaries := make([]rule.RuleLabeledRange, 0, len(duplicates)-1)
	for _, duplicate := range duplicates[1:] {
		start, end := duplicate.Span()
		secondaryRange, ok := source.ResolvePatternRange(start, end)
		if !ok || secondaryRange.Len() == 0 {
			continue
		}
		secondaries = append(secondaries, rule.RuleLabeledRange{
			Label: "Additional duplicate",
			Range: secondaryRange,
		})
	}

	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:         primaryRange,
		Message:       buildDuplicateCharactersMessage(),
		LabeledRanges: secondaries,
	})
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !source.FlagsKnown || !regexbatch.ValidatePatternWithFlags(source.Pattern, source.Flags) {
		return
	}

	pattern, ok := regexhelpers.ParsePattern(source.Pattern, source.Flags)
	if !ok {
		return
	}

	flags := regexFlags(source.Flags)
	regexhelpers.Walk(pattern, func(current regexhelpers.RegexNode) {
		characterClass, ok := current.(*regexhelpers.CharacterClass)
		if !ok {
			return
		}
		reportDuplicates(ctx, source, regexhelpers.DuplicateCharacterClassElements(characterClass, flags))
	})
}

var DuplicateCharactersInClassRule = rule.Rule{
	Name: "duplicates-in-character-class",
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
