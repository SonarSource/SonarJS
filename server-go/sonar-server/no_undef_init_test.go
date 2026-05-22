package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_undef_init"
)

const noUndefInitTSConfig = `{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "target": "ES2022"
  },
  "include": ["file.js"]
}`

func TestNoUndefInitReportsGlobalUndefinedInitializer(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_undef_init.NoUndefInitRule,
		nil,
		"file.js",
		`
let value = undefined;
`,
		"tsconfig.no-undef-init.json",
		noUndefInitTSConfig,
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unnecessaryUndefinedInit")
	if got := diagnostics[0].Message.Description; got != "It's not necessary to initialize 'value' to undefined." {
		t.Fatalf("unexpected diagnostic description: %q", got)
	}
}

func TestNoUndefInitSkipsConstantBindings(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_undef_init.NoUndefInitRule,
		nil,
		"file.js",
		`
const value = undefined;
`,
		"tsconfig.no-undef-init.json",
		noUndefInitTSConfig,
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoUndefInitSkipsShadowedUndefined(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_undef_init.NoUndefInitRule,
		nil,
		"file.js",
		`
function wrap(undefined) {
  let value = undefined;
}
`,
		"tsconfig.no-undef-init.json",
		noUndefInitTSConfig,
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
