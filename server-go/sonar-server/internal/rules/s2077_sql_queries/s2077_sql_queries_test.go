package s2077_sql_queries

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

var cachedS2077DirectRuleTestFS = cachedvfs.From(bundled.WrapFS(osvfs.FS()))

func runS2077RuleOnCode(
	t *testing.T,
	fileName string,
	code string,
	tsconfigName string,
) []rule.RuleDiagnostic {
	t.Helper()

	rootDir := fixtures.GetRootDir()
	filePath := tspath.ResolvePath(rootDir, fileName)
	overlays := map[string]string{filePath: code}
	fs := utils.NewOverlayVFS(cachedS2077DirectRuleTestFS, overlays)
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
			Name: SQLQueriesRule.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return SQLQueriesRule.Run(ctx, nil)
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

func assertS2077DiagnosticCount(t *testing.T, diagnostics []rule.RuleDiagnostic, want int) {
	t.Helper()
	if len(diagnostics) != want {
		t.Fatalf("expected %d diagnostics, got %#v", want, diagnostics)
	}
}

func assertS2077SingleDiagnosticMessageID(t *testing.T, diagnostics []rule.RuleDiagnostic, want string) {
	t.Helper()
	assertS2077DiagnosticCount(t, diagnostics, 1)
	if diagnostics[0].Message.Id != want {
		t.Fatalf("expected message id %q, got %#v", want, diagnostics[0].Message)
	}
}

func TestSQLQueriesReportsNamespaceImportConcatenation(t *testing.T) {
	t.Parallel()

	diagnostics := runS2077RuleOnCode(t, "file.ts", `
import * as mysql from 'mysql';

declare const host: string;
declare const user: string;
declare const password: string;
declare const database: string;
declare const userInput: string;

const conn = mysql.createConnection({ host, user, password, database });
conn.query('SELECT * FROM users WHERE id = ' + userInput);
`, "tsconfig.minimal.json")

	assertS2077SingleDiagnosticMessageID(t, diagnostics, safeQueryMessageID)
}

func TestSQLQueriesReportsRequireReplaceCall(t *testing.T) {
	t.Parallel()

	diagnostics := runS2077RuleOnCode(t, "file.ts", `
const mysql = require('mysql');

declare const host: string;
declare const user: string;
declare const password: string;
declare const database: string;
declare const sql: string;

const conn = mysql.createConnection({ host, user, password, database });
conn.query(sql.replace('?', '42'));
`, "tsconfig.minimal.json")

	assertS2077SingleDiagnosticMessageID(t, diagnostics, safeQueryMessageID)
}

func TestSQLQueriesAllowsLiteralQuery(t *testing.T) {
	t.Parallel()

	diagnostics := runS2077RuleOnCode(t, "file.ts", `
import * as mysql from 'mysql';

declare const host: string;
declare const user: string;
declare const password: string;
declare const database: string;

const conn = mysql.createConnection({ host, user, password, database });
conn.query('SELECT * FROM users');
`, "tsconfig.minimal.json")

	assertS2077DiagnosticCount(t, diagnostics, 0)
}

func TestSQLQueriesAllowsQueryIdentifier(t *testing.T) {
	t.Parallel()

	diagnostics := runS2077RuleOnCode(t, "file.ts", `
import * as mysql from 'mysql';

declare const host: string;
declare const user: string;
declare const password: string;
declare const database: string;
declare const userInput: string;

const conn = mysql.createConnection({ host, user, password, database });
const query = 'SELECT * FROM users WHERE id = ' + userInput;
conn.query(query);
`, "tsconfig.minimal.json")

	assertS2077DiagnosticCount(t, diagnostics, 0)
}
