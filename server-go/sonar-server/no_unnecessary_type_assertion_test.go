package main

import (
	"strings"
	"testing"
)

func TestNoUnnecessaryTypeAssertionAllowsCastsToAnyAndUnknown(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name string
		code string
	}{
		{
			name: "cast to any",
			code: `
const value: number = 42;
const asAny = value as any;
`,
		},
		{
			name: "cast to unknown",
			code: `
const value: number = 42;
const asUnknown = value as unknown;
`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			diagnostics := runNamedRuleOnCode(
				t,
				"no-unnecessary-type-assertion",
				nil,
				"file.ts",
				tc.code,
				"tsconfig.minimal.json",
				"",
			)

			assertDiagnosticCount(t, diagnostics, 0)
		})
	}
}

func TestNoUnnecessaryTypeAssertionReportsRedundantCastToAny(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-unnecessary-type-assertion",
		nil,
		"file.ts",
		`
function process(chunk: any) {
  const mutator = chunk as any;
  return mutator;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unnecessaryAssertion")
}

func TestNoUnnecessaryTypeAssertionAllowsNonNullWrappedGenericCallAssertion(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-unnecessary-type-assertion",
		nil,
		"file.ts",
		`
function getSubmitButton(form: Element): HTMLElement {
  return form.querySelector('button[type="submit"]')! as HTMLElement;
}
`,
		"tsconfig.lib-dom.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoUnnecessaryTypeAssertionAllowsNullableUnionNonNullWhenContextAlsoAllowsNullable(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-unnecessary-type-assertion",
		nil,
		"file.ts",
		`
function passNullable(x: string | null): string | null {
  return x!;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoUnnecessaryTypeAssertionReportsGuardedNonNullAssertion(t *testing.T) {
	t.Parallel()

	code := `
function convert(str: string | number | null | undefined) {
  if (str == null || str === '') {
    return undefined;
  }
  return isNaN(+str!);
}
`
	diagnostics := runNamedRuleOnCode(
		t,
		"no-unnecessary-type-assertion",
		nil,
		"file.ts",
		code,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unnecessaryAssertion")
	expectedStart := strings.Index(code, "str!")
	expectedEnd := expectedStart + len("str!")
	if diagnostics[0].Range.Pos() != expectedStart || diagnostics[0].Range.End() != expectedEnd {
		t.Fatalf("expected diagnostic range [%d,%d), got %#v", expectedStart, expectedEnd, diagnostics[0].Range)
	}
	if len(diagnostics[0].LabeledRanges) != 0 {
		t.Fatalf("expected no labeled ranges, got %#v", diagnostics[0].LabeledRanges)
	}
}

func TestNoUnnecessaryTypeAssertionReportsNonGenericCallAssertion(t *testing.T) {
	t.Parallel()

	code := `
function parse(): string {
  return '';
}

const result = parse() as string;
`
	diagnostics := runNamedRuleOnCode(
		t,
		"no-unnecessary-type-assertion",
		nil,
		"file.ts",
		code,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unnecessaryAssertion")
	expectedStart := strings.Index(code, "parse() as string")
	expectedEnd := expectedStart + len("parse() as string")
	if diagnostics[0].Range.Pos() != expectedStart || diagnostics[0].Range.End() != expectedEnd {
		t.Fatalf("expected diagnostic range [%d,%d), got %#v", expectedStart, expectedEnd, diagnostics[0].Range)
	}
	if len(diagnostics[0].LabeledRanges) != 0 {
		t.Fatalf("expected no labeled ranges, got %#v", diagnostics[0].LabeledRanges)
	}
}
