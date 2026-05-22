package s7059_no_async_constructor

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildNoAsyncConstructorMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "noAsyncConstructor",
		Description: "Refactor this asynchronous operation outside of the constructor.",
	}
}

func asyncStatementInsideConstructor(node *ast.Node) *ast.Node {
	var statement *ast.Node

	for current := node.Parent; current != nil; current = current.Parent {
		if current.Kind == ast.KindConstructor {
			return statement
		}

		if ast.IsFunctionLikeDeclaration(current) {
			return nil
		}

		if statement == nil && ast.IsStatement(current) {
			statement = current
		}
	}

	return nil
}

var NoAsyncConstructorRule = rule.Rule{
	Name: "no-async-constructor",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		flaggedStatements := map[*ast.Node]struct{}{}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				if !utils.IsThenableType(ctx.TypeChecker, node, nil) {
					return
				}

				statement := asyncStatementInsideConstructor(node)
				if statement == nil {
					return
				}

				if _, ok := flaggedStatements[statement]; ok {
					return
				}
				flaggedStatements[statement] = struct{}{}

				ctx.ReportNode(statement, buildNoAsyncConstructorMessage())
			},
		}
	},
}
