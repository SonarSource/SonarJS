package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s5860_unused_named_groups"
)

func TestS5860ReportsIndexedMatcherGroups(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5860_unused_named_groups.UnusedNamedGroupsRule,
		nil,
		"file.ts",
		`const pattern = /(?<foo>\w)/;
const matched = 'str'.match(pattern);
if (matched) {
  matched[1];
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
	if len(diagnostics[0].LabeledRanges) != 1 {
		t.Fatalf("expected group secondary location, got %#v", diagnostics[0].LabeledRanges)
	}
}

func TestS5860ReportsUnusedAndMissingNamedGroups(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5860_unused_named_groups.UnusedNamedGroupsRule,
		nil,
		"file.ts",
		`const pattern = /(?<foo>\w)(?<bar>\w)/;
const matched = 'str'.match(pattern);
if (matched) {
  matched.groups.foo;
  matched.groups.baz;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
}

func TestS5860ReportsNumericReplacementReferences(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s5860_unused_named_groups.UnusedNamedGroupsRule,
		nil,
		"file.ts",
		`const pattern = /(?<foo>\w)/;
'str'.replace(pattern, '$1');
`,
		"tsconfig.minimal.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "issue")
}
