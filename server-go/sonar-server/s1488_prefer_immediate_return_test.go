package main

import "testing"

func TestPreferImmediateReturnReportsTemporaryReturn(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-immediate-return",
		nil,
		"file.ts",
		`
function wrap() {
  const result = compute();
  return result;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "doImmediateAction")
}

func TestPreferImmediateReturnSkipsFunctionTypedTemporary(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-immediate-return",
		nil,
		"file.ts",
		`
const makeHandler = () => {
  const handler = () => {};
  return handler;
};
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestPreferImmediateReturnSkipsAdditionalReadInNestedClosure(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-immediate-return",
		nil,
		"file.ts",
		`
function wrap() {
  const value = compute();
  sink(() => value);
  return value;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
