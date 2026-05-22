package no_setter_return

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildReturnsValueMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "returnsValue",
		Description: "Setter cannot return a value.",
	}
}

func getPropertyName(node *ast.Node) (string, bool) {
	switch {
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text, true
	case ast.IsStringLiteral(node), node.Kind == ast.KindNoSubstitutionTemplateLiteral:
		return node.Text(), true
	case ast.IsNumericLiteral(node):
		return node.AsNumericLiteral().Text, true
	default:
		return "", false
	}
}

func getStaticMemberPropertyName(node *ast.Node) (string, bool) {
	switch {
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		if name == nil {
			return "", false
		}
		return name.Text(), true
	case ast.IsElementAccessExpression(node):
		argument := ast.SkipParentheses(node.AsElementAccessExpression().ArgumentExpression)
		if argument == nil {
			return "", false
		}
		if ast.IsStringLiteral(argument) || argument.Kind == ast.KindNoSubstitutionTemplateLiteral {
			return argument.Text(), true
		}
	default:
		return "", false
	}

	return "", false
}

func isGlobalMethodCallArgument(
	ctx rule.RuleContext,
	node *ast.Node,
	objectName string,
	methodName string,
	index int,
) bool {
	parent := node.Parent
	if !ast.IsCallExpression(parent) {
		return false
	}

	callExpr := parent.AsCallExpression()
	if len(callExpr.Arguments.Nodes) <= index || callExpr.Arguments.Nodes[index] != node {
		return false
	}

	callee := ast.SkipParentheses(callExpr.Expression)
	propertyName, ok := getStaticMemberPropertyName(callee)
	if !ok || propertyName != methodName {
		return false
	}

	var receiver *ast.Node
	switch {
	case ast.IsPropertyAccessExpression(callee):
		receiver = callee.AsPropertyAccessExpression().Expression
	case ast.IsElementAccessExpression(callee):
		receiver = callee.AsElementAccessExpression().Expression
	default:
		return false
	}

	receiver = ast.SkipParentheses(receiver)
	return ast.IsIdentifier(receiver) &&
		receiver.AsIdentifier().Text == objectName &&
		rule.ResolvesToGlobalValue(ctx, receiver, objectName)
}

func isPropertyDescriptor(ctx rule.RuleContext, node *ast.Node) bool {
	if isGlobalMethodCallArgument(ctx, node, "Object", "defineProperty", 2) ||
		isGlobalMethodCallArgument(ctx, node, "Reflect", "defineProperty", 2) {
		return true
	}

	parent := node.Parent
	if !ast.IsPropertyAssignment(parent) || parent.AsPropertyAssignment().Initializer != node {
		return false
	}

	descriptorObject := parent.Parent
	if !ast.IsObjectLiteralExpression(descriptorObject) {
		return false
	}

	return isGlobalMethodCallArgument(ctx, descriptorObject, "Object", "create", 1) ||
		isGlobalMethodCallArgument(ctx, descriptorObject, "Object", "defineProperties", 1)
}

func isDescriptorSetterFunction(ctx rule.RuleContext, node *ast.Node) bool {
	parent := node.Parent
	if !ast.IsPropertyAssignment(parent) || ast.SkipParentheses(parent.AsPropertyAssignment().Initializer) != node {
		return false
	}

	propertyName, ok := getPropertyName(parent.AsPropertyAssignment().Name())
	if !ok || propertyName != "set" {
		return false
	}

	return ast.IsObjectLiteralExpression(parent.Parent) && isPropertyDescriptor(ctx, parent.Parent)
}

var NoSetterReturnRule = rule.Rule{
	Name: "no-setter-return",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		setterStack := make([]bool, 0, 4)

		enter := func(node *ast.Node, isSetter bool) {
			setterStack = append(setterStack, isSetter)

			if !isSetter || !ast.IsArrowFunction(node) {
				return
			}

			body := node.AsArrowFunction().Body
			if body != nil && body.Kind != ast.KindBlock {
				ctx.ReportNode(body, buildReturnsValueMessage())
			}
		}

		exit := func() {
			if len(setterStack) == 0 {
				return
			}
			setterStack = setterStack[:len(setterStack)-1]
		}

		inSetter := func() bool {
			return len(setterStack) > 0 && setterStack[len(setterStack)-1]
		}

		return rule.RuleListeners{
			ast.KindFunctionDeclaration:                      func(node *ast.Node) { enter(node, false) },
			rule.ListenerOnExit(ast.KindFunctionDeclaration): func(node *ast.Node) { exit() },
			ast.KindFunctionExpression: func(node *ast.Node) {
				enter(node, isDescriptorSetterFunction(ctx, node))
			},
			rule.ListenerOnExit(ast.KindFunctionExpression): func(node *ast.Node) { exit() },
			ast.KindArrowFunction: func(node *ast.Node) {
				enter(node, isDescriptorSetterFunction(ctx, node))
			},
			rule.ListenerOnExit(ast.KindArrowFunction):     func(node *ast.Node) { exit() },
			ast.KindMethodDeclaration:                      func(node *ast.Node) { enter(node, false) },
			rule.ListenerOnExit(ast.KindMethodDeclaration): func(node *ast.Node) { exit() },
			ast.KindConstructor:                            func(node *ast.Node) { enter(node, false) },
			rule.ListenerOnExit(ast.KindConstructor):       func(node *ast.Node) { exit() },
			ast.KindGetAccessor:                            func(node *ast.Node) { enter(node, false) },
			rule.ListenerOnExit(ast.KindGetAccessor):       func(node *ast.Node) { exit() },
			ast.KindSetAccessor:                            func(node *ast.Node) { enter(node, true) },
			rule.ListenerOnExit(ast.KindSetAccessor):       func(node *ast.Node) { exit() },
			ast.KindReturnStatement: func(node *ast.Node) {
				if !inSetter() {
					return
				}

				returnStmt := node.AsReturnStatement()
				if returnStmt.Expression != nil {
					ctx.ReportNode(node, buildReturnsValueMessage())
				}
			},
		}
	},
}
