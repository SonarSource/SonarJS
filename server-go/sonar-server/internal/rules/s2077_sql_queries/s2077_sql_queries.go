package s2077_sql_queries

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const safeQueryMessageID = "safeQuery"

var sqlQuerySignatures = map[string]struct{}{
	"pg.Client.query":                    {},
	"pg.Pool.query":                      {},
	"mysql.createConnection.query":       {},
	"mysql.createPool.query":             {},
	"mysql.createPoolCluster.query":      {},
	"mysql2.createConnection.query":      {},
	"mysql2.createPool.query":            {},
	"mysql2.createPoolCluster.query":     {},
	"sequelize.Sequelize.query":          {},
	"sqlite3.Database.run":               {},
	"sqlite3.Database.get":               {},
	"sqlite3.Database.all":               {},
	"sqlite3.Database.each":              {},
	"sqlite3.Database.exec":              {},
	"better-sqlite3.exec":                {},
	"better-sqlite3.prepare":             {},
	"mssql.ConnectionPool.query":         {},
	"mssql.Request.query":                {},
	"mssql.Request.batch":                {},
	"mssql.Request.execute":              {},
	"mysql2.createConnection.execute":    {},
	"oracledb.getConnection.execute":     {},
	"oracledb.getConnection.executeMany": {},
	"oracledb.getConnection.queryStream": {},
	"pg-promise.any":                     {},
	"pg-promise.each":                    {},
	"pg-promise.func":                    {},
	"pg-promise.many":                    {},
	"pg-promise.manyOrNone":              {},
	"pg-promise.map":                     {},
	"pg-promise.multi":                   {},
	"pg-promise.multiResult":             {},
	"pg-promise.none":                    {},
	"pg-promise.one":                     {},
	"pg-promise.oneOrNone":               {},
	"pg-promise.proc":                    {},
	"pg-promise.query":                   {},
	"pg-promise.result":                  {},
	"knex.raw":                           {},
	"knex.whereRaw":                      {},
	"knex.havingRaw":                     {},
	"knex.groupByRaw":                    {},
	"knex.orderByRaw":                    {},
	"knex.joinRaw":                       {},
	"typeorm.createConnection.query":     {},
	"typeorm.getConnection.query":        {},
	"typeorm.getManager.query":           {},
	"typeorm.getRepository.query":        {},
}

func buildSafeQueryMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          safeQueryMessageID,
		Description: "Make sure that executing SQL queries is safe here.",
	}
}

var SQLQueriesRule = rule.Rule{
	Name: "sql-queries",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				args := node.Arguments()
				if len(args) == 0 {
					return
				}

				fqn := fullyQualifiedNameTS(ctx, node)
				if fqn == "" {
					return
				}
				if _, ok := sqlQuerySignatures[fqn]; !ok {
					return
				}
				if !isQuestionableSQLQuery(args[0]) {
					return
				}

				ctx.ReportNode(ast.SkipParentheses(node.Expression()), buildSafeQueryMessage())
			},
		}
	},
}

func fullyQualifiedNameTS(ctx rule.RuleContext, rootNode *ast.Node) string {
	if ctx.TypeChecker == nil || rootNode == nil {
		return ""
	}

	parts := make([]string, 0, 4)
	node := rootNode
	visited := map[*ast.Node]struct{}{}

	for node != nil {
		node = ast.SkipParentheses(node)
		if node == nil {
			return ""
		}
		if _, ok := visited[node]; ok {
			return ""
		}
		visited[node] = struct{}{}

		switch node.Kind {
		case ast.KindCallExpression:
			if isRequireCall(node) {
				args := node.Arguments()
				if len(args) != 1 {
					return ""
				}
				node = args[0]
			} else {
				node = node.Expression()
			}
		case ast.KindFunctionDeclaration:
			name := node.Name()
			if name == nil {
				return ""
			}
			parts = append(parts, name.Text())
			node = node.Parent
		case ast.KindPropertyAccessExpression:
			name := node.AsPropertyAccessExpression().Name()
			if name == nil {
				return ""
			}
			parts = append(parts, name.Text())
			node = node.AsPropertyAccessExpression().Expression
		case ast.KindImportSpecifier, ast.KindBindingElement:
			name := declarationNameText(node.PropertyNameOrName())
			if name == "" {
				return ""
			}
			parts = append(parts, name)
			node = node.Parent
		case ast.KindNamespaceImport:
			node = node.Parent
		case ast.KindImportDeclaration, ast.KindJSImportDeclaration:
			node = node.AsImportDeclaration().ModuleSpecifier
		case ast.KindSourceFile:
			return ""
		case ast.KindVariableDeclaration:
			initializer := node.AsVariableDeclaration().Initializer
			if initializer == nil {
				return ""
			}
			node = initializer
		case ast.KindIdentifier:
			symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
			declaration := firstDeclaration(symbol)
			if isCompilerModule(symbol) || declaration == nil || declaration == node || declaration.Contains(rootNode) {
				parts = append(parts, node.AsIdentifier().Text)
				return finalizeFQN(parts)
			}
			node = declaration
		case ast.KindStringLiteral, ast.KindNoSubstitutionTemplateLiteral:
			parts = append(parts, node.Text())
			return finalizeFQN(parts)
		case ast.KindImportClause, ast.KindObjectBindingPattern, ast.KindBlock, ast.KindExpressionStatement, ast.KindNamedImports, ast.KindModuleBlock:
			node = node.Parent
		default:
			return ""
		}
	}

	return ""
}

