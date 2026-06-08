package no_zero_fractions

import (
	"regexp"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var zeroFractionPattern = regexp.MustCompile(`^(?P<before>[\d_]*)(?P<dotAndFractions>\.[\d_]*)(?P<after>.*)$`)

func buildZeroFractionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "zero-fraction",
		Description: "Don't use a zero fraction in the number.",
	}
}

func buildDanglingDotMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "dangling-dot",
		Description: "Don't use a dangling dot in the number.",
	}
}

func analyzeNumberLiteral(raw string) (startOffset int, endOffset int, message rule.RuleMessage, ok bool) {
	match := zeroFractionPattern.FindStringSubmatch(raw)
	if match == nil {
		return 0, 0, rule.RuleMessage{}, false
	}

	before := match[zeroFractionPattern.SubexpIndex("before")]
	dotAndFractions := match[zeroFractionPattern.SubexpIndex("dotAndFractions")]
	after := match[zeroFractionPattern.SubexpIndex("after")]
	fixedDotAndFractions := strings.TrimRight(dotAndFractions, ".0_")
	formatted := before + fixedDotAndFractions
	if formatted == "" {
		formatted = "0"
	}
	formatted += after

	if formatted == raw {
		return 0, 0, rule.RuleMessage{}, false
	}

	endOffset = len(before) + len(dotAndFractions)
	startOffset = endOffset - (len(raw) - len(formatted))
	if dotAndFractions == "." {
		return startOffset, endOffset, buildDanglingDotMessage(), true
	}

	return startOffset, endOffset, buildZeroFractionMessage(), true
}

var NoZeroFractionsRule = rule.Rule{
	Name: "no-zero-fractions",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindNumericLiteral: func(node *ast.Node) {
				raw := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, node, false)
				startOffset, endOffset, message, ok := analyzeNumberLiteral(raw)
				if !ok {
					return
				}

				nodeRange := utils.TrimNodeTextRange(ctx.SourceFile, node)
				ctx.ReportRange(
					core.NewTextRange(nodeRange.Pos()+startOffset, nodeRange.Pos()+endOffset),
					message,
				)
			},
		}
	},
}
