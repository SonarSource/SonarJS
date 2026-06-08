package s2817_web_sql_database

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const openDatabaseName = "openDatabase"

func buildConvertWebSQLUseMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "convertWebSQLUse",
		Description: "Convert this use of a Web SQL database to another technology.",
	}
}

func isOpenDatabaseIdentifier(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil && ast.IsIdentifier(node) && node.AsIdentifier().Text == openDatabaseName
}

func isWindowLikeReceiver(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if ctx.TypeChecker == nil || node == nil {
		return false
	}

	typeName := strings.ToLower(ctx.TypeChecker.TypeToString(ctx.TypeChecker.GetTypeAtLocation(node)))
	return strings.Contains(typeName, "window") || strings.Contains(typeName, "globalthis")
}

var WebSQLDatabaseRule = rule.Rule{
	Name: "web-sql-database",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				callee := ast.SkipParentheses(callExpr.Expression)
				if callee == nil {
					return
				}

				if isOpenDatabaseIdentifier(callee) && !rule.IsValueNameShadowedLocally(ctx, callee, openDatabaseName) {
					ctx.ReportNode(callee, buildConvertWebSQLUseMessage())
					return
				}

				if !ast.IsPropertyAccessExpression(callee) {
					return
				}

				memberExpr := callee.AsPropertyAccessExpression()
				name := memberExpr.Name()
				if name == nil || name.Text() != openDatabaseName {
					return
				}
				if !isWindowLikeReceiver(ctx, memberExpr.Expression) {
					return
				}

				ctx.ReportNode(callee, buildConvertWebSQLUseMessage())
			},
		}
	},
}
