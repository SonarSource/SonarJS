package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_alert"
)

const noAlertTSConfig = `{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM"]
  },
  "include": ["file.js"]
}`

func TestNoAlertReportsDirectCalls(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_alert.NoAlertRule,
		nil,
		"file.js",
		`
alert("x");
confirm("y");
prompt("z");
`,
		"tsconfig.no-alert.json",
		noAlertTSConfig,
	)

	assertDiagnosticCount(t, diagnostics, 3)
	if got := diagnosticText(t, diagnostics[0]); got != `alert("x")` {
		t.Fatalf("expected first diagnostic on alert call, got %q", got)
	}
	if got := diagnostics[1].Message.Description; got != "Unexpected confirm." {
		t.Fatalf("unexpected confirm diagnostic description: %q", got)
	}
	if got := diagnostics[2].Message.Description; got != "Unexpected prompt." {
		t.Fatalf("unexpected prompt diagnostic description: %q", got)
	}
}

func TestNoAlertReportsGlobalObjectCalls(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_alert.NoAlertRule,
		nil,
		"file.js",
		`
window.alert("x");
globalThis["confirm"]("y");
`,
		"tsconfig.no-alert.json",
		noAlertTSConfig,
	)

	assertDiagnosticCount(t, diagnostics, 2)
	if got := diagnostics[0].Message.Description; got != "Unexpected alert." {
		t.Fatalf("unexpected window.alert diagnostic description: %q", got)
	}
	if got := diagnosticText(t, diagnostics[1]); got != `globalThis["confirm"]("y")` {
		t.Fatalf("expected second diagnostic on globalThis member call, got %q", got)
	}
}

func TestNoAlertSkipsShadowedAndDynamicCalls(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_alert.NoAlertRule,
		nil,
		"file.js",
		`
function run(alert, window) {
  alert("x");
  window.confirm("y");
}

const globalThis = { prompt() {} };
globalThis.prompt("z");

const name = "alert";
window[name]("w");
`,
		"tsconfig.no-alert.json",
		noAlertTSConfig,
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
