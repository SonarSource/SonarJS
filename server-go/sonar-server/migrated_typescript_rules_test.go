package main

import (
	"testing"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
)

func assertDiagnosticCount(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want int) {
	t.Helper()

	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func assertSingleDiagnosticMessageID(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want string) {
	t.Helper()

	assertDiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}

func TestPreferReadonlyReportsUnmodifiedPrivateMember(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-readonly",
		nil,
		"file.ts",
		`
class Counter {
  private count = 0;

  getCount() {
    return this.count;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "preferReadonly")
}

func TestPreferReadonlySkipsReassignedPrivateMember(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-readonly",
		nil,
		"file.ts",
		`
class Counter {
  private count = 0;

  increment() {
    this.count += 1;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestAwaitThenableReportsAwaitOfSynchronousValue(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"await-thenable",
		nil,
		"file.ts",
		`
async function invalid() {
  const value = 42;
  await value;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "await")
}

func TestAwaitThenableAllowsPromiseLikeValues(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"await-thenable",
		nil,
		"file.ts",
		`
async function valid(promise: PromiseLike<number>) {
  await promise;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoUnnecessaryTypeArgumentsReportsDefaultTypeArgument(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-unnecessary-type-arguments",
		nil,
		"file.ts",
		`
function wrap<T = string>(value: T): T {
  return value;
}

const value = wrap<string>('x');
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unnecessaryTypeParameter")
}

func TestNoUnnecessaryTypeArgumentsAllowsNecessaryTypeArgument(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-unnecessary-type-arguments",
		nil,
		"file.ts",
		`
function wrap<T = string>(value: T): T {
  return value;
}

const value = wrap<number>(42);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoUnnecessaryTypeAssertionReportsIdentityAssertion(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-unnecessary-type-assertion",
		nil,
		"file.ts",
		`
const value: number = 42;
const same = value as number;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unnecessaryAssertion")
}

func TestNoUnnecessaryTypeAssertionSkipsGenericReturnAssertion(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-unnecessary-type-assertion",
		nil,
		"file.ts",
		`
const registry = new Map<string, unknown>();

function getService<T>(name: string): T {
  return registry.get(name) as T;
}

const logger = getService('logger') as { log(message: string): void };
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestPreferReturnThisTypeReportsClassNameReturn(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-return-this-type",
		nil,
		"file.ts",
		`
class Builder {
  withX(): Builder {
    return this;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "useThisType")
}

func TestPreferReturnThisTypeAllowsThisReturn(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-return-this-type",
		nil,
		"file.ts",
		`
class Builder {
  withX(): this {
    return this;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoRedundantTypeConstituentsReportsRedundantAny(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-redundant-type-constituents",
		nil,
		"file.ts",
		`
type Value = string | any;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "overrides")
}

func TestNoRedundantTypeConstituentsSuppressesAliasedUnknownTopType(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-redundant-type-constituents",
		nil,
		"file.ts",
		`
type Hidden = unknown;
const value: Hidden | string = '42';
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoMixedEnumsReportsMixedEnum(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-mixed-enums",
		nil,
		"file.ts",
		`
enum Status {
  Ready = 'ready',
  Done = 1,
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "mixed")
}

func TestNoMixedEnumsAllowsSingleEnumKind(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-mixed-enums",
		nil,
		"file.ts",
		`
enum Status {
  Ready = 'ready',
  Done = 'done',
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestPreferPromiseRejectErrorsRejectsStringByDefault(t *testing.T) {
	t.Parallel()

	options := optionsForRequestedRule(&pb.JsTsRule{Key: "S6671"})
	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-promise-reject-errors",
		options,
		"file.ts",
		`
Promise.reject('bad');
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "rejectAnError")
}

func TestPreferPromiseRejectErrorsAllowsUnknownByDefault(t *testing.T) {
	t.Parallel()

	options := optionsForRequestedRule(&pb.JsTsRule{Key: "S6671"})
	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-promise-reject-errors",
		options,
		"file.ts",
		`
const reason: unknown = 'bad';
Promise.reject(reason);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
