package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_typeof_undefined"
)

func TestNoTypeofUndefinedReportsLocalComparison(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_typeof_undefined.NoTypeofUndefinedRule,
		nil,
		"file.ts",
		`
function configure(value?: string) {
  if (typeof value === 'undefined') {
    return 'missing';
  }
  return value;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-typeof-undefined/error")
}

func TestNoTypeofUndefinedSkipsGlobalOrUnresolvedByDefault(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_typeof_undefined.NoTypeofUndefinedRule,
		nil,
		"file.ts",
		`
if (typeof maybeMissing === 'undefined') {
  console.log('missing');
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoTypeofUndefinedCanCheckGlobalOrUnresolvedIdentifiers(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_typeof_undefined.NoTypeofUndefinedRule,
		map[string]any{"checkGlobalVariables": true},
		"file.ts",
		`
if (typeof maybeMissing === 'undefined') {
  console.log('missing');
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "no-typeof-undefined/error")
}
