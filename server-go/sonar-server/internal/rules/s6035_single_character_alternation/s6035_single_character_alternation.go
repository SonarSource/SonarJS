package s6035_single_character_alternation

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

const singleCharacterAlternationMessageID = "issue"

func buildSingleCharacterAlternationMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          singleCharacterAlternationMessageID,
		Description: "Replace this alternation with a character class.",
	}
}

func isSingleCharacterAlternation(alternatives []*regexbatch.Alternative) bool {
	if len(alternatives) <= 1 {
		return false
	}

	for _, alternative := range alternatives {
		if len(alternative.Elements) != 1 {
			return false
		}
		if _, ok := alternative.Elements[0].(*regexbatch.Character); !ok {
			return false
		}
	}

	return true
}

func reportAlternation(
	ctx rule.RuleContext,
	source *regexbatch.PatternSource,
	start int,
	end int,
) {
	if textRange, ok := source.ResolvePatternRange(start, end); ok {
		ctx.ReportRange(textRange, buildSingleCharacterAlternationMessage())
	}
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok {
		return
	}

	parsed := regexbatch.Parse(source.Pattern, source.Flags)
	if isSingleCharacterAlternation(parsed.Alternatives) {
		reportAlternation(ctx, source, 0, len(source.Pattern))
	}

	for _, group := range parsed.Groups {
		if !isSingleCharacterAlternation(group.Alternatives) {
			continue
		}
		reportAlternation(ctx, source, group.Start, group.End)
	}
}

var SingleCharacterAlternationRule = rule.Rule{
	Name: "single-character-alternation",
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
