package main

import (
	"strings"
	"sync"
	"testing"

	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/parser"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
	pb "github.com/typescript-eslint/tsgolint/cmd/sonar-server/grpc"
	"github.com/typescript-eslint/tsgolint/internal/diagnostic"
	"github.com/typescript-eslint/tsgolint/internal/linter"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/rules/fixtures"
	"github.com/typescript-eslint/tsgolint/internal/utils"
	"google.golang.org/protobuf/types/known/structpb"
)

var cachedBaseFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func TestDecorateRuleFiltersDiagnostics(t *testing.T) {
	t.Parallel()

	var diagnostics []rule.RuleDiagnostic
	baseRule := rule.Rule{
		Name: "sample-rule",
		Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
			ctx.ReportDiagnostic(rule.RuleDiagnostic{
				Range:   core.NewTextRange(0, 1),
				Message: rule.RuleMessage{Id: "drop"},
			})
			ctx.ReportDiagnostic(rule.RuleDiagnostic{
				Range:   core.NewTextRange(1, 2),
				Message: rule.RuleMessage{Id: "keep"},
			})
			return nil
		},
	}

	decoratedRule := DecorateRule(baseRule, RuleDecorator{
		FilterDiagnostic: func(ctx rule.RuleContext, diagnostic rule.RuleDiagnostic) bool {
			return diagnostic.Message.Id != "drop"
		},
	})

	decoratedRule.Run(rule.RuleContext{
		ReportDiagnostic: func(diagnostic rule.RuleDiagnostic) {
			diagnostics = append(diagnostics, diagnostic)
		},
	}, nil)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %d", len(diagnostics))
	}
	if diagnostics[0].Message.Id != "keep" {
		t.Fatalf("expected kept diagnostic, got %q", diagnostics[0].Message.Id)
	}
}

func TestDecorateRuleMergesExtraListeners(t *testing.T) {
	t.Parallel()

	var calls []string
	baseRule := rule.Rule{
		Name: "sample-rule",
		Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
			return rule.RuleListeners{
				ast.KindIdentifier: func(node *ast.Node) {
					calls = append(calls, "base")
				},
			}
		},
	}

	decoratedRule := DecorateRule(baseRule, RuleDecorator{
		ExtraListeners: func(ctx rule.RuleContext) rule.RuleListeners {
			return rule.RuleListeners{
				ast.KindIdentifier: func(node *ast.Node) {
					calls = append(calls, "extra")
				},
			}
		},
	})

	listeners := decoratedRule.Run(rule.RuleContext{}, nil)
	listeners[ast.KindIdentifier](nil)

	if len(calls) != 2 || calls[0] != "base" || calls[1] != "extra" {
		t.Fatalf("expected merged listener calls [base extra], got %#v", calls)
	}
}

func TestDecorateRuleFiltersReportNodeDiagnostics(t *testing.T) {
	t.Parallel()

	sourceFile := parser.ParseSourceFile(ast.SourceFileParseOptions{
		FileName: "/test.ts",
		Path:     "/test.ts",
	}, "type Test = string;", core.ScriptKindTS)
	node := sourceFile.Statements.Nodes[0].AsTypeAliasDeclaration().Name()

	var diagnostics []rule.RuleDiagnostic
	baseRule := rule.Rule{
		Name: "sample-rule",
		Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
			ctx.ReportNode(node, rule.RuleMessage{Id: "drop"})
			ctx.ReportNode(node, rule.RuleMessage{Id: "keep"})
			return nil
		},
	}

	decoratedRule := DecorateRule(baseRule, RuleDecorator{
		FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
			return diagnostic.Message.Id != "drop"
		},
	})

	decoratedRule.Run(rule.RuleContext{
		SourceFile: sourceFile,
		ReportDiagnostic: func(diagnostic rule.RuleDiagnostic) {
			diagnostics = append(diagnostics, diagnostic)
		},
	}, nil)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %d", len(diagnostics))
	}
	if diagnostics[0].Message.Id != "keep" {
		t.Fatalf("expected kept diagnostic, got %q", diagnostics[0].Message.Id)
	}
}

