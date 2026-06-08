package main

import (
	"testing"

	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func TestKnownGlobalsForConfigurationIncludesExplicitGlobalsAndEnvironmentGlobals(t *testing.T) {
	t.Parallel()

	globals := []string{"customGlobal"}
	environments := []string{"browser", "unknown-environment"}

	knownGlobals := knownGlobalsForConfiguration(NormalizedProjectConfiguration{
		Globals:      &globals,
		Environments: &environments,
	})

	if !knownGlobals["customGlobal"] {
		t.Fatalf("expected explicit global to be present")
	}
	if !knownGlobals["alert"] {
		t.Fatalf("expected browser environment globals to include alert")
	}
	if knownGlobals["unknown-environment"] {
		t.Fatalf("did not expect unknown environment name to be treated as a global")
	}
}

func TestConfiguredRuleForInjectsKnownGlobalsIntoRuleContext(t *testing.T) {
	t.Parallel()

	knownGlobals := map[string]bool{
		"alert":        true,
		"customGlobal": true,
	}

	var got map[string]bool
	configuredRule := configuredRuleFor(rulepkg.Rule{
		Name: "test-rule",
		Run: func(ctx rulepkg.RuleContext, options any) rulepkg.RuleListeners {
			got = ctx.KnownGlobals
			return nil
		},
	}, requestedRuleConfig{}, knownGlobals)

	configuredRule.Run(rulepkg.RuleContext{})

	if got == nil {
		t.Fatal("expected configured rule to receive known globals")
	}
	if !got["alert"] || !got["customGlobal"] {
		t.Fatalf("expected known globals to be injected, got %#v", got)
	}
}

func TestResolveValueNamePrefersLocalSymbolsOverConfiguredGlobals(t *testing.T) {
	t.Parallel()

	sourceFile, typeChecker, done := programForCode(t, `
const String = globalThis.String;
const value = {};
String(value);
`)
	defer done()

	callExpression := findFirstNode(t, sourceFile, func(node *ast.Node) bool {
		return ast.IsCallExpression(node) &&
			ast.IsIdentifier(node.AsCallExpression().Expression) &&
			node.AsCallExpression().Expression.AsIdentifier().Text == "String"
	}).AsCallExpression()

	resolution := rulepkg.ResolveValueName(rulepkg.RuleContext{
		SourceFile:   sourceFile,
		TypeChecker:  typeChecker,
		KnownGlobals: map[string]bool{"String": true},
	}, callExpression.Expression, "String")

	if resolution.LocalSymbol == nil {
		t.Fatal("expected String to resolve to a local symbol")
	}
	if resolution.AnySymbol == nil {
		t.Fatal("expected String to resolve to some symbol")
	}
	if resolution.ConfiguredGlobalOnly {
		t.Fatal("did not expect locally shadowed String to be treated as configured-global-only")
	}
	if rulepkg.ResolvesToGlobalValue(rulepkg.RuleContext{
		SourceFile:   sourceFile,
		TypeChecker:  typeChecker,
		KnownGlobals: map[string]bool{"String": true},
	}, callExpression.Expression, "String") {
		t.Fatal("did not expect locally shadowed String to resolve as a global value")
	}
}

func TestNoBaseToStringReportsBuiltInStringCall(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-base-to-string",
		nil,
		"file.ts",
		`
const obj = {};
String(obj);
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 1 {
		t.Fatalf("expected one diagnostic for built-in String(obj), got %d", len(diagnostics))
	}
}

func TestNoBaseToStringDoesNotUseBuiltInShortcutForShadowedString(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-base-to-string",
		nil,
		"file.ts",
		`
const String = globalThis.String;
const obj = {};
String(obj);
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostic for shadowed String(obj), got %d", len(diagnostics))
	}
}
