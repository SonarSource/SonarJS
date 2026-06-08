package no_constructor_return

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildUnexpectedMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpected",
		Description: "Unexpected return statement in constructor.",
	}
}

var NoConstructorReturnRule = rule.Rule{
	Name: "no-constructor-return",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		constructorStack := make([]bool, 0, 4)

		enter := func(isConstructor bool) {
			constructorStack = append(constructorStack, isConstructor)
		}

		exit := func() {
			if len(constructorStack) == 0 {
				return
			}
			constructorStack = constructorStack[:len(constructorStack)-1]
		}

		inConstructor := func() bool {
			return len(constructorStack) > 0 && constructorStack[len(constructorStack)-1]
		}

		return rule.RuleListeners{
			ast.KindFunctionDeclaration:                      func(node *ast.Node) { enter(false) },
			rule.ListenerOnExit(ast.KindFunctionDeclaration): func(node *ast.Node) { exit() },
			ast.KindFunctionExpression:                       func(node *ast.Node) { enter(false) },
			rule.ListenerOnExit(ast.KindFunctionExpression):  func(node *ast.Node) { exit() },
			ast.KindArrowFunction:                            func(node *ast.Node) { enter(false) },
			rule.ListenerOnExit(ast.KindArrowFunction):       func(node *ast.Node) { exit() },
			ast.KindMethodDeclaration:                        func(node *ast.Node) { enter(false) },
			rule.ListenerOnExit(ast.KindMethodDeclaration):   func(node *ast.Node) { exit() },
			ast.KindGetAccessor:                              func(node *ast.Node) { enter(false) },
			rule.ListenerOnExit(ast.KindGetAccessor):         func(node *ast.Node) { exit() },
			ast.KindSetAccessor:                              func(node *ast.Node) { enter(false) },
			rule.ListenerOnExit(ast.KindSetAccessor):         func(node *ast.Node) { exit() },
			ast.KindConstructor:                              func(node *ast.Node) { enter(true) },
			rule.ListenerOnExit(ast.KindConstructor):         func(node *ast.Node) { exit() },
			ast.KindReturnStatement: func(node *ast.Node) {
				if !inConstructor() {
					return
				}

				if node.AsReturnStatement().Expression == nil {
					return
				}

				ctx.ReportNode(node, buildUnexpectedMessage())
			},
		}
	},
}
