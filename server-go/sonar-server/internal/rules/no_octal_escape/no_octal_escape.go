package no_octal_escape

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildOctalEscapeSequenceMessage(sequence string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "octalEscapeSequence",
		Description: "Don't use octal: '\\" + sequence + "'. Use '\\u....' instead.",
	}
}

func findOctalEscapeSequence(sourceFile *ast.SourceFile, node *ast.Node) (string, bool) {
	raw := scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, node, false)
	for index := 0; index < len(raw); index++ {
		if raw[index] != '\\' || index+1 >= len(raw) {
			continue
		}

		if sequence, ok := octalEscapeSequenceAt(raw, index+1); ok {
			return sequence, true
		}

		index++
	}
	return "", false
}

func octalEscapeSequenceAt(raw string, index int) (string, bool) {
	if index >= len(raw) {
		return "", false
	}

	first := raw[index]
	switch {
	case first >= '0' && first <= '3':
		end := index + 1
		for end < len(raw) && end < index+3 && raw[end] >= '0' && raw[end] <= '7' {
			end++
		}
		if end > index+1 {
			return raw[index:end], true
		}
		if first == '0' {
			if end < len(raw) && (raw[end] == '8' || raw[end] == '9') {
				return raw[index : index+1], true
			}
			return "", false
		}
		return raw[index : index+1], true
	case first >= '4' && first <= '7':
		if index+1 < len(raw) && raw[index+1] >= '0' && raw[index+1] <= '7' {
			return raw[index : index+2], true
		}
		return raw[index : index+1], true
	default:
		return "", false
	}
}

var NoOctalEscapeRule = rule.Rule{
	Name: "no-octal-escape",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindStringLiteral: func(node *ast.Node) {
				if sequence, ok := findOctalEscapeSequence(ctx.SourceFile, node); ok {
					ctx.ReportNode(node, buildOctalEscapeSequenceMessage(sequence))
				}
			},
		}
	},
}
