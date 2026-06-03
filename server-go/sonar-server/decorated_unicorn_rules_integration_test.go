package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

func TestNoArrayCallbackReferenceRuleReportsArrayCallbackReferences(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-array-callback-reference",
		nil,
		"file.ts",
		"['1', '2', '3'].map(parseInt);",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 1 {
		t.Fatalf("expected 1 diagnostic, got %d", len(diagnostics))
	}
	if got := diagnostics[0].Message.Description; got != "Do not pass function `parseInt` directly to `.map(\u2026)`." {
		t.Fatalf("unexpected message %q", got)
	}

	diagnostics = runNamedRuleOnCode(
		t,
		"no-array-callback-reference",
		nil,
		"file.ts",
		"const double = (value: number) => value * 2;\n[1, 2, 3].map(double);",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics for single-parameter callback, got %d", len(diagnostics))
	}
}

func TestNoArrayForEachRuleSuppressesNonIterableReceiver(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"no-array-for-each",
		nil,
		"file.ts",
		"const values = [1, 2, 3];\nvalues.forEach(value => console.log(value));",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 1 {
		t.Fatalf("expected 1 diagnostic, got %d", len(diagnostics))
	}
	if got := diagnostics[0].Message.Description; got != "Use `for\u2026of` instead of `.forEach(\u2026)`." {
		t.Fatalf("unexpected message %q", got)
	}

	diagnostics = runNamedRuleOnCode(
		t,
		"no-array-for-each",
		nil,
		"file.ts",
		"interface CustomCollection {\n  forEach(callback: (value: string) => void): void;\n}\n\ndeclare const collection: CustomCollection;\ncollection.forEach(value => console.log(value));",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics for non-iterable receiver, got %d", len(diagnostics))
	}
}

func TestPreferAtRuleHonorsAtMethodAvailability(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-at",
		nil,
		"file.ts",
		"const values = ['a', 'b', 'c'];\nconst last = values[values.length - 1];",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 1 {
		t.Fatalf("expected 1 diagnostic, got %d", len(diagnostics))
	}
	if got := diagnostics[0].Message.Description; got != "Prefer `.at(\u2026)` over `[\u2026.length - index]`." {
		t.Fatalf("unexpected message %q", got)
	}

	diagnostics = runNamedRuleOnCode(
		t,
		"prefer-at",
		nil,
		"file.ts",
		"interface LegacyList<T> {\n  length: number;\n  [index: number]: T;\n}\n\ndeclare const items: LegacyList<string>;\nconst last = items[items.length - 1];",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics when the receiver type has no at() method, got %d", len(diagnostics))
	}
}

func TestPreferAtRuleBaseRuleReportsNegativeIndexAccess(t *testing.T) {
	t.Parallel()

	sourceFile, checker, done := programForCode(t, `
const values = ['a', 'b', 'c'];
const last = values[values.length - 1];
`)
	defer done()

	var diagnostics []rule.RuleDiagnostic
	listeners := PreferAtRule.Run(rule.RuleContext{
		SourceFile:  sourceFile,
		TypeChecker: checker,
		ReportNode: func(node *ast.Node, msg rule.RuleMessage) {
			diagnostics = append(diagnostics, rule.RuleDiagnostic{
				Range:      utils.TrimNodeTextRange(sourceFile, node),
				Message:    msg,
				SourceFile: sourceFile,
			})
		},
	}, nil)

	listener := listeners[ast.KindBinaryExpression]
	if listener == nil {
		t.Fatal("expected prefer-at base rule to register a binary-expression listener")
	}

	node := findFirstNode(t, sourceFile, ast.IsBinaryExpression)
	parent := node.Parent
	if parent == nil || !ast.IsElementAccessExpression(parent) {
		t.Fatalf("expected binary expression parent to be element access, got %#v", parent)
	}
	binaryExpr := node.AsBinaryExpression()
	if !isMatchingLengthAccess(sourceFile, binaryExpr.Left, parent.AsElementAccessExpression().Expression) {
		t.Fatalf(
			"expected left operand %q to match receiver %q",
			sourceTextOfNode(sourceFile, binaryExpr.Left),
			sourceTextOfNode(sourceFile, parent.AsElementAccessExpression().Expression),
		)
	}
	if !isPositiveIntegerLiteral(binaryExpr.Right) {
		t.Fatalf("expected right operand to be a positive integer literal, got %q", sourceTextOfNode(sourceFile, binaryExpr.Right))
	}
	listener(node)

	if len(diagnostics) != 1 {
		t.Fatalf("expected base prefer-at rule to report once, got %d", len(diagnostics))
	}
}

func TestPreferSingleCallRuleSuppressesSingleArgumentCustomMethods(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-single-call",
		nil,
		"file.ts",
		"const items: number[] = [];\nitems.push(1);\nitems.push(2);",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 1 {
		t.Fatalf("expected 1 diagnostic, got %d", len(diagnostics))
	}
	if got := diagnostics[0].Message.Description; got != "Do not call `Array#push()` multiple times." {
		t.Fatalf("unexpected message %q", got)
	}

	diagnostics = runNamedRuleOnCode(
		t,
		"prefer-single-call",
		nil,
		"file.ts",
		"class CustomPusher {\n  push(item: number): void {}\n}\n\nconst instance = new CustomPusher();\ninstance.push(1);\ninstance.push(2);",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics for single-argument custom push, got %d", len(diagnostics))
	}
}

func TestPreferSingleCallRuleIgnoresFirstStatementWithoutPreviousCall(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-single-call",
		nil,
		"file.ts",
		"const items: number[] = [];\nitems.push(1);",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics for a first push statement, got %d", len(diagnostics))
	}
}

func TestPreferTopLevelAwaitRuleSuppressesSynchronousCatchChains(t *testing.T) {
	t.Parallel()

	diagnostics := runNamedRuleOnCode(
		t,
		"prefer-top-level-await",
		nil,
		"file.ts",
		"export {};\n\nPromise.resolve(42).catch(console.error);",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 1 {
		t.Fatalf("expected 1 diagnostic, got %d", len(diagnostics))
	}
	if got := diagnostics[0].Message.Description; got != "Prefer top-level await over using a promise chain." {
		t.Fatalf("unexpected message %q", got)
	}

	diagnostics = runNamedRuleOnCode(
		t,
		"prefer-top-level-await",
		nil,
		"file.ts",
		"export {};\n\nclass Schema {\n  catch(defaultValue: number): this {\n    return this;\n  }\n}\n\nconst schema = new Schema();\nschema.catch(0);",
		"tsconfig.minimal.json",
		"",
	)
	if len(diagnostics) != 0 {
		t.Fatalf("expected no diagnostics for synchronous catch chains, got %d", len(diagnostics))
	}
}