func TestDecorateRuleTransformsNodeDiagnostics(t *testing.T) {
	t.Parallel()

	sourceFile := parser.ParseSourceFile(ast.SourceFileParseOptions{
		FileName: "/test.ts",
		Path:     "/test.ts",
	}, "const value = 1;", core.ScriptKindTS)
	node := findIdentifier(t, sourceFile, "value")
	expectedRange := core.NewTextRange(0, 5)

	var diagnostics []rule.RuleDiagnostic
	baseRule := rule.Rule{
		Name: "sample-rule",
		Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
			ctx.ReportNode(node, rule.RuleMessage{Id: "keep"})
			return nil
		},
	}

	decoratedRule := DecorateRule(baseRule, RuleDecorator{
		TransformNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) rule.RuleDiagnostic {
			diagnostic.Range = expectedRange
			return diagnostic
		},
	})

	decoratedRule.Run(rule.RuleContext{
		SourceFile: sourceFile,
		ReportDiagnostic: func(diagnostic rule.RuleDiagnostic) {
			diagnostics = append(diagnostics, diagnostic)
		},
	}, nil)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %d", len(diagnostics))
	}
	if diagnostics[0].Range != expectedRange {
		t.Fatalf("expected transformed range %v, got %v", expectedRange, diagnostics[0].Range)
	}
}

func TestDecorateRuleConvertsFixesToSuggestions(t *testing.T) {
	t.Parallel()

	textRange := core.NewTextRange(0, 1)
	baseRule := rule.Rule{
		Name: "sample-rule",
		Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
			ctx.ReportDiagnosticWithFixes(rule.RuleDiagnostic{
				Range:   textRange,
				Message: rule.RuleMessage{Id: "replace", Description: "Replace it."},
			}, func() []rule.RuleFix {
				return []rule.RuleFix{{Range: textRange, Text: "b"}}
			})
			return nil
		},
	}

	decoratedRule := DecorateRule(baseRule, RuleDecorator{ConvertFixesToSuggests: true})

	var diagnostics []rule.RuleDiagnostic
	decoratedRule.Run(rule.RuleContext{
		ReportDiagnosticWithFixes: func(diagnostic rule.RuleDiagnostic, fixesFn func() []rule.RuleFix) {
			t.Fatal("expected fixes to be converted to suggestions")
		},
		ReportDiagnosticWithSuggestions: func(diagnostic rule.RuleDiagnostic, suggestionsFn func() []rule.RuleSuggestion) {
			suggestions := suggestionsFn()
			diagnostic.Suggestions = &suggestions
			diagnostics = append(diagnostics, diagnostic)
		},
	}, nil)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %d", len(diagnostics))
	}
	suggestions := diagnostics[0].GetSuggestions()
	if len(suggestions) != 1 {
		t.Fatalf("expected one suggestion, got %d", len(suggestions))
	}
	if suggestions[0].Message.Id != "replace" {
		t.Fatalf("expected suggestion message id to be preserved, got %q", suggestions[0].Message.Id)
	}
	fixes := suggestions[0].Fixes()
	if len(fixes) != 1 || fixes[0].Text != "b" {
		t.Fatalf("expected converted fix, got %#v", fixes)
	}
}

func TestNoBaseToStringDecoratorSuppressesGenericTypes(t *testing.T) {
	t.Parallel()

	genericFile, genericChecker, genericDone := programForCode(t, "function f<T>(value: T) { return `${value}`; }")
	defer genericDone()
	genericNode := findIdentifier(t, genericFile, "value")
	if NoBaseToStringDecorator.FilterNodeDiagnostic(rule.RuleContext{
		TypeChecker: genericChecker,
	}, genericNode, rule.RuleDiagnostic{}) {
		t.Fatal("expected generic type parameter diagnostic to be suppressed")
	}

	stringFile, stringChecker, stringDone := programForCode(t, "const value = 'x'; value.toString();")
	defer stringDone()
	stringNode := findIdentifier(t, stringFile, "value")
	if !NoBaseToStringDecorator.FilterNodeDiagnostic(rule.RuleContext{
		TypeChecker: stringChecker,
	}, stringNode, rule.RuleDiagnostic{}) {
		t.Fatal("expected non-generic diagnostic to be kept")
	}
}

