package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5842_empty_string_repetition"
)

func TestS5842ReportsQuantifiedExpressionsThatCanMatchEmpty(t *testing.T) {
	t.Parallel()

	if s5842_empty_string_repetition.EmptyStringRepetitionRule.Name != "empty-string-repetition" {
		t.Fatalf("unexpected rule name %q", s5842_empty_string_repetition.EmptyStringRepetitionRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s5842_empty_string_repetition.EmptyStringRepetitionRule,
		nil,
		"file.ts",
		`const emptyGroup = /(?:)*/;
const emptyAlternative = /(?:x|)*/;
const optionalBranch = /(?:x?)*/;
const assertion = /($)*/;
const ctor = new RegExp("(?:x*)+");
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 5)

	wantTexts := []string{
		"(?:)",
		"(?:x|)",
		"(?:x?)",
		"($)",
		"(?:x*)",
	}

	for index, diagnostic := range diagnostics {
		if diagnostic.Message.Id != "issue" {
			t.Fatalf("unexpected diagnostic id %q", diagnostic.Message.Id)
		}
		if got := diagnosticText(t, diagnostic); got != wantTexts[index] {
			t.Fatalf("diagnostic %d text mismatch: want %q, got %q", index, wantTexts[index], got)
		}
	}
}

func TestS5842SkipsSafeRepetitions(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5842_empty_string_repetition.EmptyStringRepetitionRule,
		nil,
		"file.ts",
		`const okStar = /x*/;
const okOptional = /x?/;
const okNested = /(?:x+)*/;
const okCtor = new RegExp("(?:x+)+");
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
