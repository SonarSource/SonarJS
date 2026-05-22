package s6326_no_regex_spaces

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexutil"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
)

func buildNoRegexSpacesMessage(quantifier string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: fmt.Sprintf("If multiple spaces are required here, use number quantifier (%s).", quantifier),
	}
}

func buildNoRegexSpacesSuggestion(quantifier string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "suggest",
		Description: fmt.Sprintf("Use quantifier %s", quantifier),
	}
}

func reportRun(ctx rule.RuleContext, patternRange core.TextRange, runStart int, runEnd int) {
	spaceCount := runEnd - runStart
	if spaceCount <= 1 {
		return
	}

	quantifier := fmt.Sprintf("{%d}", spaceCount)
	textRange := core.NewTextRange(patternRange.Pos()+runStart, patternRange.Pos()+runEnd)
	ctx.ReportRangeWithSuggestions(textRange, buildNoRegexSpacesMessage(quantifier), func() []rule.RuleSuggestion {
		return []rule.RuleSuggestion{{
			Message: buildNoRegexSpacesSuggestion(quantifier),
			FixesArr: []rule.RuleFix{
				rule.RuleFixReplaceRange(textRange, " "+quantifier),
			},
		}}
	})
}

var NoRegexSpacesRule = rule.Rule{
	Name: "no-regex-spaces",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindRegularExpressionLiteral: func(node *ast.Node) {
				patternRange, pattern, _, ok := regexutil.RegexPatternTextRange(ctx.SourceFile, node)
				if !ok {
					return
				}

				inCharacterClass := false
				escaped := false
				runStart := -1
				for index := 0; index < len(pattern); index++ {
					ch := pattern[index]
					if escaped {
						escaped = false
						if runStart >= 0 {
							reportRun(ctx, patternRange, runStart, index)
							runStart = -1
						}
						continue
					}

					switch ch {
					case '\\':
						escaped = true
						if runStart >= 0 {
							reportRun(ctx, patternRange, runStart, index)
							runStart = -1
						}
					case '[':
						inCharacterClass = true
						if runStart >= 0 {
							reportRun(ctx, patternRange, runStart, index)
							runStart = -1
						}
					case ']':
						inCharacterClass = false
						if runStart >= 0 {
							reportRun(ctx, patternRange, runStart, index)
							runStart = -1
						}
					case ' ':
						if inCharacterClass {
							if runStart >= 0 {
								reportRun(ctx, patternRange, runStart, index)
								runStart = -1
							}
							continue
						}
						if runStart < 0 {
							runStart = index
						}
					default:
						if runStart >= 0 {
							reportRun(ctx, patternRange, runStart, index)
							runStart = -1
						}
					}
				}

				if runStart >= 0 {
					reportRun(ctx, patternRange, runStart, len(pattern))
				}
			},
		}
	},
}
