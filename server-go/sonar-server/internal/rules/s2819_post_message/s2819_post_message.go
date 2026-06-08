package s2819_post_message

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const (
	postMessageName      = "postMessage"
	addEventListenerName = "addEventListener"
	specifyTargetID      = "specifyTarget"
	verifyOriginID       = "verifyOrigin"
)

func buildSpecifyTargetMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          specifyTargetID,
		Description: "Specify a target origin for this message.",
	}
}

func buildVerifyOriginMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          verifyOriginID,
		Description: "Verify the origin of the received message.",
	}
}

func isStringLiteralText(node *ast.Node, want string) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	switch {
	case ast.IsStringLiteral(node), ast.IsNoSubstitutionTemplateLiteral(node):
		return node.Text() == want
	default:
		return false
	}
}

func resolvedStringValue(ctx rule.RuleContext, node *ast.Node) (string, bool) {
	node = ast.SkipParentheses(node)
	if node == nil {
		return "", false
	}

	switch {
	case ast.IsStringLiteral(node), ast.IsNoSubstitutionTemplateLiteral(node):
		return node.Text(), true
	case ast.IsIdentifier(node):
		if ctx.TypeChecker == nil {
			return "", false
		}

		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		if symbol == nil || symbol.ValueDeclaration == nil || !ast.IsVariableDeclaration(symbol.ValueDeclaration) {
			return "", false
		}

		return resolvedStringValue(ctx, symbol.ValueDeclaration.AsVariableDeclaration().Initializer)
	default:
		return "", false
	}
}

func containsWindowLikeIdentifier(node *ast.Node) bool {
	if node == nil {
		return false
	}

	found := false
	var visit ast.Visitor
	visit = func(current *ast.Node) bool {
		if current == nil || found {
			return found
		}

		if ast.IsIdentifier(current) {
			name := strings.ToLower(current.AsIdentifier().Text)
			if strings.Contains(name, "window") || name == "globalthis" {
				found = true
				return true
			}
		}

		current.ForEachChild(visit)
		return found
	}

	visit(node)
	return found
}

func isWindowLikeNode(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	if ctx.TypeChecker != nil {
		typeName := strings.ToLower(ctx.TypeChecker.TypeToString(ctx.TypeChecker.GetTypeAtLocation(node)))
		if strings.Contains(typeName, "window") || strings.Contains(typeName, "globalthis") {
			return true
		}
	}

	return containsWindowLikeIdentifier(node)
}

func isIdentifierText(node *ast.Node, want string) bool {
	node = ast.SkipParentheses(node)
	return node != nil && ast.IsIdentifier(node) && node.AsIdentifier().Text == want
}

func isPostMessageCallee(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	switch {
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text == postMessageName
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		return name != nil && name.Text() == postMessageName
	default:
		return false
	}
}

func isAddEventListenerCallee(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return false
	}

	name := node.AsPropertyAccessExpression().Name()
	return name != nil && name.Text() == addEventListenerName
}

func resolveListener(node *ast.Node, ctx rule.RuleContext) *ast.Node {
	node = ast.SkipParentheses(node)
	if node == nil {
		return nil
	}

	if ast.IsFunctionLike(node) {
		return node
	}

	if !ast.IsIdentifier(node) || ctx.TypeChecker == nil {
		return nil
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil || symbol.ValueDeclaration == nil {
		return nil
	}

	declaration := symbol.ValueDeclaration
	if ast.IsFunctionLike(declaration) {
		return declaration
	}

	return nil
}

func isEventOriginalEventAccess(node *ast.Node, eventName string) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return false
	}

	memberExpr := node.AsPropertyAccessExpression()
	name := memberExpr.Name()
	return name != nil && name.Text() == "originalEvent" && isIdentifierText(memberExpr.Expression, eventName)
}

func isEventOriginAccess(node *ast.Node, eventName string) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return false
	}

	originAccess := node.AsPropertyAccessExpression()
	name := originAccess.Name()
	if name == nil || name.Text() != "origin" {
		return false
	}

	target := ast.SkipParentheses(originAccess.Expression)
	return target != nil && ast.IsIdentifier(target) && target.AsIdentifier().Text == eventName
}

