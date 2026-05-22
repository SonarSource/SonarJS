package main

import (
	"strings"
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5868_unicode_grapheme_in_class"
)

func TestS5868ReportsCombinedCharactersAndEmojiSequences(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5868_unicode_grapheme_in_class.UnicodeGraphemeInClassRule,
		nil,
		"file.ts",
		`/[\u0041\u0301]/;
/[\u{1F476}\u{1F3FB}]/u;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	if !strings.Contains(diagnostics[0].Message.Description, "combined character") {
		t.Fatalf("unexpected first message %q", diagnostics[0].Message.Description)
	}
	if !strings.Contains(diagnostics[1].Message.Description, "modified Emoji") {
		t.Fatalf("unexpected second message %q", diagnostics[1].Message.Description)
	}
}

func TestS5868ReportsSurrogatePairsWithoutUnicodeFlag(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5868_unicode_grapheme_in_class.UnicodeGraphemeInClassRule,
		nil,
		"file.ts",
		`/[\uD83D\uDC4D]/;`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
}

func TestS5868SkipsUnicodeCharacterClassesWithUFlag(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5868_unicode_grapheme_in_class.UnicodeGraphemeInClassRule,
		nil,
		"file.ts",
		`/[\u{1F44D}]/u;`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
