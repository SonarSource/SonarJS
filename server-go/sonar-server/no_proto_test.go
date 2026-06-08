package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_proto"
)

func TestNoProtoReportsPropertyAccess(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_proto.NoProtoRule,
		nil,
		"file.ts",
		`
const object = {};
const value = object.__proto__;
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpectedProto")
	if got := diagnosticText(t, diagnostics[0]); got != "object.__proto__" {
		t.Fatalf("unexpected diagnostic text %q", got)
	}
}

func TestNoProtoReportsStringLiteralElementAccess(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_proto.NoProtoRule,
		nil,
		"file.ts",
		`
const object = {};
const value = object["__proto__"];
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "unexpectedProto")
}

func TestNoProtoSkipsNonProtoAccess(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_proto.NoProtoRule,
		nil,
		"file.ts",
		`
const object = {};
const value = object["prototype"];
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
