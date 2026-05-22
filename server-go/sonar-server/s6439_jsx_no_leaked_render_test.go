package main

import "testing"

func TestS6439ReportsNumericConditionInJSX(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"jsx-no-leaked-render",
		nil,
		"component.tsx",
		`
const Component = (count: number, collection: string[]) => {
  return (
    <div>
      {count && <List elements={collection} />}
    </div>
  );
};
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "nonBooleanMightRender")
	if got := diagnosticText(t, diagnostics[0]); got != "count" {
		t.Fatalf("unexpected diagnostic text %q", got)
	}
}

func TestS6439ReportsNestedLogicalOperands(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"jsx-no-leaked-render",
		nil,
		"component.tsx",
		`
const Component = (test: number, count: number, collection: string[]) => {
  return (
    <div>
      {(test || (count)) && <List elements={collection} />}
    </div>
  );
};
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	if got := diagnosticText(t, diagnostics[0]); got != "test" {
		t.Fatalf("unexpected first diagnostic text %q", got)
	}
	if got := diagnosticText(t, diagnostics[1]); got != "count" {
		t.Fatalf("unexpected second diagnostic text %q", got)
	}
}

func TestS6439OnlyFlagsStringsForReactNative(t *testing.T) {
	t.Parallel()

	validDiagnostics := runNamedRuleOnCode(
		t,
		"jsx-no-leaked-render",
		nil,
		"component.tsx",
		`
const Component = (collection: string[]) => {
  let test = '';
  return (
    <div>
      {test && <List elements={collection} />}
    </div>
  );
};
`,
		"tsconfig.minimal.json",
		"",
	)
	assertDiagnosticCount(t, validDiagnostics, 0)

	reactNativeDiagnostics := runNamedRuleOnCode(
		t,
		"jsx-no-leaked-render",
		nil,
		"component.tsx",
		`
import react from 'react-native';

const Component = (collection: string[]) => {
  let test = '';
  return (
    <div>
      {test && <List elements={collection} />}
    </div>
  );
};
`,
		"tsconfig.minimal.json",
		"",
	)
	assertSingleDiagnosticMessageID(t, reactNativeDiagnostics, "nonBooleanMightRender")
}