func isEventOriginalEventOriginAccess(node *ast.Node, eventName string) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return false
	}

	originAccess := node.AsPropertyAccessExpression()
	name := originAccess.Name()
	if name == nil || name.Text() != "origin" {
		return false
	}

	originalEventAccess := ast.SkipParentheses(originAccess.Expression)
	if originalEventAccess == nil || !ast.IsPropertyAccessExpression(originalEventAccess) {
		return false
	}

	originalEvent := originalEventAccess.AsPropertyAccessExpression()
	originalEventName := originalEvent.Name()
	if originalEventName == nil || originalEventName.Text() != "originalEvent" {
		return false
	}

	target := ast.SkipParentheses(originalEvent.Expression)
	return target != nil && ast.IsIdentifier(target) && target.AsIdentifier().Text == eventName
}

func isLogicalOrExpression(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil && ast.IsBinaryExpression(node) && node.AsBinaryExpression().OperatorToken.Kind == ast.KindBarBarToken
}

func isEventUnionExpression(node *ast.Node, eventName string) bool {
	node = ast.SkipParentheses(node)
	if !isLogicalOrExpression(node) {
		return false
	}

	binExpr := node.AsBinaryExpression()
	return (isIdentifierText(binExpr.Left, eventName) && isEventOriginalEventAccess(binExpr.Right, eventName)) ||
		(isIdentifierText(binExpr.Right, eventName) && isEventOriginalEventAccess(binExpr.Left, eventName))
}

func isOriginUnionExpression(node *ast.Node, eventName string) bool {
	node = ast.SkipParentheses(node)
	if !isLogicalOrExpression(node) {
		return false
	}

	binExpr := node.AsBinaryExpression()
	return (isEventOriginAccess(binExpr.Left, eventName) && isEventOriginalEventOriginAccess(binExpr.Right, eventName)) ||
		(isEventOriginAccess(binExpr.Right, eventName) && isEventOriginalEventOriginAccess(binExpr.Left, eventName))
}

func isIdentifierReference(node *ast.Node) bool {
	if node == nil || !ast.IsIdentifier(node) || node.Parent == nil {
		return false
	}

	parent := node.Parent
	switch {
	case ast.IsVariableDeclaration(parent):
		return parent.AsVariableDeclaration().Name() != node
	case ast.IsParameterDeclaration(parent):
		return parent.AsParameterDeclaration().Name() != node
	case ast.IsFunctionDeclaration(parent):
		return parent.AsFunctionDeclaration().Name() != node
	case ast.IsFunctionExpression(parent):
		return parent.AsFunctionExpression().Name() != node
	case ast.IsClassLike(parent):
		return parent.Name() != node
	default:
		return true
	}
}

func hasLocalIfAncestor(node *ast.Node, boundary *ast.Node) bool {
	for current := node.Parent; current != nil && current != boundary; current = current.Parent {
		if ast.IsIfStatement(current) {
			return true
		}
		if ast.IsFunctionLike(current) {
			return false
		}
	}
	return false
}

func collectOriginAliases(body *ast.Node, eventName string) (map[string]struct{}, map[string]struct{}) {
	eventAliases := map[string]struct{}{}
	originAliases := map[string]struct{}{}

	var visit ast.Visitor
	visit = func(current *ast.Node) bool {
		if current == nil {
			return false
		}
		if current != body && ast.IsFunctionLike(current) {
			return false
		}

		if ast.IsVariableDeclaration(current) {
			declaration := current.AsVariableDeclaration()
			if ast.IsIdentifier(declaration.Name()) {
				name := declaration.Name().AsIdentifier().Text
				switch {
				case isEventUnionExpression(declaration.Initializer, eventName):
					eventAliases[name] = struct{}{}
				case isOriginUnionExpression(declaration.Initializer, eventName):
					originAliases[name] = struct{}{}
				}
			}
		}

		current.ForEachChild(visit)
		return false
	}

	visit(body)
	return eventAliases, originAliases
}

