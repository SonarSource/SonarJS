package s1874_deprecation

import (
	"context"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildDeprecationMessage(description string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "deprecation",
		Description: description,
	}
}

func reportDeprecatedDiagnostics(ctx rule.RuleContext) {
	if ctx.TypeChecker == nil || ctx.SourceFile == nil {
		return
	}

	diagnostics := ctx.TypeChecker.GetSuggestionDiagnostics(context.Background(), ctx.SourceFile)
	for _, diagnostic := range diagnostics {
		if diagnostic == nil || !diagnostic.ReportsDeprecated() {
			continue
		}

		ctx.ReportRange(diagnostic.Loc(), buildDeprecationMessage(utils.GetDiagnosticMessage(diagnostic)))
	}
}

var DeprecationRule = rule.Rule{
	Name: "deprecation",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		reported := false
		reportOnce := func(node *ast.Node) {
			if reported {
				return
			}

			reported = true
			reportDeprecatedDiagnostics(ctx)
		}

		return rule.RuleListeners{
			ast.KindIdentifier:                    reportOnce,
			ast.KindStringLiteral:                 reportOnce,
			ast.KindNoSubstitutionTemplateLiteral: reportOnce,
			ast.KindThisKeyword:                   reportOnce,
		}
	},
}
