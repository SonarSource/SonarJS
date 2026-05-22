package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_confusing_non_null_assertion"
)

func TestNoConfusingNonNullAssertionReportsAssignmentAndOperatorCases(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_confusing_non_null_assertion.NoConfusingNonNullAssertionRule,
		nil,
		"file.ts",
		`
class Foo {}

let text: string | undefined;
const other = 'x';
text! = other;
text! == other;

declare const maybeFoo: Foo | undefined;
maybeFoo! instanceof Foo;
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 3 {
		t.Fatalf("expected 3 diagnostics, got %#v", diagnostics)
	}
}

func TestNoConfusingNonNullAssertionReportsBinaryLeftEndingWithBang(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_confusing_non_null_assertion.NoConfusingNonNullAssertionRule,
		nil,
		"file.ts",
		`
declare const maybeNumber: number | undefined;
const confusing = 1 + maybeNumber! === 3;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "confusingEqual")
	if got := diagnosticText(t, diagnostics[0]); got != "1 + maybeNumber! === 3" {
		t.Fatalf("expected full binary expression range, got %q", got)
	}
}

func TestNoConfusingNonNullAssertionSkipsWrappedAndDifferentOperators(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_confusing_non_null_assertion.NoConfusingNonNullAssertionRule,
		nil,
		"file.ts",
		`
class Foo {}

declare const maybeFoo: Foo | undefined;
declare const other: Foo;

(maybeFoo!) instanceof Foo;
maybeFoo! != other;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
