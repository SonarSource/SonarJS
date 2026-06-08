package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/no_misused_new"
)

func TestNoMisusedNewReportsMatchingClassAndInterfaceConstructors(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_misused_new.NoMisusedNewRule,
		nil,
		"file.ts",
		`
declare class Builder {
  new(): Builder;
  new(value: string): string;
}

interface Shape {
  new(): Shape;
  constructor(): void;
}
`,
		"tsconfig.minimal.json",
		"",
	)

	if len(diagnostics) != 3 {
		t.Fatalf("expected 3 diagnostics, got %#v", diagnostics)
	}

	classCount := 0
	interfaceCount := 0
	for _, diagnostic := range diagnostics {
		switch diagnostic.Message.Id {
		case "errorMessageClass":
			classCount++
		case "errorMessageInterface":
			interfaceCount++
		default:
			t.Fatalf("unexpected diagnostic %#v", diagnostic.Message)
		}
	}

	if classCount != 1 || interfaceCount != 2 {
		t.Fatalf("expected 1 class diagnostic and 2 interface diagnostics, got %#v", diagnostics)
	}
}

func TestNoMisusedNewSkipsNonMatchingReturnTypes(t *testing.T) {
	t.Parallel()

	diagnostics := runDirectRuleOnCode(
		t,
		no_misused_new.NoMisusedNewRule,
		nil,
		"file.ts",
		`
declare class Builder {
  new(): string;
}

interface Shape {
  new(): number;
}

type Factory = {
  new(): Shape;
};
`,
		"tsconfig.minimal.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
