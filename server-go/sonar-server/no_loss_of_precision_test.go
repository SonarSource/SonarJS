package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_loss_of_precision"
)

func TestNoLossOfPrecisionReportsUnsafeDecimalLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_loss_of_precision.NoLossOfPrecisionRule,
		nil,
		"repro.js",
		`
const value = 9007199254740993;
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noLossOfPrecision")
}

func TestNoLossOfPrecisionReportsUnsafeHexLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_loss_of_precision.NoLossOfPrecisionRule,
		nil,
		"repro.js",
		`
const value = 0x20000000000001;
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "noLossOfPrecision")
}

func TestNoLossOfPrecisionSkipsSafeLiteral(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_loss_of_precision.NoLossOfPrecisionRule,
		nil,
		"repro.js",
		`
const value = 9007199254740991;
`,
		"tsconfig.checkJs.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
