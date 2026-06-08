package main

import "testing"

func TestNoSmallSwitchReportsSmallSwitch(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-small-switch",
		nil,
		"file.ts",
		`
switch (value) {
  case 'a':
    handle(value);
    break;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "replaceSwitch")
}

func TestNoSmallSwitchSkipsNeverAnnotatedExhaustivenessCheck(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-small-switch",
		nil,
		"file.ts",
		`
type Status = 'active';

function handle(status: Status): string {
  switch (status) {
    case 'active':
      return 'active';
    default:
      const _: never = status;
      return _;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoSmallSwitchSkipsAssertNeverSentinel(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-small-switch",
		nil,
		"file.ts",
		`
function assertNever(x: never): never {
  throw new Error(String(x));
}

type Status = 'active';

function handle(status: Status): string {
  switch (status) {
    case 'active':
      return 'active';
    default:
      return assertNever(status);
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoSmallSwitchStillReportsNonSentinelNeverCall(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-small-switch",
		nil,
		"file.ts",
		`
function failWith(x: unknown): never {
  throw new Error(String(x));
}

type Status = 'active';

function handle(status: Status): void {
  switch (status) {
    case 'active':
      break;
    default:
      failWith(status);
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "replaceSwitch")
}
