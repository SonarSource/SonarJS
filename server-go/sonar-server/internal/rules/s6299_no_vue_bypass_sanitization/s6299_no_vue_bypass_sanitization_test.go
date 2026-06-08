package s6299_no_vue_bypass_sanitization

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

var cachedS6299DirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func runS6299RuleOnCode(
	t *testing.T,
	fileName string,
	tsconfigName string,
	overlays map[string]string,
) []rule.RuleDiagnostic {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	absoluteOverlays := map[string]string{}
	for relativePath, content := range overlays {
		absoluteOverlays[tspath.ResolvePath(rootDir, relativePath)] = content
	}

	filePath := tspath.ResolvePath(rootDir, fileName)
	fs := utils.NewOverlayVFS(cachedS6299DirectRuleTestFS, absoluteOverlays)
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
			Name: NoVueBypassSanitizationRule.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return NoVueBypassSanitizationRule.Run(ctx, nil)
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

func TestS6299ReportsJSXAttribute(t *testing.T) {
	t.Parallel()

	fileName := "s6299/component.tsx"
	tsconfigName := "s6299/tsconfig.json"
	diagnostics := runS6299RuleOnCode(t, fileName, tsconfigName, map[string]string{
		fileName: `
const view = <div domPropsInnerHTML={message}></div>;
`,
		tsconfigName: `{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "jsx": "preserve"
  },
  "include": ["*.tsx", "*.ts"]
}`,
	})

	if len(diagnostics) != 1 || diagnostics[0].Message.Id != safeVueBypassingMessageID {
		t.Fatalf("expected one %q diagnostic, got %#v", safeVueBypassingMessageID, diagnostics)
	}
}

func TestS6299ReportsDomPropsAndHrefPatterns(t *testing.T) {
	t.Parallel()

	fileName := "s6299/render.ts"
	tsconfigName := "s6299/tsconfig.json"
	diagnostics := runS6299RuleOnCode(t, fileName, tsconfigName, map[string]string{
		fileName: `
const vnode = {
  domProps: {
    innerHTML: html
  }
};

createElement("a", {
  attrs: {
    href: tainted
  }
});

h("a", {
  attrs: {
    href: tainted
  }
});
`,
		tsconfigName: `{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022"
  },
  "include": ["*.ts"]
}`,
	})

	if len(diagnostics) != 3 {
		t.Fatalf("expected 3 diagnostics, got %#v", diagnostics)
	}
}
