package s6323_no_empty_alternatives

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

const emptyAlternativeMessageID = "issue"

func buildEmptyAlternativeMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          emptyAlternativeMessageID,
		Description: "Remove this empty alternative.",
	}
}

func isLastEmptyInGroup(alternatives []*regexbatch.Alternative, index int, alt *regexbatch.Alternative) bool {
	return (alt.ContainerKind == regexbatch.ContainerGroup || alt.ContainerKind == regexbatch.ContainerCapturingGroup) &&
		index == len(alternatives)-1 &&
		alt.ContainerGroup != nil &&
		!alt.ContainerGroup.Quantified
}

func checkAlternatives(ctx rule.RuleContext, source *regexbatch.PatternSource, alternatives []*regexbatch.Alternative) {
	if len(alternatives) <= 1 {
		return
	}

	for index, alt := range alternatives {
		if len(alt.Elements) > 0 || isLastEmptyInGroup(alternatives, index, alt) {
			continue
		}

		pipePos := alt.PipeAfter
		if index == len(alternatives)-1 {
			pipePos = alt.PipeBefore
		}
		if pipePos < 0 {
			continue
		}

		if textRange, ok := source.ResolvePatternRange(pipePos, pipePos+1); ok {
			ctx.ReportRange(textRange, buildEmptyAlternativeMessage())
		}
	}
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !source.FlagsKnown {
		return
	}

	parsed := regexbatch.Parse(source.Pattern, source.Flags)
	checkAlternatives(ctx, source, parsed.Alternatives)
	for _, group := range parsed.Groups {
		if group.Kind != regexbatch.GroupNonCapturing && group.Kind != regexbatch.GroupCapturing {
			continue
		}
		checkAlternatives(ctx, source, group.Alternatives)
	}
}

var NoEmptyAlternativesRule = rule.Rule{
	Name: "no-empty-alternatives",
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
