package no_sequences

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildUnexpectedCommaExpressionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpectedCommaExpression",
		Description: "Unexpected use of comma operator.",
	}
}

func parseAllowInParenthesesOption(options any) bool {
	switch typed := options.(type) {
	case nil:
		return true
	case map[string]any:
		if value, ok := typed["allowInParentheses"].(bool); ok {
			return value
		}
	case []any:
		if len(typed) > 0 {
			return parseAllowInParenthesesOption(typed[0])
		}
	}

	return true
}

func isCommaBinaryExpression(node *ast.Node) bool {
	return node != nil && ast.IsBinaryExpression(node) && node.AsBinaryExpression().OperatorToken.Kind == ast.KindCommaToken
}

func outermostParenthesizedSequence(node *ast.Node) *ast.Node {
	current := node
	for current.Parent != nil && ast.IsParenthesizedExpression(current.Parent) {
		current = current.Parent
	}
	return current
}

func isSequenceRoot(node *ast.Node) bool {
	return !isCommaBinaryExpression(outermostParenthesizedSequence(node).Parent)
}

func isForStatementInitOrUpdate(node *ast.Node) bool {
	outer := outermostParenthesizedSequence(node)
	parent := outer.Parent
	return ast.IsForStatement(parent) &&
		(parent.AsForStatement().Initializer == outer || parent.AsForStatement().Incrementor == outer)
}

func requiresExtraParens(node *ast.Node) bool {
	outer := outermostParenthesizedSequence(node)
	parent := outer.Parent

	switch {
	case ast.IsDoStatement(parent):
		return parent.AsDoStatement().Expression == outer
	case ast.IsIfStatement(parent):
		return parent.AsIfStatement().Expression == outer
	case ast.IsSwitchStatement(parent):
		return parent.AsSwitchStatement().Expression == outer
	case ast.IsWhileStatement(parent):
		return parent.AsWhileStatement().Expression == outer
	case ast.IsWithStatement(parent):
		return parent.AsWithStatement().Expression == outer
	case ast.IsArrowFunction(parent):
		return parent.AsArrowFunction().Body == outer
	default:
		return false
	}
}

func skipWhitespaceBackward(text string, pos int) int {
	for pos >= 0 {
		if !utils.IsStrWhiteSpace(rune(text[pos])) {
			return pos
		}
		pos--
	}
	return -1
}

func skipWhitespaceForward(text string, pos int) int {
	for pos < len(text) {
		if !utils.IsStrWhiteSpace(rune(text[pos])) {
			return pos
		}
		pos++
	}
	return len(text)
}

func parenthesizationDepth(sourceFile *ast.SourceFile, node *ast.Node) int {
	text := sourceFile.Text()
	trimmed := utils.TrimNodeTextRange(sourceFile, node)
	start := trimmed.Pos()
	end := trimmed.End()
	depth := 0

	for {
		left := skipWhitespaceBackward(text, start-1)
		right := skipWhitespaceForward(text, end)
		if left < 0 || right >= len(text) || text[left] != '(' || text[right] != ')' {
			return depth
		}

		depth++
		start = left
		end = right + 1
	}
}

func isAllowedByParentheses(sourceFile *ast.SourceFile, node *ast.Node) bool {
	depth := parenthesizationDepth(sourceFile, node)
	if requiresExtraParens(node) {
		return depth >= 2
	}
	return depth >= 1
}

func firstSequenceSegment(node *ast.Node) *ast.Node {
	segment := node.AsBinaryExpression().Left
	for isCommaBinaryExpression(segment) {
		segment = segment.AsBinaryExpression().Left
	}
	return segment
}

func firstCommaTokenRange(sourceFile *ast.SourceFile, node *ast.Node) core.TextRange {
	segment := firstSequenceSegment(node)
	s := scanner.GetScannerForSourceFile(sourceFile, segment.End())
	for token := s.Scan(); token != ast.KindEndOfFile; token = s.Scan() {
		if token == ast.KindCommaToken {
			return s.TokenRange()
		}
	}

	return scanner.GetRangeOfTokenAtPosition(sourceFile, node.AsBinaryExpression().OperatorToken.Pos())
}

var NoSequencesRule = rule.Rule{
	Name: "no-sequences",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		allowInParentheses := parseAllowInParenthesesOption(options)

		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				if !isCommaBinaryExpression(node) || !isSequenceRoot(node) {
					return
				}

				if isForStatementInitOrUpdate(node) {
					return
				}

				if allowInParentheses && isAllowedByParentheses(ctx.SourceFile, node) {
					return
				}

				ctx.ReportRange(
					firstCommaTokenRange(ctx.SourceFile, node),
					buildUnexpectedCommaExpressionMessage(),
				)
			},
		}
	},
}
