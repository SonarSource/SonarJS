package s2639_no_empty_character_class

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
)

const emptyCharacterClassMessageID = "issue"

func buildEmptyCharacterClassMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          emptyCharacterClassMessageID,
		Description: "Rework this empty character class that doesn't match anything.",
	}
}

func splitRegexLiteral(text string) (string, bool) {
	if len(text) < 2 || text[0] != '/' {
		return "", false
	}

	escaped := false
	closingSlash := -1
	for index := 1; index < len(text); index++ {
		switch {
		case escaped:
			escaped = false
		case text[index] == '\\':
			escaped = true
		case text[index] == '/':
			closingSlash = index
		}
	}

	if closingSlash <= 0 {
		return "", false
	}

	return text[1:closingSlash], true
}

func emptyCharacterClassRange(pattern string) (start int, end int, ok bool) {
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

		next := index + 1
		negated := next < len(pattern) && pattern[next] == '^'
		if negated {
			next++
		}

		if next < len(pattern) && pattern[next] == ']' {
			if !negated {
				return index, next + 1, true
			}
			index = next
			continue
		}

		classEscaped := false
		for next < len(pattern) {
			switch {
			case classEscaped:
				classEscaped = false
			case pattern[next] == '\\':
				classEscaped = true
			case pattern[next] == ']':
				index = next
				next = len(pattern)
			}
			next++
		}
	}

	return 0, 0, false
}

func regexLiteralDiagnosticRange(ctx rule.RuleContext, node *ast.Node) (core.TextRange, bool) {
	textRange := utils.TrimNodeTextRange(ctx.SourceFile, node)
	pattern, ok := splitRegexLiteral(node.AsRegularExpressionLiteral().Text)
	if !ok {
		return core.TextRange{}, false
	}

	start, end, ok := emptyCharacterClassRange(pattern)
	if !ok {
		return core.TextRange{}, false
	}

	return core.NewTextRange(textRange.Pos()+1+start, textRange.Pos()+1+end), true
}

var NoEmptyCharacterClassRule = rule.Rule{
	Name: "no-empty-character-class",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindRegularExpressionLiteral: func(node *ast.Node) {
				if !ast.IsRegularExpressionLiteral(node) {
					return
				}

				textRange, ok := regexLiteralDiagnosticRange(ctx, node)
				if !ok {
					return
				}

				ctx.ReportRange(textRange, buildEmptyCharacterClassMessage())
			},
		}
	},
}
