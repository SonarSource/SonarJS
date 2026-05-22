package s5867_unicode_aware_regex

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexutil"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
)

const unicodeAwareRegexMessageID = "issue"

func buildUnicodeAwareRegexMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          unicodeAwareRegexMessageID,
		Description: "Enable the 'u' flag for this regex using Unicode constructs.",
	}
}

type labeledPatternRange struct {
	start int
	end   int
	label string
}

func isASCIIAlpha(ch byte) bool {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}

func parseUnicodeCharacterConstruct(pattern string, start int) (end int, ok bool) {
	if start+4 >= len(pattern) || !strings.HasPrefix(pattern[start:], `\u{`) {
		return 0, false
	}

	end = start + 3
	for end < len(pattern) && regexutil.IsEscapedAt(pattern, end) {
		end++
	}

	digitsStart := end
	for end < len(pattern) {
		ch := pattern[end]
		if ch == '}' {
			break
		}
		if !((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')) {
			return 0, false
		}
		end++
	}

	if end >= len(pattern) || pattern[end] != '}' {
		return 0, false
	}

	digitCount := end - digitsStart
	if digitCount != 4 && digitCount != 5 {
		return 0, false
	}

	return end + 1, true
}

func parseUnicodePropertyConstruct(pattern string, start int) (end int, ok bool) {
	if start+3 >= len(pattern) || pattern[start] != '\\' {
		return 0, false
	}
	if pattern[start+1] != 'p' && pattern[start+1] != 'P' {
		return 0, false
	}
	if pattern[start+2] != '{' {
		return 0, false
	}

	index := start + 3
	if index >= len(pattern) || !isASCIIAlpha(pattern[index]) {
		return 0, false
	}
	for index < len(pattern) && isASCIIAlpha(pattern[index]) {
		index++
	}
	if index >= len(pattern) {
		return 0, false
	}
	if pattern[index] == '}' {
		return index + 1, true
	}
	if pattern[index] != '=' {
		return 0, false
	}

	index++
	if index >= len(pattern) || !isASCIIAlpha(pattern[index]) {
		return 0, false
	}
	for index < len(pattern) && isASCIIAlpha(pattern[index]) {
		index++
	}
	if index >= len(pattern) || pattern[index] != '}' {
		return 0, false
	}

	return index + 1, true
}

func collectUnicodeConstructs(source *regexbatch.PatternSource) []labeledPatternRange {
	pattern := source.Pattern
	ranges := make([]labeledPatternRange, 0, 4)

	for index := 0; index < len(pattern); index++ {
		if pattern[index] != '\\' || regexutil.IsEscapedAt(pattern, index) {
			continue
		}

		if end, ok := parseUnicodePropertyConstruct(pattern, index); ok {
			ranges = append(ranges, labeledPatternRange{
				start: index,
				end:   end,
				label: "Unicode property",
			})
			index = end - 1
			continue
		}

		if end, ok := parseUnicodeCharacterConstruct(pattern, index); ok {
			ranges = append(ranges, labeledPatternRange{
				start: index,
				end:   end,
				label: "Unicode character",
			})
			index = end - 1
		}
	}

	return ranges
}

func adjustUnicodePropertyRange(
	sourceFile *ast.SourceFile,
	node *ast.Node,
	construct labeledPatternRange,
	textRange core.TextRange,
) core.TextRange {
	if construct.label != "Unicode property" || sourceFile == nil || node == nil || !ast.IsRegularExpressionLiteral(node) {
		return textRange
	}

	text := sourceFile.Text()
	if textRange.End() >= len(text) || text[textRange.End()] != '/' {
		return textRange
	}

	return core.NewTextRange(textRange.Pos(), textRange.End()+1)
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !source.FlagsKnown {
		return
	}
	if strings.Contains(source.Flags, "u") || strings.Contains(source.Flags, "v") {
		return
	}

	constructs := collectUnicodeConstructs(source)
	if len(constructs) == 0 {
		return
	}

	labeledRanges := make([]rule.RuleLabeledRange, 0, len(constructs))
	for _, construct := range constructs {
		textRange, ok := source.ResolvePatternRange(construct.start, construct.end)
		if !ok {
			continue
		}
		textRange = adjustUnicodePropertyRange(ctx.SourceFile, node, construct, textRange)
		labeledRanges = append(labeledRanges, rule.RuleLabeledRange{
			Label: construct.label,
			Range: textRange,
		})
	}
	if len(labeledRanges) == 0 {
		return
	}

	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:         utils.TrimNodeTextRange(ctx.SourceFile, node),
		RuleName:      "unicode-aware-regex",
		Message:       buildUnicodeAwareRegexMessage(),
		SourceFile:    ctx.SourceFile,
		LabeledRanges: labeledRanges,
	})
}

var UnicodeAwareRegexRule = rule.Rule{
	Name: "unicode-aware-regex",
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
