package main

import "testing"

func TestDisabledAutoEscapingReportsUniqueUnsafeHandlebarsOptions(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"disabled-auto-escaping",
		nil,
		"file.ts",
		`
declare function require(name: string): any;

const Handlebars = require("handlebars");
const source = "<p>attack {{name}}</p>";
const options = {
  noEscape: true
};

Handlebars.compile(source, options);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "disabledAutoEscaping")
}

func TestDisabledAutoEscapingSkipsOptionsWithMultipleWrites(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"disabled-auto-escaping",
		nil,
		"file.ts",
		`
declare function require(name: string): any;
declare const condition: boolean;

const Handlebars = require("handlebars");
const source = "<p>attack {{name}}</p>";
let options = {
  noEscape: true
};

if (condition) {
  options = {
    noEscape: false
  };
}

Handlebars.compile(source, options);
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestDisabledAutoEscapingReportsIdentityMustacheEscapeFunction(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"disabled-auto-escaping",
		nil,
		"file.ts",
		`
declare function require(name: string): any;

const MustacheModule = require("mustache");

function invalidSanitizer(text: string) {
  return text;
}

MustacheModule.escape = invalidSanitizer;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "disabledAutoEscaping")
}

func TestDisabledAutoEscapingReportsUnsafeKramedRenderer(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"disabled-auto-escaping",
		nil,
		"file.ts",
		`
declare function require(name: string): any;

const kramed = require("kramed");

new kramed.Renderer({ sanitize: false });
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "disabledAutoEscaping")
}
