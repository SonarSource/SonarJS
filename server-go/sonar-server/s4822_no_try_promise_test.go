package main

import "testing"

func TestNoTryPromiseReportsOpenPromiseInsideTry(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-try-promise",
		nil,
		"file.ts",
		`
function returningPromise() { return Promise.reject(); }
function invalid() {
  try {
    returningPromise();
  } catch (e) {
    console.log(e);
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "wrongCatch")
}

func TestNoTryPromiseReportsUselessTryWhenCatchAlreadyUsed(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-try-promise",
		nil,
		"file.ts",
		`
function returningPromise() { return Promise.reject(); }
function invalid() {
  try {
    returningPromise().catch(() => {});
  } catch (e) {
    console.log(e);
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "uselessCatch")
}

func TestNoTryPromiseSkipsPotentiallyThrowingCalls(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-try-promise",
		nil,
		"file.ts",
		`
function returningPromise() { return Promise.reject(); }
declare function mightThrow(): void;

function valid() {
  try {
    mightThrow();
    returningPromise();
  } catch (e) {
    console.log(e);
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