func ifStatementContainsOriginCheck(ifStatement *ast.Node, body *ast.Node, eventName string, eventAliases map[string]struct{}, originAliases map[string]struct{}) bool {
	found := false

	var visit ast.Visitor
	visit = func(current *ast.Node) bool {
		if current == nil || found {
			return found
		}
		if current != ifStatement && ast.IsFunctionLike(current) {
			return false
		}

		switch {
		case isEventOriginAccess(current, eventName), isEventOriginalEventOriginAccess(current, eventName):
			if hasLocalIfAncestor(current, body) {
				found = true
				return true
			}
		case ast.IsPropertyAccessExpression(current):
			propertyAccess := current.AsPropertyAccessExpression()
			name := propertyAccess.Name()
			if name != nil && name.Text() == "origin" {
				if _, ok := eventAliases[propertyAccess.Expression.Text()]; ok && hasLocalIfAncestor(current, body) {
					found = true
					return true
				}
			}
		case ast.IsIdentifier(current) && isIdentifierReference(current):
			if _, ok := originAliases[current.AsIdentifier().Text]; ok && hasLocalIfAncestor(current, body) {
				found = true
				return true
			}
		}

		current.ForEachChild(visit)
		return found
	}

	visit(ifStatement)
	return found
}

func hasVerifiedOrigin(listener *ast.Node, eventName string) bool {
	if listener == nil {
		return false
	}

	body := listener.Body()
	if body == nil {
		return false
	}

	eventAliases, originAliases := collectOriginAliases(body, eventName)
	found := false

	var visit ast.Visitor
	visit = func(current *ast.Node) bool {
		if current == nil || found {
			return found
		}
		if current != body && ast.IsFunctionLike(current) {
			return false
		}

		if ast.IsIfStatement(current) && ifStatementContainsOriginCheck(current, body, eventName, eventAliases, originAliases) {
			found = true
			return true
		}

		current.ForEachChild(visit)
		return found
	}

	visit(body)
	return found
}

func checkPostMessageCall(ctx rule.RuleContext, node *ast.Node) {
	callExpr := node.AsCallExpression()
	if len(callExpr.Arguments.Nodes) != 2 && len(callExpr.Arguments.Nodes) != 3 {
		return
	}
	if !isStringLiteralText(callExpr.Arguments.Nodes[1], "*") {
		return
	}

	callee := ast.SkipParentheses(callExpr.Expression)
	if callee == nil || !isPostMessageCallee(callee) {
		return
	}

	if ast.IsIdentifier(callee) {
		ctx.ReportNode(callee, buildSpecifyTargetMessage())
		return
	}

	if propertyAccess := callee.AsPropertyAccessExpression(); isWindowLikeNode(ctx, propertyAccess.Expression) {
		ctx.ReportNode(callee, buildSpecifyTargetMessage())
	}
}

func checkAddEventListenerCall(ctx rule.RuleContext, node *ast.Node) {
	callExpr := node.AsCallExpression()
	if len(callExpr.Arguments.Nodes) < 2 {
		return
	}

	callee := ast.SkipParentheses(callExpr.Expression)
	if callee == nil || !isAddEventListenerCallee(callee) || !isWindowLikeNode(ctx, callee) {
		return
	}
	if eventType, ok := resolvedStringValue(ctx, callExpr.Arguments.Nodes[0]); !ok || !strings.EqualFold(eventType, "message") {
		return
	}

	listener := resolveListener(callExpr.Arguments.Nodes[1], ctx)
	if listener != nil && listener.Body() != nil && !ast.IsBlock(listener.Body()) {
		listener = resolveListener(listener.Body(), ctx)
	}
	if listener == nil || len(listener.Parameters()) == 0 {
		return
	}

	firstParameter := listener.Parameters()[0]
	if firstParameter == nil || firstParameter.AsParameterDeclaration().DotDotDotToken != nil {
		return
	}

	event := firstParameter.Name()
	if !ast.IsIdentifier(event) {
		return
	}

	if !hasVerifiedOrigin(listener, event.AsIdentifier().Text) {
		ctx.ReportNode(callee, buildVerifyOriginMessage())
	}
}

var PostMessageRule = rule.Rule{
	Name: "post-message",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				checkPostMessageCall(ctx, node)
				checkAddEventListenerCall(ctx, node)
			},
		}
	},
}
