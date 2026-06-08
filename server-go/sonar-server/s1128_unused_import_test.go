package main

import "testing"

func TestS1128ReportsUnusedDefaultImport(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"unused-import",
		nil,
		"file.ts",
		`import a from 'b';`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "removeUnusedImport")
	suggestions := diagnostics[0].GetSuggestions()
	if len(suggestions) != 1 {
		t.Fatalf("expected 1 suggestion, got %#v", suggestions)
	}
	if got := suggestions[0].Message.Description; got != "Remove this import statement" {
		t.Fatalf("unexpected suggestion %q", got)
	}
}

func TestS1128ReportsUnusedNamedImport(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"unused-import",
		nil,
		"file.ts",
		`import a, {b} from 'b'; console.log(a);`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "removeUnusedImport")
	suggestions := diagnostics[0].GetSuggestions()
	if len(suggestions) != 1 {
		t.Fatalf("expected 1 suggestion, got %#v", suggestions)
	}
	if got := suggestions[0].Fixes()[0].Text; got != "" {
		t.Fatalf("expected removal fix, got replacement text %q", got)
	}
}

func TestS1128SkipsJSXUsageAndNamespaceTypeUsage(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"unused-import",
		nil,
		"component-usage.tsx",
		`
import { a } from 'b';
import * as Foo from 'foobar';

let value: Foo.Bar;
const Component = () => <a />;
`,
		"tsconfig.s1128.component-usage.json",
		`{
  "compilerOptions": {
    "jsx": "preserve",
    "target": "esnext",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "lib": ["esnext"],
    "experimentalDecorators": true,
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "types": []
  },
  "include": ["component-usage.tsx"]
}`,
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestS1128SkipsJSXPragmaAndReactImport(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"unused-import",
		nil,
		"component-pragma.tsx",
		`
/** @jsx jsx */
import React from 'react';
import { jsx } from '@emotion/core';
const Component = () => <div />;
`,
		"tsconfig.s1128.component-pragma.json",
		`{
  "compilerOptions": {
    "jsx": "preserve",
    "target": "esnext",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "lib": ["esnext"],
    "experimentalDecorators": true,
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "types": []
  },
  "include": ["component-pragma.tsx"]
}`,
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
