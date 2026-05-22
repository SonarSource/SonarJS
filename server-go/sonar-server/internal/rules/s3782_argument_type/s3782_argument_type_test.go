package s3782_argument_type

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

var cachedS3782DirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func runS3782RuleOnCode(
	t *testing.T,
	fileName string,
	code string,
	tsconfigName string,
) []rule.RuleDiagnostic {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	filePath := tspath.ResolvePath(rootDir, fileName)
	overlays := map[string]string{filePath: code}
	fs := utils.NewOverlayVFS(cachedS3782DirectRuleTestFS, overlays)
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
			Name: ArgumentTypeRule.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return ArgumentTypeRule.Run(ctx, nil)
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

func assertS3782DiagnosticCount(t *testing.T, diagnostics []rule.RuleDiagnostic, want int) {
	t.Helper()

	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func assertS3782SingleDiagnosticMessageID(t *testing.T, diagnostics []rule.RuleDiagnostic, want string) {
	t.Helper()

	assertS3782DiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}

func s3782DiagnosticText(t *testing.T, diagnostic rule.RuleDiagnostic) string {
	t.Helper()
	return diagnostic.SourceFile.Text()[diagnostic.Range.Pos():diagnostic.Range.End()]
}

func TestS3782ArgumentTypeReportsBuiltinMethodMismatch(t *testing.T) {
	t.Parallel()

	if ArgumentTypeRule.Name != "argument-type" {
		t.Fatalf("unexpected rule name %q", ArgumentTypeRule.Name)
	}

	diagnostics := runS3782RuleOnCode(t, "file.ts", `Math.abs("42");`, "tsconfig.minimal.json")

	assertS3782SingleDiagnosticMessageID(t, diagnostics, argumentTypeMessageID)
	if got := diagnostics[0].Message.Description; got != "Verify that argument is of correct type: expected 'number' instead of 'string'." {
		t.Fatalf("unexpected message %q", got)
	}
}

func TestS3782ArgumentTypeReportsArrayMethodMismatch(t *testing.T) {
	t.Parallel()

	diagnostics := runS3782RuleOnCode(t, "file.ts", `
const values = [1, 2, 3];
values.slice(false);
`, "tsconfig.minimal.json")

	assertS3782SingleDiagnosticMessageID(t, diagnostics, argumentTypeMessageID)
	if got := s3782DiagnosticText(t, diagnostics[0]); got != "false" {
		t.Fatalf("expected diagnostic text %q, got %q", "false", got)
	}
}

func TestS3782ArgumentTypeSkipsExcludedOrValidCases(t *testing.T) {
	t.Parallel()

	diagnostics := runS3782RuleOnCode(t, "file.ts", `
const text = "str";
text.charAt(5);

const regex = RegExp("foo*");
regex.test(false);
`, "tsconfig.minimal.json")

	assertS3782DiagnosticCount(t, diagnostics, 0)
}
