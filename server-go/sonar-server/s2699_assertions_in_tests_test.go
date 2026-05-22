package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2699_assertions_in_tests"
)

func TestS2699ReportsMissingAssertion(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2699_assertions_in_tests.AssertionsInTestsRule,
		nil,
		"file.ts",
		`
declare function require(moduleName: string): any;
declare function it(name: string, callback: () => void): void;

const chai = require('chai');

it('missing assertion', () => {
  const value = 1 + 1;
  value.toString();
});
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %#v", diagnostics)
	}

	if got := diagnostics[0].Message.Description; got != "Add at least one assertion to this test case." {
		t.Fatalf("unexpected diagnostic description %q", got)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "it" {
		t.Fatalf("expected diagnostic text %q, got %q", "it", got)
	}
}

func TestS2699AcceptsAssertionInHelperFunction(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2699_assertions_in_tests.AssertionsInTestsRule,
		nil,
		"file.ts",
		`
declare function require(moduleName: string): any;
declare function it(name: string, callback: () => void): void;

const chai = require('chai');

function verify(value: number) {
  chai.expect(value).to.equal(2);
}

it('delegates assertion', () => {
  verify(1 + 1);
});
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %#v", diagnostics)
	}
}

func TestS2699AcceptsDoneErrorAssertion(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2699_assertions_in_tests.AssertionsInTestsRule,
		nil,
		"file.ts",
		`
declare function require(moduleName: string): any;
declare function it(name: string, callback: (done: (error?: unknown) => void) => void): void;

const chai = require('chai');

it('uses done', done => {
  done(new Error('boom'));
});
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %#v", diagnostics)
	}
}

func TestS2699RequiresSupportedAssertionLibrary(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2699_assertions_in_tests.AssertionsInTestsRule,
		nil,
		"file.ts",
		`
declare function it(name: string, callback: () => void): void;

it('missing assertion', () => {
  const value = 1 + 1;
  value.toString();
});
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics without a supported assertion library, got %#v", diagnostics)
	}
}
