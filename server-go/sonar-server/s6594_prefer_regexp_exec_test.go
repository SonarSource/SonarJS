package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s6594_prefer_regexp_exec"
)

func TestS6594PreferRegexpExecReportsMatchCalls(t *testing.T) {
	t.Parallel()

	if s6594_prefer_regexp_exec.PreferRegexpExecRule.Name != "prefer-regexp-exec" {
		t.Fatalf("unexpected rule name %q", s6594_prefer_regexp_exec.PreferRegexpExecRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s6594_prefer_regexp_exec.PreferRegexpExecRule,
		nil,
		"file.ts",
		`'foo'.match(/bar/);`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "useExec")
	if diagnostics[0].Message.Description != `Use the "RegExp.exec()" method instead.` {
		t.Fatalf("unexpected message %q", diagnostics[0].Message.Description)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "match" {
		t.Fatalf("expected diagnostic text %q, got %q", "match", got)
	}
}

func TestS6594PreferRegexpExecSkipsGlobalRegexes(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6594_prefer_regexp_exec.PreferRegexpExecRule,
		nil,
		"file.ts",
		`'foo'.match(/bar/g);`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestS6594PreferRegexpExecSkipsMatchesWhoseLengthIsRead(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s6594_prefer_regexp_exec.PreferRegexpExecRule,
		nil,
		"file.ts",
		`
const m1 = 'foo'.match(/bar/);
if (m1.length > 0) {
  console.log(m1[0]);
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
