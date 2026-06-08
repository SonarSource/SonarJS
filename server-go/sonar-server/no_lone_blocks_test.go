package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_lone_blocks"
)

func TestNoLoneBlocksReportsTopLevelRedundantBlock(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_lone_blocks.NoLoneBlocksRule,
		nil,
		"repro.js",
		`
{
  call();
}
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "redundantBlock")
}

func TestNoLoneBlocksReportsNestedOnlyChildBlock(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_lone_blocks.NoLoneBlocksRule,
		nil,
		"repro.js",
		`
function wrap() {
  {
    let value = 1;
    consume(value);
  }
}
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "redundantNestedBlock")
}

func TestNoLoneBlocksSkipsBlocksWithBlockScopedBindings(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_lone_blocks.NoLoneBlocksRule,
		nil,
		"repro.js",
		`
{
  let value = 1;
  consume(value);
}
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoLoneBlocksSkipsSingleSwitchCaseBlock(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_lone_blocks.NoLoneBlocksRule,
		nil,
		"repro.js",
		`
switch (value) {
  case 1: {
    call();
    break;
  }
}
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestNoLoneBlocksReportsSwitchCaseBlockWithSiblingStatement(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_lone_blocks.NoLoneBlocksRule,
		nil,
		"repro.js",
		`
switch (value) {
  case 1:
    {
      call();
    }
    break;
}
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "redundantBlock")
}

func TestNoLoneBlocksSkipsFunctionDeclarationBlockInDefaultModuleMode(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_lone_blocks.NoLoneBlocksRule,
		nil,
		"repro.js",
		`
{
  function work() {}
  work();
}
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
