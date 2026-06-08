package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/adjacent_overload_signatures"
)

func TestAdjacentOverloadSignaturesReportsSeparatedStaticOverloads(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		adjacent_overload_signatures.AdjacentOverloadSignaturesRule,
		nil,
		"file.ts",
		`
class Factory {
  static create(value: string): Factory;
  field = 1;
  static create(value: number): Factory;
  static create(value: string | number): Factory {
    return new Factory();
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "adjacentSignature")
	if got := diagnostics[0].Message.Description; got != "All static create signatures should be adjacent." {
		t.Fatalf("unexpected message %q", got)
	}
}

func TestAdjacentOverloadSignaturesAllowsAdjacentFunctionOverloads(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		adjacent_overload_signatures.AdjacentOverloadSignaturesRule,
		nil,
		"file.ts",
		`
function parse(value: string): number;
function parse(value: number): number;
function parse(value: string | number): number {
  return 0;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
