package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_caller"
)

func TestNoCallerReportsArgumentsCallee(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_caller.NoCallerRule,
		nil,
		"file.ts",
		`
function invalid() {
  return arguments.callee;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpected")
	if got := diagnostics[0].Message.Description; got != "Avoid arguments.callee." {
		t.Fatalf("unexpected diagnostic description %q", got)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "arguments.callee" {
		t.Fatalf("unexpected diagnostic text %q", got)
	}
}

func TestNoCallerReportsArgumentsCaller(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_caller.NoCallerRule,
		nil,
		"file.ts",
		`
function invalid() {
  return arguments.caller;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpected")
	if got := diagnostics[0].Message.Description; got != "Avoid arguments.caller." {
		t.Fatalf("unexpected diagnostic description %q", got)
	}
}

func TestNoCallerSkipsComputedAccess(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_caller.NoCallerRule,
		nil,
		"file.ts",
		`
function valid() {
  return arguments["callee"];
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
