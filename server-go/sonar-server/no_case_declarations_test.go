package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_case_declarations"
)

func TestNoCaseDeclarationsReportsBlockScopedVariableStatements(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_case_declarations.NoCaseDeclarationsRule,
		nil,
		"file.ts",
		`
function select(kind: string) {
  switch (kind) {
    case 'let':
      let value = 1;
      break;
    default:
      const fallback = 2;
      return fallback;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	for _, diagnostic := range diagnostics {
		if diagnostic.Message.Id != "unexpected" {
			t.Fatalf("expected message id %q, got %#v", "unexpected", diagnostic.Message)
		}
	}
}

func TestNoCaseDeclarationsReportsFunctionAndClassDeclarations(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_case_declarations.NoCaseDeclarationsRule,
		nil,
		"file.ts",
		`
function select(kind: string) {
  switch (kind) {
    case 'function':
      function build() {
        return 1;
      }
      return build();
    default:
      class Fallback {}
      return new Fallback();
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 2)
	for _, diagnostic := range diagnostics {
		if diagnostic.Message.Id != "unexpected" {
			t.Fatalf("expected message id %q, got %#v", "unexpected", diagnostic.Message)
		}
	}
}

func TestNoCaseDeclarationsSkipsVarAndNestedLexicalDeclarations(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		no_case_declarations.NoCaseDeclarationsRule,
		nil,
		"file.ts",
		`
function select(kind: string) {
  switch (kind) {
    case 'wrapped': {
      let value = 1;
      return value;
    }
    default:
      var fallback = 2;
      return fallback;
  }
}
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
