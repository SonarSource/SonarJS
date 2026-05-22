package s4328_no_implicit_dependencies

import (
	"strings"
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

var cachedS4328DirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func runS4328RuleOnCode(
	t *testing.T,
	fileName string,
	tsconfigName string,
	overlays map[string]string,
	options any,
) []rule.RuleDiagnostic {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	absoluteOverlays := map[string]string{}
	for relativePath, content := range overlays {
		absoluteOverlays[tspath.ResolvePath(rootDir, relativePath)] = content
	}

	filePath := tspath.ResolvePath(rootDir, fileName)
	fs := utils.NewOverlayVFS(cachedS4328DirectRuleTestFS, absoluteOverlays)
	host := utils.CreateCompilerHost(rootDir, fs)

	program, _, err := utils.CreateProgram(true, fs, rootDir, tsconfigName, host, true)
	if err != nil {
		t.Fatalf("could not create program: %v", err)
	}
	if program == nil {
		t.Fatal("expected program to be created")
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
			Name: NoImplicitDependenciesRule.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return NoImplicitDependenciesRule.Run(ctx, options)
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

func diagnosticText(t *testing.T, diagnostic rule.RuleDiagnostic) string {
	t.Helper()
	return diagnostic.SourceFile.Text()[diagnostic.Range.Pos():diagnostic.Range.End()]
}

func TestS4328ReportsMissingDependenciesAndSkipsAllowedImports(t *testing.T) {
	t.Parallel()

	fileName := "s4328/project/src/file.ts"
	tsconfigName := "s4328/project/tsconfig.json"
	diagnostics := runS4328RuleOnCode(t, fileName, tsconfigName, map[string]string{
		fileName: `
import declared from "declared";
import fs from "node:fs/promises";
import relativeValue from "./relative";
import moduleAliasValue from "moduleAlias";
import "missing";

const alsoMissing = require("another-missing");
`,
		"s4328/project/src/relative.ts": `export const relativeValue = 1;`,
		tsconfigName: `{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src/**/*.ts"]
}`,
		"s4328/project/package.json": `{
  "dependencies": {
    "declared": "1.0.0"
  },
  "_moduleAliases": {
    "moduleAlias": "src/relative"
  }
}`,
	}, nil)

	if len(diagnostics) != 2 {
		t.Fatalf("expected 2 diagnostics, got %#v", diagnostics)
	}

	if got := diagnosticText(t, diagnostics[0]); got != "import" {
		t.Fatalf("expected first diagnostic text %q, got %q", "import", got)
	}
	if got := strings.TrimSpace(diagnosticText(t, diagnostics[1])); got != "require" {
		t.Fatalf("expected second diagnostic text %q, got %q", "require", got)
	}
}

func TestS4328AcceptsDenoNpmImportAliases(t *testing.T) {
	t.Parallel()

	fileName := "s4328/deno/file.ts"
	tsconfigName := "s4328/deno/tsconfig.json"
	diagnostics := runS4328RuleOnCode(t, fileName, tsconfigName, map[string]string{
		fileName: `
import "react";
import "scopedAlias";
import "missing";
`,
		tsconfigName: `{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["file.ts"]
}`,
		"s4328/deno/deno.json": `{
  "imports": {
    "react": "npm:react@19.0.0",
    "scopedAlias": "npm:@scope/pkg@1.2.3/subpath"
  }
}`,
	}, nil)

	if len(diagnostics) != 1 {
		t.Fatalf("expected 1 diagnostic, got %#v", diagnostics)
	}
	if got := diagnosticText(t, diagnostics[0]); got != "import" {
		t.Fatalf("expected diagnostic text %q, got %q", "import", got)
	}
}