func TestNoMisusedPromisesDecoratorSuppressesLazyInitialization(t *testing.T) {
	t.Parallel()

	sourceFile := parser.ParseSourceFile(ast.SourceFileParseOptions{
		FileName: "/test.ts",
		Path:     "/test.ts",
	}, `
let cached: Promise<string>;
function getValue(): Promise<string> {
  if (!cached) {
    cached = Promise.resolve("value");
  }
  return cached;
}
`, core.ScriptKindTS)

	node := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) && node.AsIdentifier().Text == "cached" && firstLocalIfStatement(node) != nil
	})
	if NoMisusedPromisesDecorator.FilterNodeDiagnostic(rule.RuleContext{SourceFile: sourceFile}, node, rule.RuleDiagnostic{
		Message: rule.RuleMessage{Id: "conditional"},
	}) {
		t.Fatal("expected lazy initialization conditional diagnostic to be suppressed")
	}
}

func TestNoMisusedPromisesDecoratorRelocatesFunctionHead(t *testing.T) {
	t.Parallel()

	sourceFile := parser.ParseSourceFile(ast.SourceFileParseOptions{
		FileName: "/test.ts",
		Path:     "/test.ts",
	}, "declare function onEvent(callback: () => void): void; onEvent(async () => {});", core.ScriptKindTS)

	arrow := findFirstNode(t, sourceFile, ast.IsArrowFunction)
	expectedRange := utils.GetFunctionHeadLoc(sourceFile, arrow)
	diagnostic := NoMisusedPromisesDecorator.TransformNodeDiagnostic(rule.RuleContext{
		SourceFile: sourceFile,
	}, arrow, rule.RuleDiagnostic{})

	if diagnostic.Range != expectedRange {
		t.Fatalf("expected function head range %v, got %v", expectedRange, diagnostic.Range)
	}
}

func TestNoRedundantTypeConstituentsDecoratorSuppressesErrorTypes(t *testing.T) {
	t.Parallel()

	keep := rule.RuleDiagnostic{Message: rule.RuleMessage{Id: "literalOverridden"}}
	drop := rule.RuleDiagnostic{Message: rule.RuleMessage{Id: "errorTypeOverrides"}}

	if !NoRedundantTypeConstituentsDecorator.FilterDiagnostic(rule.RuleContext{}, keep) {
		t.Fatal("expected literalOverridden diagnostic to be kept")
	}
	if NoRedundantTypeConstituentsDecorator.FilterDiagnostic(rule.RuleContext{}, drop) {
		t.Fatal("expected errorTypeOverrides diagnostic to be suppressed")
	}
}

func TestPreferStringStartsEndsWithDecoratorConvertsFixesToSuggestions(t *testing.T) {
	t.Parallel()

	if !PreferStringStartsEndsWithDecorator.ConvertFixesToSuggests {
		t.Fatal("expected prefer-string-starts-ends-with fixes to be converted to suggestions")
	}
}

func TestRequestedRuleConfigsExpandS6544AndMergeDefaults(t *testing.T) {
	t.Parallel()

	requested := requestedRuleConfigs([]*pb.JsTsRule{{Key: "S6544"}})
	if _, ok := requested["no-misused-promises"]; !ok {
		t.Fatal("expected S6544 to request no-misused-promises")
	}
	if _, ok := requested["no-async-promise-executor"]; !ok {
		t.Fatal("expected S6544 to request no-async-promise-executor companion rule")
	}

	options, ok := requested["no-misused-promises"].Options.(map[string]any)
	if !ok {
		t.Fatalf("expected S6544 options to be a map, got %#v", requested["no-misused-promises"].Options)
	}
	checksVoidReturn, ok := options["checksVoidReturn"].(map[string]any)
	if !ok {
		t.Fatalf("expected checksVoidReturn options map, got %#v", options["checksVoidReturn"])
	}
	if checksVoidReturn["arguments"] != false || checksVoidReturn["attributes"] != false || checksVoidReturn["properties"] != false {
		t.Fatalf("expected merged S6544 defaults, got %#v", checksVoidReturn)
	}
}

func TestS6544DefaultOptionsSuppressVoidReturnArguments(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-misused-promises",
		optionsForRequestedRule(&pb.JsTsRule{Key: "S6544"}),
		"file.ts",
		"declare function onEvent(callback: () => void): void; onEvent(async () => {});",
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected default S6544 options to suppress void-return argument diagnostics, got %#v", diagnostics)
	}
}

