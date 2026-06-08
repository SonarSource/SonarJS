package main

import (
	"testing"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/s2817_web_sql_database"
)

func TestWebSQLDatabaseReportsWindowOpenDatabase(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s2817_web_sql_database.WebSQLDatabaseRule,
		nil,
		"file.ts",
		`
const win = window;

win.openDatabase('db', '1.0', 'desc', 1024);
`,
		"tsconfig.lib-dom.json",
		"",
	)

	assertSingleDiagnosticMessageID(t, diagnostics, "convertWebSQLUse")
}

func TestWebSQLDatabaseAllowsShadowedOpenDatabase(t *testing.T) {
	t.Parallel()

	diagnostics := runRuleOnCode(
		t,
		s2817_web_sql_database.WebSQLDatabaseRule,
		nil,
		"file.ts",
		`
function openDatabase() {}

openDatabase();
`,
		"tsconfig.lib-dom.json",
		"",
	)

	assertDiagnosticCount(t, diagnostics, 0)
}
