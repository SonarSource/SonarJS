package main

import "testing"

func TestS3801ReportsReturnValueAndImplicitReturn(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"inconsistent-return",
		nil,
		"file.ts",
		`
function inconsistent(p: boolean) {
  if (p) {
    return true;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "inconsistentReturn")
	if len(diagnostics[0].LabeledRanges) != 2 {
		t.Fatalf("expected 2 labeled ranges, got %#v", diagnostics[0].LabeledRanges)
	}
	if got := diagnostics[0].LabeledRanges[0].Label; got != "Return with value" {
		t.Fatalf("unexpected first label %q", got)
	}
	if got := diagnostics[0].LabeledRanges[1].Label; got != "Implicit return without value" {
		t.Fatalf("unexpected second label %q", got)
	}
}

func TestS3801ReportsReturnValueAndBareReturn(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"inconsistent-return",
		nil,
		"file.ts",
		`
const inconsistentArrow = (p: boolean) => {
  if (p) {
    return true;
  }
  return;
};
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "inconsistentReturn")
	if len(diagnostics[0].LabeledRanges) != 2 {
		t.Fatalf("expected 2 labeled ranges, got %#v", diagnostics[0].LabeledRanges)
	}
	if got := diagnostics[0].LabeledRanges[1].Label; got != "Return without value" {
		t.Fatalf("unexpected second label %q", got)
	}
}

func TestS3801SkipsExhaustiveSwitch(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"inconsistent-return",
		nil,
		"file.ts",
		`
type Kind = 'a' | 'b';

function getValue(kind: Kind) {
  switch (kind) {
    case 'a':
      return 1;
    case 'b':
      return 2;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestS3801SkipsNeverReturningCall(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"inconsistent-return",
		nil,
		"file.ts",
		`
function throwError(message: string): never {
  throw new Error(message);
}

function formatDateOrThrow(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  throwError('Invalid date');
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
