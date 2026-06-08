package main

import "testing"

func TestDisabledResourceIntegrityReportsRemoteScriptWithoutIntegrity(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"disabled-resource-integrity",
		nil,
		"file.ts",
		`
var script = document.createElement("script");
script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
document.head.appendChild(script);
`,
		"tsconfig.lib-dom.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "safeResource")
}

func TestDisabledResourceIntegrityAllowsIntegrityAttribute(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"disabled-resource-integrity",
		nil,
		"file.ts",
		`
var script = document.createElement("script");
script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
script.integrity = "sha256-test";
document.head.appendChild(script);
`,
		"tsconfig.lib-dom.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
