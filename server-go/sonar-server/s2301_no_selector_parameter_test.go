package main

import (
	"testing"

	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2301_no_selector_parameter"
	"github.com/microsoft/typescript-go/shim/ast"
)

func assertS2301DiagnosticCount(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want int) {
	t.Helper()

	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func assertS2301SingleDiagnosticMessageID(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want string) {
	t.Helper()

	assertS2301DiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}

func findFirstS2301Node(t *testing.T, sourceFile *ast.SourceFile, predicate func(node *ast.Node) bool) *ast.Node {
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

func TestS2301NoSelectorParameterReportsBooleanSelector(t *testing.T) {
	t.Parallel()

	if s2301_no_selector_parameter.NoSelectorParameterRule.Name != "no-selector-parameter" {
		t.Fatalf("unexpected rule name %q", s2301_no_selector_parameter.NoSelectorParameterRule.Name)
	}

	diagnostics := runDirectRuleOnCode(
		t,
		s2301_no_selector_parameter.NoSelectorParameterRule,
		nil,
		"file.ts",
		`
declare function offerLiquor(name: string): void;
declare function offerCandy(name: string): void;

function tempt(name: string, ofAge: boolean) {
  if (ofAge) {
    offerLiquor(name);
  } else {
    offerCandy(name);
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS2301SingleDiagnosticMessageID(t, diagnostics, "selectorParameter")
	if got := diagnosticText(t, diagnostics[0]); got != "ofAge" {
		t.Fatalf("expected diagnostic text %q, got %q", "ofAge", got)
	}
	if diagnostics[0].Message.Description != `Provide multiple methods instead of using "ofAge" to determine which action to take.` {
		t.Fatalf("unexpected message %q", diagnostics[0].Message.Description)
	}
}

func TestS2301NoSelectorParameterSkipsPureTransformationsAndDestructuring(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2301_no_selector_parameter.NoSelectorParameterRule,
		nil,
		"file.ts",
		`
function transform(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function fromObject({ isField }: { isField: boolean }) {
  return isField ? console.log(1) : console.log(2);
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS2301DiagnosticCount(t, diagnostics, 0)
}

func TestS2301NoSelectorParameterSkipsEventHandlerProperties(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		s2301_no_selector_parameter.NoSelectorParameterRule,
		nil,
		"file.ts",
		`
const inputConfig = {
  onFinish: (value: string, success: boolean) => {
    if (success) {
      save(value);
    } else {
      cancel(value);
    }
  },
};
`,
		"tsconfig.minimal.json",
		"",
	)

	assertS2301DiagnosticCount(t, diagnostics, 0)
}
