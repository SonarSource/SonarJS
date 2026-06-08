package s6331_no_empty_group

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

const emptyGroupMessageID = "issue"

func buildEmptyGroupMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          emptyGroupMessageID,
		Description: "Remove this empty group.",
	}
}

func reportEmptyGroup(ctx rule.RuleContext, source *regexbatch.PatternSource, start int, end int) {
	if textRange, ok := source.ResolvePatternRange(start, end); ok {
		ctx.ReportRange(textRange, buildEmptyGroupMessage())
	}
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !source.FlagsKnown {
		return
	}

	if source.Pattern == "" {
		ctx.ReportRange(source.ContentRange(), buildEmptyGroupMessage())
		return
	}

	parsed := regexbatch.Parse(source.Pattern, source.Flags)
	for _, group := range parsed.Groups {
		if group.Kind != regexbatch.GroupNonCapturing && group.Kind != regexbatch.GroupCapturing {
			continue
		}

		allEmpty := true
		for _, alt := range group.Alternatives {
			if len(alt.Elements) > 0 {
				allEmpty = false
				break
			}
		}
		if !allEmpty {
			continue
		}

		reportEmptyGroup(ctx, source, group.Start, group.End)
	}
}

var NoEmptyGroupRule = rule.Rule{
	Name: "no-empty-group",
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
