package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s1154_useless_string_operation"
)

func TestUselessStringOperationReportsLongChainedStringCall(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s1154_useless_string_operation.UselessStringOperationRule,
		nil,
		"file.ts",
		`
const value = 'hello';
value.toLowerCase().toUpperCase().toLowerCase();
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "uselessStringOp")
	if got := diagnostics[0].Message.Description; got != "String is an immutable object; you must either store or return the result of the operation." {
		t.Fatalf("unexpected message %q", got)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "toLowerCase" {
		t.Fatalf("expected property range, got %q", got)
	}
}

func TestUselessStringOperationSkipsCallbackBasedReplace(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s1154_useless_string_operation.UselessStringOperationRule,
		nil,
		"file.ts",
		`
const replacer = (value: string) => value.toUpperCase();
'hello'.replace(/l/g, replacer);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