func TestS6544ChecksVoidReturnTrueReportsAtFunctionHead(t *testing.T) {
	t.Parallel()

	options := optionsForRequestedRule(&pb.JsTsRule{
		Key:            "S6544",
		Configurations: []*structpb.Value{mustValue(t, map[string]any{"checksVoidReturn": true})},
	})
	code := "declare function onEvent(callback: () => void): void; onEvent(async () => {});"
	diagnostics := runNamedRuleOnCode(t, "no-misused-promises", options, "file.ts", code, "tsconfig.minimal.json", "")

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %#v", diagnostics)
	}

	sourceFile := parser.ParseSourceFile(ast.SourceFileParseOptions{
		FileName: "/test.ts",
		Path:     "/test.ts",
	}, code, core.ScriptKindTS)
	expectedRange := utils.GetFunctionHeadLoc(sourceFile, findFirstNode(t, sourceFile, ast.IsArrowFunction))
	if diagnostics[0].Range.Pos() != expectedRange.Pos() {
		t.Fatalf("expected diagnostic to start at function head %d, got %d", expectedRange.Pos(), diagnostics[0].Range.Pos())
	}
}

func TestNoAsyncPromiseExecutorRuleReportsOnJavaScriptOnly(t *testing.T) {
	t.Parallel()

	code := "new Promise(async resolve => { resolve(1); });"
	jsDiagnostics := runNamedRuleOnCode(t, "no-async-promise-executor", nil, "repro.js", code, "tsconfig.checkJs.json", "")
	if len(jsDiagnostics) != 1 {
		t.Fatalf("expected one JavaScript diagnostic, got %#v", jsDiagnostics)
	}

	tsDiagnostics := runNamedRuleOnCode(t, "no-async-promise-executor", nil, "file.ts", code, "tsconfig.minimal.json", "")
	if len(tsDiagnostics) != 0 {
		t.Fatalf("expected no TypeScript diagnostics, got %#v", tsDiagnostics)
	}
}

func TestPreferOptionalChainDecoratorSuppressesTypedReturnFalsePositive(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-optional-chain",
		nil,
		"file.ts",
		"function getLen(arr: string[] | null): number | null { return arr && arr.length; }",
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics for type-unsafe optional chain context, got %#v", diagnostics)
	}
}

func TestPreferOptionalChainDecoratorKeepsBooleanContextDiagnostic(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-optional-chain",
		nil,
		"file.ts",
		"function f(arr: string[] | null) { if (arr && arr.length) {} }",
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic in boolean context, got %#v", diagnostics)
	}
}

func TestPreferNullishCoalescingDefaultOptionsSuppressFalsePositives(t *testing.T) {
	t.Parallel()

	options := optionsForRequestedRule(&pb.JsTsRule{Key: "S6606"})
	cases := []struct {
		name string
		code string
	}{
		{
			name: "primitive union",
			code: "function foo(value: string | null) { return value || 'default'; }",
		},
		{
			name: "object union",
			code: "function foo(value: { baz: number } | null) { return value || 'default'; }",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			diagnostics := runNamedRuleOnCode(t, "prefer-nullish-coalescing", options, "file.ts", tc.code, "tsconfig.minimal.json", "")
			if len(diagnostics) != 0 {
				t.Fatalf("expected no diagnostics, got %#v", diagnostics)
			}
		})
	}
}

func TestPreferNullishCoalescingDefaultOptionsKeepNullishOnlyDiagnostic(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-nullish-coalescing",
		optionsForRequestedRule(&pb.JsTsRule{Key: "S6606"}),
		"file.ts",
		"const x: null | undefined = undefined; const y = x || '';",
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic, got %#v", diagnostics)
	}
}

func TestPreferNullishCoalescingDecoratorSuppressesOnlyTheNoStrictDiagnostic(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-nullish-coalescing",
		optionsForRequestedRule(&pb.JsTsRule{Key: "S6606"}),
		"file.ts",
		"const x: null | undefined = undefined; const y = x || '';",
		"tsconfig.decorator.no-strict.json",
		"{\"compilerOptions\": {}}",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one issue after suppressing the noStrictNullCheck diagnostic, got %#v", diagnostics)
	}
	if diagnostics[0].Message.Id == "noStrictNullCheck" {
		t.Fatalf("expected noStrictNullCheck diagnostic to be suppressed, got %#v", diagnostics)
	}
}

