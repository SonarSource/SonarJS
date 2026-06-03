package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_object_as_default_parameter"
)

func TestNoObjectAsDefaultParameterReportsIdentifierParameter(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_object_as_default_parameter.NoObjectAsDefaultParameterRule,
		nil,
		"file.ts",
		`
function configure(options = { enabled: true }) {
  return options.enabled;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "identifier")
}

func TestNoObjectAsDefaultParameterReportsBindingPattern(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_object_as_default_parameter.NoObjectAsDefaultParameterRule,
		nil,
		"file.ts",
		`
function configure({ enabled } = { enabled: true }) {
  return enabled;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "non-identifier")
}

func TestNoObjectAsDefaultParameterAllowsEmptyObjectLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_object_as_default_parameter.NoObjectAsDefaultParameterRule,
		nil,
		"file.ts",
		`
function configure(options = {}) {
  return options;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoObjectAsDefaultParameterIgnoresParametersWithoutDefault(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_object_as_default_parameter.NoObjectAsDefaultParameterRule,
		nil,
		"file.ts",
		`
function configure(options) {
  return options;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
