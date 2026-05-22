package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_template_curly_in_string"
)

func TestNoTemplateCurlyInStringReportsPlaceholderSyntaxInStringLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_template_curly_in_string.NoTemplateCurlyInStringRule,
		nil,
		"file.ts",
		`
const message = 'Hello ${name}';
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpectedTemplateExpression")
}

func TestNoTemplateCurlyInStringSkipsRealTemplateLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_template_curly_in_string.NoTemplateCurlyInStringRule,
		nil,
		"file.ts",
		`
const message = `+"`Hello ${name}`"+`;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