func TestNoRedundantTypeConstituentsDecoratorSuppressesUnresolvedTopTypes(t *testing.T) {
	t.Parallel()

	sourceText := "type Test = Alias | any | UnknownAlias | unknown;"
	sourceFile := parser.ParseSourceFile(ast.SourceFileParseOptions{
		FileName: "/test.ts",
		Path:     "/test.ts",
	}, sourceText, core.ScriptKindTS)

	cases := []struct {
		name        string
		reported    string
		description string
		expected    bool
	}{
		{
			name:        "suppress any alias",
			reported:    "Alias",
			description: "'any' overrides all other types in this union type.",
			expected:    false,
		},
		{
			name:        "keep any keyword",
			reported:    "any",
			description: "'any' overrides all other types in this union type.",
			expected:    true,
		},
		{
			name:        "suppress unknown alias",
			reported:    "UnknownAlias",
			description: "'unknown' overrides all other types in this union type.",
			expected:    false,
		},
		{
			name:        "keep unknown keyword",
			reported:    "unknown",
			description: "'unknown' overrides all other types in this union type.",
			expected:    true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			start := strings.Index(sourceText, tc.reported)
			if start < 0 {
				t.Fatalf("could not find %q in test source", tc.reported)
			}

			diagnostic := rule.RuleDiagnostic{
				Range:      core.NewTextRange(start, start+len(tc.reported)),
				Message:    rule.RuleMessage{Id: "overrides", Description: tc.description},
				SourceFile: sourceFile,
			}
			got := NoRedundantTypeConstituentsDecorator.FilterDiagnostic(rule.RuleContext{}, diagnostic)
			if got != tc.expected {
				t.Fatalf("expected filter result %v, got %v", tc.expected, got)
			}
		})
	}
}

func programForCode(t *testing.T, code string) (*ast.SourceFile, *checker.Checker, func()) {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	filePath := tspath.ResolvePath(rootDir, "file.ts")
	fs := utils.NewOverlayVFSForFile(filePath, code)

	program, _, err := utils.CreateProgram(true, fs, rootDir, "tsconfig.minimal.json", utils.CreateCompilerHost(rootDir, fs), false)
	if err != nil {
		t.Fatalf("could not create program: %v", err)
	}
	sourceFile := program.GetSourceFile(filePath)
	typeChecker, done := program.GetTypeChecker(t.Context())
	return sourceFile, typeChecker, done
}

func runNamedRuleOnCode(
	t *testing.T,
	ruleName string,
	options any,
	fileName string,
	code string,
	tsconfigName string,
	tsconfigContent string,
) []rule.RuleDiagnostic {
	t.Helper()

	ruleToRun, ok := allRulesByName[ruleName]
	if !ok {
		t.Fatalf("unknown rule %q", ruleName)
	}

	rootDir := fixtures.GetRootDir()
	filePath := tspath.ResolvePath(rootDir, fileName)
	overlays := map[string]string{filePath: code}
	if tsconfigContent != "" {
		overlays[tspath.ResolvePath(rootDir, tsconfigName)] = tsconfigContent
	}

	fs := utils.NewOverlayVFS(cachedBaseFS, overlays)
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
	err = linter.RunLinterOnProgram(
		utils.LogLevelNormal,
		program,
		[]*ast.SourceFile{sourceFile},
		1,
		func(sourceFile *ast.SourceFile) []linter.ConfiguredRule {
			return []linter.ConfiguredRule{{
				Name: ruleName,
				Run: func(ctx rule.RuleContext) rule.RuleListeners {
					return ruleToRun.Run(ctx, options)
				},
			}}
		},
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

func findIdentifier(t *testing.T, sourceFile *ast.SourceFile, text string) *ast.Node {
	t.Helper()

	return findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsIdentifier(node) && node.AsIdentifier().Text == text
	})
}

func findFirstNode(t *testing.T, sourceFile *ast.SourceFile, predicate func(node *ast.Node) bool) *ast.Node {
	t.Helper()

	var found *ast.Node
	var visit ast.Visitor
	visit = func(node *ast.Node) bool {
		if found != nil {
			return true
		}
		if predicate(node) {
			found = node
			return true
		}
		node.ForEachChild(visit)
		return found != nil
	}
	sourceFile.Node.ForEachChild(visit)

	if found == nil {
		t.Fatal("could not find matching node")
	}
	return found
}

func mustValue(t *testing.T, value any) *structpb.Value {
	t.Helper()

	result, err := structpb.NewValue(value)
	if err != nil {
		t.Fatalf("could not create protobuf value: %v", err)
	}
	return result
}
