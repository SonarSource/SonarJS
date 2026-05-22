package s6397_single_char_in_character_classes

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexutil"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
)

var characterClassExceptions = map[string]struct{}{
	"[":  {},
	"{":  {},
	"(":  {},
	".":  {},
	"?":  {},
	"+":  {},
	"*":  {},
	"$":  {},
	"^":  {},
	`\\`: {},
}

func buildSingleCharClassMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: "Replace this character class by the character itself.",
	}
}

func hasUnescapedRange(content string) bool {
	for index := 0; index < len(content); index++ {
		if content[index] != '-' || regexutil.IsEscapedAt(content, index) {
			continue
		}
		if index > 0 && index < len(content)-1 {
			return true
		}
	}
	return false
}

func consumeCharacterClassToken(content string, start int) (raw string, next int) {
	if start >= len(content) {
		return "", start
	}
	if content[start] != '\\' {
		return content[start : start+1], start + 1
	}

	if start+1 >= len(content) {
		return `\`, start + 1
	}

	switch content[start+1] {
	case 'u':
		if start+2 < len(content) && content[start+2] == '{' {
			end := start + 3
			for end < len(content) && content[end] != '}' {
				end++
			}
			if end < len(content) {
				return content[start : end+1], end + 1
			}
			return content[start:], len(content)
		}
		end := start + 2
		for end < len(content) && end < start+6 {
			end++
		}
		return content[start:end], end
	case 'x':
		end := start + 2
		for end < len(content) && end < start+4 {
			end++
		}
		return content[start:end], end
	case 'p', 'P':
		if start+2 < len(content) && content[start+2] == '{' {
			end := start + 3
			for end < len(content) && content[end] != '}' {
				end++
			}
			if end < len(content) {
				return content[start : end+1], end + 1
			}
			return content[start:], len(content)
		}
	}

	return content[start : start+2], start + 2
}

func isSingleForbiddenCharacterClass(content string) bool {
	if content == "" || hasUnescapedRange(content) {
		return false
	}

	tokens := make([]string, 0, 2)
	for index := 0; index < len(content); {
		token, next := consumeCharacterClassToken(content, index)
		tokens = append(tokens, token)
		index = next
	}

	if len(tokens) != 1 {
		return false
	}

	_, ok := characterClassExceptions[tokens[0]]
	return !ok
}

func reportSingleCharClass(ctx rule.RuleContext, patternRange core.TextRange, start int, end int) {
	ctx.ReportRange(core.NewTextRange(patternRange.Pos()+start, patternRange.Pos()+end), buildSingleCharClassMessage())
}

var SingleCharInCharacterClassesRule = rule.Rule{
	Name: "single-char-in-character-classes",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindRegularExpressionLiteral: func(node *ast.Node) {
				patternRange, pattern, _, ok := regexutil.RegexPatternTextRange(ctx.SourceFile, node)
				if !ok {
					return
				}

				escaped := false
				for index := 0; index < len(pattern); index++ {
					switch {
					case escaped:
						escaped = false
						continue
					case pattern[index] == '\\':
						escaped = true
						continue
					case pattern[index] != '[':
						continue
					}

					classStart := index
					index++
					if index >= len(pattern) {
						return
					}

					negated := pattern[index] == '^'
					if negated {
						index++
					}

					contentStart := index
					classEscaped := false
					for index < len(pattern) {
						switch {
						case classEscaped:
							classEscaped = false
						case pattern[index] == '\\':
							classEscaped = true
						case pattern[index] == ']':
							content := pattern[contentStart:index]
							if !negated && isSingleForbiddenCharacterClass(content) {
								reportSingleCharClass(ctx, patternRange, classStart, index+1)
							}
							goto nextClass
						}
						index++
					}
					return

				nextClass:
				}
			},
		}
	},
}
