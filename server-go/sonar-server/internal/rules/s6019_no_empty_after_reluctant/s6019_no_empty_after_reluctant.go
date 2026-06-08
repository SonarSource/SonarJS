package s6019_no_empty_after_reluctant

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildReluctantQuantifierMessage(min int) rule.RuleMessage {
	ending := ""
	if min != 1 {
		ending = "s"
	}

	return rule.RuleMessage{
		Id:          "issue",
		Description: fmt.Sprintf("Fix this reluctant quantifier that will only ever match %d repetition%s.", min, ending),
	}
}

func buildUnnecessaryReluctantMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: "Remove the '?' from this unnecessarily reluctant quantifier.",
	}
}

func quantifierTextRange(source *regexbatch.PatternSource, quantifier *regexbatch.Quantifier) (textRangeStart int, textRangeEnd int) {
	start := quantifier.Start - len(quantifier.ElementRaw)
	if start < 0 {
		start = 0
	}
	return start, quantifier.End
}

func reportQuantifier(ctx rule.RuleContext, source *regexbatch.PatternSource, quantifier *regexbatch.Quantifier, message rule.RuleMessage) {
	start, end := quantifierTextRange(source, quantifier)
	if textRange, ok := source.ResolvePatternRange(start, end); ok {
		ctx.ReportRange(textRange, message)
	}
}

func checkAlternative(ctx rule.RuleContext, source *regexbatch.PatternSource, elements []regexbatch.Element) {
	if len(elements) == 0 {
		return
	}

	lastQuantifier, ok := elements[len(elements)-1].(*regexbatch.Quantifier)
	if ok && !lastQuantifier.Greedy {
		reportQuantifier(ctx, source, lastQuantifier, buildReluctantQuantifierMessage(lastQuantifier.Min))
		return
	}

	if len(elements) == 1 {
		return
	}

	previousQuantifier, ok := elements[len(elements)-2].(*regexbatch.Quantifier)
	if !ok || previousQuantifier.Greedy {
		return
	}

	switch current := elements[len(elements)-1].(type) {
	case *regexbatch.SimpleElement:
		if current.Raw == "$" {
			reportQuantifier(ctx, source, previousQuantifier, buildUnnecessaryReluctantMessage())
		}
	case *regexbatch.Quantifier:
		if current.Min == 0 {
			reportQuantifier(ctx, source, previousQuantifier, buildReluctantQuantifierMessage(previousQuantifier.Min))
		}
	}
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !source.FlagsKnown {
		return
	}

	for _, alternative := range regexbatch.Parse(source.Pattern, source.Flags).Alternatives {
		checkAlternative(ctx, source, alternative.Elements)
	}
}

var NoEmptyAfterReluctantRule = rule.Rule{
	Name: "no-empty-after-reluctant",
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
