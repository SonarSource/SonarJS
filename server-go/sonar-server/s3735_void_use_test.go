package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s3735_void_use"
)

func TestS3735VoidUseReportsVoidToken(t *testing.T) {
	t.Parallel()

	if s3735_void_use.VoidUseRule.Name != "void-use" {
		t.Fatalf("unexpected rule name %q", s3735_void_use.VoidUseRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s3735_void_use.VoidUseRule,
		nil,
		"file.ts",
		`void 42;`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxSingleDiagnosticMessageID(t, diagnostics, "removeVoid")
	if got := diagnosticText(t, diagnostics[0]); got != "void" {
		t.Fatalf("expected diagnostic text %q, got %q", "void", got)
	}
}

func TestS3735VoidUseSkipsAllowedCases(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3735_void_use.VoidUseRule,
		nil,
		"file.ts",
		`
interface Thenable<T> {
  then<TResult>(onfulfilled?: (value: T) => TResult): Thenable<TResult>;
}

declare function executeCommand(): Thenable<void>;
declare const maybePromise: Promise<void> | undefined;

void 0;
void (0);
void function () { return 42; }();
void (() => 42)();
void executeCommand();
void maybePromise;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxDiagnosticCount(t, diagnostics, 0)
}

func TestS3735VoidUseReportsMixedVoidUnion(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s3735_void_use.VoidUseRule,
		nil,
		"file.ts",
		`
const value: string | Promise<void> = "hello";
void value;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS37xxSingleDiagnosticMessageID(t, diagnostics, "removeVoid")
}
