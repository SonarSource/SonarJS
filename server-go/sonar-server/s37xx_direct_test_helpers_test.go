package main

import (
	"testing"

	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
)

func assertS37xxDiagnosticCount(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want int) {
	t.Helper()
	assertDiagnosticCount(t, diagnostics, want)
}

func assertS37xxSingleDiagnosticMessageID(t *testing.T, diagnostics []rulepkg.RuleDiagnostic, want string) {
	t.Helper()
	assertSingleDiagnosticMessageID(t, diagnostics, want)
}
