package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s4139_no_for_in_iterable"
)

func TestNoForInIterableReportsArrayIteration(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s4139_no_for_in_iterable.NoForInIterableRule,
		nil,
		"file.ts",
		`
const values = [1, 2, 3];
for (const index in values) {
  console.log(index);
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "useForOf")
	if got := diagnostics[0].Message.Description; got != "Use \"for...of\" to iterate over this \"Array\"." {
		t.Fatalf("unexpected message %q", got)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "for" {
		t.Fatalf("expected for-token range, got %q", got)
	}
}

func TestNoForInIterableSkipsPlainObjects(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s4139_no_for_in_iterable.NoForInIterableRule,
		nil,
		"file.ts",
		`
const record = { first: 1, second: 2 };
for (const key in record) {
  console.log(key);
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
