package s6759_prefer_read_only_props

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

var cachedS6759DirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func runS6759RuleOnCode(
	t *testing.T,
	fileName string,
	code string,
	tsconfigName string,
) []rule.RuleDiagnostic {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	filePath := tspath.ResolvePath(rootDir, fileName)
	overlays := map[string]string{
		filePath: code,
		tspath.ResolvePath(rootDir, tsconfigName): `{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "jsx": "preserve"
  },
  "include": ["*.ts", "*.tsx"]
}`,
	}

	fs := utils.NewOverlayVFS(cachedS6759DirectRuleTestFS, overlays)
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
			Name: PreferReadOnlyPropsRule.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return PreferReadOnlyPropsRule.Run(ctx, nil)
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

func TestS6759DoesNotCrashOnReturnOutsideFunction(t *testing.T) {
	t.Parallel()

	diagnostics := runS6759RuleOnCode(t, "s6759/file.ts", `
if (true) {
  return;
}
`, "s6759/tsconfig.json")

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %#v", diagnostics)
	}
}

func TestS6759ReportsMutablePropsAndSuggestsReadonly(t *testing.T) {
	t.Parallel()

	diagnostics := runS6759RuleOnCode(t, "s6759/component.tsx", `
interface Props {
  title: string;
}

function Card(props: Props) {
  return <div>{props.title}</div>;
}
`, "s6759/tsconfig.json")

	if len(diagnostics) != 1 {
		t.Fatalf("expected 1 diagnostic, got %#v", diagnostics)
	}
	if diagnostics[0].Message.Id != readOnlyPropsMessageID {
		t.Fatalf("expected message id %q, got %#v", readOnlyPropsMessageID, diagnostics[0].Message)
	}

	suggestions := diagnostics[0].GetSuggestions()
	if len(suggestions) != 1 || suggestions[0].Message.Id != readOnlyPropsFixMessageID {
		t.Fatalf("expected one %q suggestion, got %#v", readOnlyPropsFixMessageID, suggestions)
	}
	if fixes := suggestions[0].Fixes(); len(fixes) != 1 || fixes[0].Text != "Readonly<Props>" {
		t.Fatalf("expected Readonly<Props> fix, got %#v", fixes)
	}
}

func TestS6759SkipsReadonlyUtilityTypes(t *testing.T) {
	t.Parallel()

	diagnostics := runS6759RuleOnCode(t, "s6759/readonly.tsx", `
interface BaseProps {
  readonly title: string;
  readonly body: string;
  readonly hidden: boolean;
}

type Props = Omit<BaseProps, 'hidden'>;

function ReadonlyCard(props: Props) {
  return <div>{props.title}{props.body}</div>;
}
`, "s6759/tsconfig.json")

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %#v", diagnostics)
	}
}
