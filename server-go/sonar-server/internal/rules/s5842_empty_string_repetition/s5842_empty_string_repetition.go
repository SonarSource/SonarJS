package s5842_empty_string_repetition

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/microsoft/typescript-go/shim/ast"
)

const emptyStringRepetitionMessageID = "issue"

func buildEmptyStringRepetitionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          emptyStringRepetitionMessageID,
		Description: "Rework this part of the regex to not match the empty string.",
	}
}

func elementCanMatchEmpty(element regexbatch.Element) bool {
	switch current := element.(type) {
	case *regexbatch.Group:
		if current.Kind == regexbatch.GroupAssertion {
			return true
		}
		return alternativesCanMatchEmpty(current.Alternatives)
	case *regexbatch.Quantifier:
		return current.Min == 0
	case *regexbatch.SimpleElement:
		switch current.Raw {
		case "^", "$", `\b`, `\B`:
			return true
		default:
			return false
		}
	default:
		return false
	}
}

func alternativeCanMatchEmpty(alternative *regexbatch.Alternative) bool {
	if alternative == nil {
		return false
	}
	for _, element := range alternative.Elements {
		if !elementCanMatchEmpty(element) {
			return false
		}
	}
	return true
}

func alternativesCanMatchEmpty(alternatives []*regexbatch.Alternative) bool {
	for _, alternative := range alternatives {
		if alternativeCanMatchEmpty(alternative) {
			return true
		}
	}
	return false
}

func rawCanMatchEmpty(raw string, flags string) bool {
	parsed := regexbatch.Parse(raw, flags)
	return alternativesCanMatchEmpty(parsed.Alternatives)
}

func runOnRegex(ctx rule.RuleContext, node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(ctx, node)
	if !ok || !source.FlagsKnown {
		return
	}

	for _, quantifier := range regexbatch.Parse(source.Pattern, source.Flags).Quantifiers {
		if !rawCanMatchEmpty(quantifier.ElementRaw, source.Flags) {
			continue
		}

		start := quantifier.Start - len(quantifier.ElementRaw)
		if start < 0 {
			start = 0
		}
		if textRange, ok := source.ResolvePatternRange(start, quantifier.Start); ok {
			ctx.ReportRange(textRange, buildEmptyStringRepetitionMessage())
		}
	}
}

var EmptyStringRepetitionRule = rule.Rule{
	Name: "empty-string-repetition",
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
