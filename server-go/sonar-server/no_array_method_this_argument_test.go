package main

import "testing"

func TestNoArrayMethodThisArgumentReportsArrayPrototypeMethod(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-array-method-this-argument",
		nil,
		"file.ts",
		`
const array = [1, 2, 3];
const foo = array.find(element => element > 1, Math);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "error-prototype-method")
}

func TestNoArrayMethodThisArgumentReportsArrayFromThisArg(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-array-method-this-argument",
		nil,
		"file.ts",
		`
const input = new Set([1, 2, 3]);
const foo = Array.from(input, element => element * 2, Math);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "error-static-method")
}

func TestNoArrayMethodThisArgumentSkipsCustomFindMethod(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-array-method-this-argument",
		nil,
		"file.ts",
		`
class Finder {
  find(callback: (value: string) => boolean, thisArg: unknown) {
    return thisArg;
  }
}

const finder = new Finder();
finder.find(value => value.length > 1, Math);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
