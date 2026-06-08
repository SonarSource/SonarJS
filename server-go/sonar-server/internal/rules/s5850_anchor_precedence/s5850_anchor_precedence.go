package s5850_anchor_precedence

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

const anchorPrecedenceMessageID = "issue"

func buildAnchorPrecedenceMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          anchorPrecedenceMessageID,
		Description: "Group parts of the regex together to make the intended operator precedence explicit.",
	}
}

func isAnchor(alternative *regexbatch.Alternative, raw string) bool {
	if alternative == nil || len(alternative.Elements) == 0 {
		return false
	}

	index := 0
	if raw == "$" {
		index = len(alternative.Elements) - 1
	}

	anchor, ok := alternative.Elements[index].(*regexbatch.SimpleElement)
	return ok && anchor.Raw == raw
}

func notAnchoredElseWhere(alternatives []*regexbatch.Alternative) bool {
	if isAnchor(alternatives[0], "$") || isAnchor(alternatives[len(alternatives)-1], "^") {
		return false
	}

	for _, alternative := range alternatives[1 : len(alternatives)-1] {
		if isAnchor(alternative, "^") || isAnchor(alternative, "$") {
			return false
		}
	}

	return true
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok {
		return
	}

	alternatives := regexbatch.Parse(source.Pattern, source.Flags).Alternatives
	if len(alternatives) < 2 {
		return
	}

	if len(alternatives) == 2 && isAnchor(alternatives[0], "^") && isAnchor(alternatives[1], "$") {
		return
	}

	if (isAnchor(alternatives[0], "^") || isAnchor(alternatives[len(alternatives)-1], "$")) &&
		notAnchoredElseWhere(alternatives) {
		if textRange, ok := source.ResolvePatternRange(0, len(source.Pattern)); ok {
			ctx.ReportRange(textRange, buildAnchorPrecedenceMessage())
		}
	}
}

var AnchorPrecedenceRule = rule.Rule{
	Name: "anchor-precedence",
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