func isRequireCall(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsCallExpression(node) {
		return false
	}

	args := node.Arguments()
	if len(args) != 1 {
		return false
	}

	callee := ast.SkipParentheses(node.Expression())
	return callee != nil && ast.IsIdentifier(callee) && callee.AsIdentifier().Text == "require"
}

func firstDeclaration(symbol *ast.Symbol) *ast.Node {
	if symbol == nil || len(symbol.Declarations) == 0 {
		return nil
	}
	return symbol.Declarations[0]
}

func isCompilerModule(symbol *ast.Symbol) bool {
	return symbol != nil &&
		symbol.Flags&ast.SymbolFlagsModule != 0 &&
		symbol.Flags&ast.SymbolFlagsAssignment != 0
}

func declarationNameText(node *ast.Node) string {
	if node == nil {
		return ""
	}

	switch {
	case ast.IsIdentifier(node), ast.IsStringOrNumericLiteralLike(node), node.Kind == ast.KindBigIntLiteral:
		return node.Text()
	case ast.IsComputedPropertyName(node):
		expr := ast.SkipParentheses(node.Expression())
		if expr != nil && (ast.IsIdentifier(expr) || ast.IsStringOrNumericLiteralLike(expr) || expr.Kind == ast.KindBigIntLiteral) {
			return expr.Text()
		}
	}

	return ""
}

func finalizeFQN(parts []string) string {
	for left, right := 0, len(parts)-1; left < right; left, right = left+1, right-1 {
		parts[left], parts[right] = parts[right], parts[left]
	}
	return strings.TrimPrefix(strings.Join(parts, "."), "node:")
}

func isQuestionableSQLQuery(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	if isTemplateWithExpressions(node) {
		return true
	}
	if isConcatenation(node) {
		return isVariableConcat(node)
	}
	if !ast.IsCallExpression(node) {
		return false
	}

	memberName, ok := staticMemberName(node.Expression())
	return ok && (memberName == "concat" || memberName == "replace")
}

func isTemplateWithExpressions(node *ast.Node) bool {
	return node != nil &&
		node.Kind == ast.KindTemplateExpression &&
		len(node.AsTemplateExpression().TemplateSpans.Nodes) != 0
}

func isConcatenation(node *ast.Node) bool {
	return node != nil &&
		ast.IsBinaryExpression(node) &&
		node.AsBinaryExpression().OperatorToken.Kind == ast.KindPlusToken
}

func isVariableConcat(node *ast.Node) bool {
	left := ast.SkipParentheses(node.AsBinaryExpression().Left)
	right := ast.SkipParentheses(node.AsBinaryExpression().Right)

	if !isHardcodedLiteral(right) {
		return true
	}
	if isConcatenation(left) {
		return isVariableConcat(left)
	}
	return !isHardcodedLiteral(left)
}

func isHardcodedLiteral(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	return ast.IsLiteralExpression(node) ||
		node.Kind == ast.KindTrueKeyword ||
		node.Kind == ast.KindFalseKeyword ||
		node.Kind == ast.KindNullKeyword
}

func staticMemberName(node *ast.Node) (string, bool) {
	node = ast.SkipParentheses(node)
	if node == nil {
		return "", false
	}

	switch {
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		if name == nil {
			return "", false
		}
		return name.Text(), true
	case ast.IsElementAccessExpression(node):
		argument := ast.SkipParentheses(node.AsElementAccessExpression().ArgumentExpression)
		if argument != nil && (ast.IsStringLiteral(argument) || argument.Kind == ast.KindNoSubstitutionTemplateLiteral) {
			return argument.Text(), true
		}
	}

	return "", false
}
