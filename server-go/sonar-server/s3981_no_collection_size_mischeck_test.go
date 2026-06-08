package main

import "testing"

func TestS3981ReportsImpossibleLengthComparison(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-collection-size-mischeck",
		nil,
		"file.ts",
		`
const arr = [];
if (arr.length >= 0) {}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "fixCollectionSizeCheck")
}

func TestS3981SkipsNonCollectionLengthProperty(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-collection-size-mischeck",
		nil,
		"file.ts",
		`
const obj = { length: -1 };
if (obj.length >= 0) {}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
