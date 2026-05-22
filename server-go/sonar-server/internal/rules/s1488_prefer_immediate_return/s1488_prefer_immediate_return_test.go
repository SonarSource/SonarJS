package s1488_prefer_immediate_return

import (
	"sync"
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/linter"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/fixtures"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
)

var cachedDirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func runRuleOnCode(
	t *testing.T,
	fileName string,
	code string,
	tsconfigName string,
) []rule.RuleDiagnostic {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	filePath := tspath.ResolvePath(rootDir, fileName)
	overlays := map[string]string{filePath: code}
	fs := utils.NewOverlayVFS(cachedDirectRuleTestFS, overlays)
	host := utils.CreateCompilerHost(rootDir, fs)

	program, _, err := utils.CreateProgram(true, fs, rootDir, tsconfigName, host, false)
	if err != nil {
		t.Fatalf("could not create program: %v", err)
	}

	sourceFile := program.GetSourceFile(filePath)
	if sourceFile == nil {
		t.Fatalf("could not load source file %q", filePath)
	}

	var (
		mu          sync.Mutex
		diagnostics []rule.RuleDiagnostic
	)
	err = linter.RunLinterOnFile(
		utils.LogLevelNormal,
		program,
		sourceFile,
		[]linter.ConfiguredRule{{
			Name: PreferImmediateReturnRule.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return PreferImmediateReturnRule.Run(ctx, nil)
			},
		}},
		func(diagnostic rule.RuleDiagnostic) {
			mu.Lock()
			defer mu.Unlock()
			diagnostics = append(diagnostics, diagnostic)
		},
		func(d diagnostic.Internal) {},
		linter.Fixes{Fix: false, FixSuggestions: false},
		linter.TypeErrors{ReportSyntactic: false, ReportSemantic: false},
	)
	if err != nil {
		t.Fatalf("unexpected linter error: %v", err)
	}

	return diagnostics
}

func assertDiagnosticCount(t *testing.T, diagnostics []rule.RuleDiagnostic, want int) {
	t.Helper()
	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func assertSingleDiagnosticMessageID(t *testing.T, diagnostics []rule.RuleDiagnostic, want string) {
	t.Helper()
	assertDiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}

func TestPreferImmediateReturnReportsTemporaryReturn(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(t, "file.ts", `
function wrap() {
  const result = compute();
  return result;
}
`, "tsconfig.minimal.json")

	assertSingleDiagnosticMessageID(t, diagnostics, "doImmediateAction")
}

func TestPreferImmediateReturnSkipsFunctionTypedTemporary(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(t, "file.ts", `
const makeHandler = () => {
  const handler = () => {};
  return handler;
};
`, "tsconfig.minimal.json")

	assertDiagnosticCount(t, diagnostics, 0)
}

func TestPreferImmediateReturnSkipsAdditionalReadInNestedClosure(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(t, "file.ts", `
function wrap() {
  const value = compute();
  sink(() => value);
  return value;
}
`, "tsconfig.minimal.json")

	assertDiagnosticCount(t, diagnostics, 0)
}
