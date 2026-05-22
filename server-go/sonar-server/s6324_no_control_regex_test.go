package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6324_no_control_regex"
)

func TestS6324ReportsControlCharacters(t *testing.T) {
	t.Parallel()

	if s6324_no_control_regex.NoControlRegexRule.Name != "no-control-regex" {
		t.Fatalf("unexpected rule name %q", s6324_no_control_regex.NoControlRegexRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s6324_no_control_regex.NoControlRegexRule,
		nil,
		"file.ts",
		`const nul = /\x00/;
const pair = new RegExp('\x1f\x1e');
const classChars = /[\x0b\x0c]/;
const ansiBell = /\x1b\[.*?\x07/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 6)

	wantTexts := []string{`\x00`, `\x1f`, `\x1e`, `\x0b`, `\x0c`, `\x07`}
	for index, diagnostic := range diagnostics {
		if got := diagnostic.Message.Description; got != "Remove this control character." {
			t.Fatalf("unexpected diagnostic message %q", got)
		}
		if got := diagnosticText(t, diagnostic); got != wantTexts[index] {
			t.Fatalf("diagnostic %d text mismatch: want %q, got %q", index, wantTexts[index], got)
		}
	}
}

func TestS6324SkipsAllowedControlCharacterUsages(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6324_no_control_regex.NoControlRegexRule,
		nil,
		"file.ts",
		`const tab = /\t/;
const newline = /\n/;
const range = /[\x00-\x1f]/g;
const mixedRange = /[\x00-\x08\x0b\x0c]/;
const csi = /\x1b\[\d+m/g;
const osc = /\x1b\].*?\x07/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
