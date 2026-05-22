package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5867_unicode_aware_regex"
)

func TestS5867ReportsUnicodeConstructsWithoutUnicodeFlag(t *testing.T) {
	t.Parallel()

	if s5867_unicode_aware_regex.UnicodeAwareRegexRule.Name != "unicode-aware-regex" {
		t.Fatalf("unexpected rule name %q", s5867_unicode_aware_regex.UnicodeAwareRegexRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s5867_unicode_aware_regex.UnicodeAwareRegexRule,
		nil,
		"file.ts",
		`const unicodeChar = /\u{1234}/;
const unicodeProp = /\p{Alpha}/;
const flags = "";
const ctor = new RegExp("\\P{Script=Latin}", flags);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 3)

	if got := diagnosticText(t, diagnostics[0]); got != `/\u{1234}/` {
		t.Fatalf("unexpected first diagnostic text %q", got)
	}
	if len(diagnostics[0].LabeledRanges) != 1 {
		t.Fatalf("expected one secondary location, got %#v", diagnostics[0].LabeledRanges)
	}
	if diagnostics[0].LabeledRanges[0].Label != "Unicode character" {
		t.Fatalf("unexpected first secondary label %q", diagnostics[0].LabeledRanges[0].Label)
	}
	if got := diagnostics[0].SourceFile.Text()[diagnostics[0].LabeledRanges[0].Range.Pos():diagnostics[0].LabeledRanges[0].Range.End()]; got != `\u{1234}` {
		t.Fatalf("unexpected first secondary text %q", got)
	}

	if got := diagnosticText(t, diagnostics[1]); got != `/\p{Alpha}/` {
		t.Fatalf("unexpected second diagnostic text %q", got)
	}
	if len(diagnostics[1].LabeledRanges) != 1 || diagnostics[1].LabeledRanges[0].Label != "Unicode property" {
		t.Fatalf("unexpected second diagnostic labeled ranges %#v", diagnostics[1].LabeledRanges)
	}

	if got := diagnosticText(t, diagnostics[2]); got != `new RegExp("\\P{Script=Latin}", flags)` {
		t.Fatalf("unexpected constructor diagnostic text %q", got)
	}
}

func TestS5867SkipsUnicodeFlagAndMalformedConstructs(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5867_unicode_aware_regex.UnicodeAwareRegexRule,
		nil,
		"file.ts",
		`const okChar = /\u{1234}/u;
const okProp = /\p{Alpha}/u;
const shortEscape = /\u{12}/;
const malformedProp = /\p{a=/;
const malformedChar = /\u{12,34}/;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
