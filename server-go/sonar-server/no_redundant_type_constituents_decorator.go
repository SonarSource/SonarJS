package main

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
)

var NoRedundantTypeConstituentsDecorator = RuleDecorator{
	FilterDiagnostic: func(ctx rule.RuleContext, diagnostic rule.RuleDiagnostic) bool {
		if diagnostic.Message.Id == "errorTypeOverrides" {
			return false
		}
		return !isUnresolvedTopTypeDiagnostic(diagnostic, "any") &&
			!isUnresolvedTopTypeDiagnostic(diagnostic, "unknown")
	},
}

func isUnresolvedTopTypeDiagnostic(diagnostic rule.RuleDiagnostic, typeName string) bool {
	if diagnostic.SourceFile == nil || !diagnostic.Range.IsValid() {
		return false
	}
	if !strings.HasPrefix(diagnostic.Message.Description, "'"+typeName+"' ") {
		return false
	}

	sourceText := diagnostic.SourceFile.Text()
	if diagnostic.Range.Pos() < 0 || diagnostic.Range.End() > len(sourceText) {
		return false
	}
	return strings.TrimSpace(sourceText[diagnostic.Range.Pos():diagnostic.Range.End()]) != typeName
}
