package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/consistent_date_clone"
)

func TestConsistentDateCloneReportsGetTimeClone(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		consistent_date_clone.ConsistentDateCloneRule,
		nil,
		"file.ts",
		`
declare const original: Date;
const clone = new Date(original.getTime());
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "consistent-date-clone/error")
	if got := diagnosticText(t, diagnostics[0]); got != "getTime()" {
		t.Fatalf("expected diagnostic on getTime() call, got %q", got)
	}
}

func TestConsistentDateCloneReportsParenthesizedArgument(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		consistent_date_clone.ConsistentDateCloneRule,
		nil,
		"file.ts",
		`
declare const original: Date;
const clone = new Date((original.getTime()));
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "consistent-date-clone/error")
	if got := diagnosticText(t, diagnostics[0]); got != "getTime()" {
		t.Fatalf("expected diagnostic on getTime() call, got %q", got)
	}
}

func TestConsistentDateCloneSkipsNonMatchingCalls(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		consistent_date_clone.ConsistentDateCloneRule,
		nil,
		"file.ts",
		`
declare const original: Date;
const direct = new Date(original);
const computed = new Date(original["getTime"]());
const withArgument = new Date(original.getTime(1));
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
