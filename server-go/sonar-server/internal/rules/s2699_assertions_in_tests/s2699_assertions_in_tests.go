package s2699_assertions_in_tests

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const missingAssertionMessageID = "missingAssertion"

var s2699SupportedAssertionLibraries = map[string]struct{}{
	"@playwright/test": {},
	"assert":           {},
	"chai":             {},
	"node:assert":      {},
	"sinon":            {},
	"supertest":        {},
	"vitest":           {},
}

var s2699AssertionGlobals = map[string]struct{}{
	"assert": {},
	"cy":     {},
	"expect": {},
}

var s2699TestCaseNames = map[string]struct{}{
	"it":      {},
	"specify": {},
	"test":    {},
}

var s2699TestCaseModifiers = map[string]struct{}{
	"only": {},
	"skip": {},
}

func buildS2699MissingAssertionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          missingAssertionMessageID,
		Description: "Add at least one assertion to this test case.",
	}
}

type s2699AssertionVisitor struct {
	ctx     rule.RuleContext
	visited map[*ast.Node]bool
}

func (v *s2699AssertionVisitor) visit(node *ast.Node) bool {
	if node == nil {
		return false
	}

	if result, ok := v.visited[node]; ok {
		return result
	}
	v.visited[node] = false

	if s2699IsAssertion(v.ctx, node) {
		v.visited[node] = true
		return true
	}

	if ast.IsCallExpression(node) {
		callExpr := node.AsCallExpression()
		if resolved := s2699ResolveFunction(v.ctx, callExpr.Expression); resolved != nil {
			if v.visit(resolved.Body()) {
				v.visited[node] = true
				return true
			}
		}
	}

	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if v.visit(child) {
			found = true
			return true
		}
		return false
	})

	v.visited[node] = found
	return found
}

func s2699HasSupportedAssertionLibrary(ctx rule.RuleContext) bool {
	for name := range ctx.KnownGlobals {
		if _, ok := s2699AssertionGlobals[name]; ok {
			return true
		}
	}

	if ctx.SourceFile == nil {
		return false
	}

	found := false
	var visit func(node *ast.Node)
	visit = func(node *ast.Node) {
		if node == nil || found {
			return
		}

		switch {
		case ast.IsImportDeclaration(node):
			if moduleName, ok := s2699StringLiteralText(node.AsImportDeclaration().ModuleSpecifier); ok {
				_, found = s2699SupportedAssertionLibraries[moduleName]
				return
			}
		case ast.IsCallExpression(node):
			if moduleName, ok := s2699ModuleNameFromCall(node); ok {
				_, found = s2699SupportedAssertionLibraries[moduleName]
				return
			}
		}

		node.ForEachChild(func(child *ast.Node) bool {
			visit(child)
			return found
		})
	}

	ctx.SourceFile.Node.ForEachChild(func(child *ast.Node) bool {
		visit(child)
		return found
	})

	return found
}

func s2699ExtractTestCase(node *ast.Node) (*ast.Node, *ast.Node) {
	if !ast.IsCallExpression(node) {
		return nil, nil
	}

	callExpr := node.AsCallExpression()
	if len(callExpr.Arguments.Nodes) < 2 {
		return nil, nil
	}

	callback := ast.SkipParentheses(callExpr.Arguments.Nodes[1])
	if callback == nil || !ast.IsFunctionLike(callback) {
		return nil, nil
	}

	callee := ast.SkipParentheses(callExpr.Expression)
	if callee == nil {
		return nil, nil
	}

	if ast.IsIdentifier(callee) {
		if _, ok := s2699TestCaseNames[callee.AsIdentifier().Text]; ok {
			return callExpr.Expression, callback
		}
		return nil, nil
	}

	if !ast.IsPropertyAccessExpression(callee) {
		return nil, nil
	}

	base := ast.SkipParentheses(callee.AsPropertyAccessExpression().Expression)
	name := callee.AsPropertyAccessExpression().Name()
	if base == nil || name == nil || !ast.IsIdentifier(base) {
		return nil, nil
	}

	if _, ok := s2699TestCaseNames[base.AsIdentifier().Text]; !ok {
		return nil, nil
	}
	if _, ok := s2699TestCaseModifiers[name.Text()]; !ok {
		return nil, nil
	}

	return callee, callback
}

func s2699ResolveFunction(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	node = ast.SkipParentheses(node)
	if node == nil || ctx.TypeChecker == nil {
		return nil
	}

	if ast.IsFunctionLike(node) {
		return node
	}

	if !ast.IsIdentifier(node) {
		return nil
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil || len(symbol.Declarations) != 1 {
		return nil
	}

	declaration := symbol.Declarations[0]
	if declaration == nil || !ast.IsFunctionLike(declaration) {
		return nil
	}

	return declaration
}

func s2699HasDoneCallbackAssertion(callback *ast.Node) bool {
	if callback == nil {
		return false
	}

	parameters := callback.Parameters()
	if len(parameters) == 0 {
		return false
	}

	firstParameter := parameters[0]
	if firstParameter == nil {
		return false
	}

	name := firstParameter.Name()
	if !ast.IsIdentifier(name) {
		return false
	}

	return s2699ContainsValidDoneAssertion(callback.Body(), name.AsIdentifier().Text)
}

func s2699ContainsValidDoneAssertion(node *ast.Node, doneName string) bool {
	if node == nil {
		return false
	}

	if ast.IsCallExpression(node) {
		callExpr := node.AsCallExpression()
		if s2699IsIdentifierText(callExpr.Expression, doneName) && len(callExpr.Arguments.Nodes) > 0 {
			return true
		}
		if s2699IsValidDoneMethodCallPattern(node, doneName) {
			return true
		}
	}

	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if s2699ContainsValidDoneAssertion(child, doneName) {
			found = true
			return true
		}
		return false
	})
	return found
}

func s2699IsValidDoneMethodCallPattern(node *ast.Node, doneName string) bool {
	callExpr := node.AsCallExpression()
	callee := ast.SkipParentheses(callExpr.Expression)
	if callee == nil || !ast.IsPropertyAccessExpression(callee) {
		return false
	}

	method := callee.AsPropertyAccessExpression().Name()
	if method == nil {
		return false
	}

	args := callExpr.Arguments.Nodes
	switch method.Text() {
	case "catch":
		return len(args) == 1 && s2699IsIdentifierText(args[0], doneName)
	case "then":
		return len(args) >= 2 && s2699IsIdentifierText(args[1], doneName)
	case "subscribe":
		if len(args) >= 2 && s2699IsIdentifierText(args[1], doneName) {
			return true
		}
		if len(args) != 1 {
			return false
		}
		objectLiteral := ast.SkipParentheses(args[0])
		if objectLiteral == nil || !ast.IsObjectLiteralExpression(objectLiteral) {
			return false
		}
		for _, property := range objectLiteral.AsObjectLiteralExpression().Properties.Nodes {
			if !ast.IsPropertyAssignment(property) {
				continue
			}
			if s2699PropertyNameText(property.AsPropertyAssignment().Name()) == "error" &&
				s2699IsIdentifierText(property.AsPropertyAssignment().Initializer, doneName) {
				return true
			}
		}
	}

	return false
}

func s2699IsAssertion(ctx rule.RuleContext, node *ast.Node) bool {
	if s2699IsGlobalExpectAssertion(node) || s2699IsCypressAssertion(node) {
		return true
	}

	if !ast.IsCallExpression(node) {
		return false
	}

	fqn := s2699FullyQualifiedNameTS(ctx, node)
	if fqn == "" {
		return false
	}

	if strings.HasPrefix(fqn, "chai.assert") ||
		strings.HasPrefix(fqn, "chai.expect") ||
		strings.HasPrefix(fqn, "sinon.assert") ||
		strings.HasPrefix(fqn, "vitest.expect") ||
		strings.HasPrefix(fqn, "vitest.expectTypeOf") ||
		strings.HasPrefix(fqn, "vitest.assertType") {
		return true
	}

	parts := strings.Split(fqn, ".")
	if len(parts) >= 1 && parts[0] == "assert" {
		return true
	}
	return len(parts) >= 3 && parts[0] == "supertest" && parts[2] == "expect"
}

func s2699IsGlobalExpectAssertion(node *ast.Node) bool {
	if !ast.IsCallExpression(node) {
		return false
	}

	callee := ast.SkipParentheses(node.Expression())
	if callee == nil || !ast.IsPropertyAccessExpression(callee) {
		return false
	}

	current := ast.SkipParentheses(callee.AsPropertyAccessExpression().Expression)
	for current != nil && ast.IsPropertyAccessExpression(current) {
		current = ast.SkipParentheses(current.AsPropertyAccessExpression().Expression)
	}

	if current == nil || !ast.IsCallExpression(current) {
		return false
	}

	innerCallee := ast.SkipParentheses(current.Expression())
	return innerCallee != nil &&
		ast.IsIdentifier(innerCallee) &&
		strings.HasPrefix(innerCallee.AsIdentifier().Text, "expect")
}

func s2699IsCypressAssertion(node *ast.Node) bool {
	if !ast.IsCallExpression(node) {
		return false
	}

	callee := ast.SkipParentheses(node.Expression())
	if callee == nil || !ast.IsPropertyAccessExpression(callee) {
		return false
	}

	method := callee.AsPropertyAccessExpression().Name()
	return method != nil &&
		(method.Text() == "should" || method.Text() == "and") &&
		s2699ChainStartsWithIdentifier(callee.AsPropertyAccessExpression().Expression, "cy")
}

func s2699ChainStartsWithIdentifier(node *ast.Node, want string) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	switch {
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text == want
	case ast.IsPropertyAccessExpression(node):
		return s2699ChainStartsWithIdentifier(node.AsPropertyAccessExpression().Expression, want)
	case ast.IsCallExpression(node):
		return s2699ChainStartsWithIdentifier(node.Expression(), want)
	default:
		return false
	}
}

func s2699FullyQualifiedNameTS(ctx rule.RuleContext, rootNode *ast.Node) string {
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
			if s2699IsRequireCall(node) {
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
			name := s2699PropertyNameText(node.PropertyNameOrName())
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
			declaration := s2699FirstDeclaration(symbol)
			if s2699IsCompilerModule(symbol) || declaration == nil || declaration == node || declaration.Contains(rootNode) {
				parts = append(parts, node.AsIdentifier().Text)
				return s2699FinalizeFQN(parts)
			}
			node = declaration
		case ast.KindStringLiteral, ast.KindNoSubstitutionTemplateLiteral:
			parts = append(parts, node.Text())
			return s2699FinalizeFQN(parts)
		case ast.KindImportClause, ast.KindObjectBindingPattern, ast.KindBlock, ast.KindExpressionStatement, ast.KindNamedImports, ast.KindModuleBlock:
			node = node.Parent
		default:
			return ""
		}
	}

	return ""
}

func s2699ModuleNameFromCall(node *ast.Node) (string, bool) {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsCallExpression(node) {
		return "", false
	}

	if !s2699IsRequireCall(node) {
		return "", false
	}

	args := node.Arguments()
	if len(args) != 1 {
		return "", false
	}

	return s2699StringLiteralText(args[0])
}

func s2699IsRequireCall(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil &&
		ast.IsCallExpression(node) &&
		len(node.Arguments()) == 1 &&
		s2699IsIdentifierText(node.Expression(), "require")
}

func s2699StringLiteralText(node *ast.Node) (string, bool) {
	node = ast.SkipParentheses(node)
	if node == nil {
		return "", false
	}

	switch {
	case ast.IsStringLiteral(node), ast.IsNoSubstitutionTemplateLiteral(node):
		return node.Text(), true
	default:
		return "", false
	}
}

func s2699PropertyNameText(node *ast.Node) string {
	node = ast.SkipParentheses(node)
	if node == nil {
		return ""
	}

	switch {
	case ast.IsIdentifier(node), ast.IsStringOrNumericLiteralLike(node), node.Kind == ast.KindBigIntLiteral:
		return node.Text()
	case ast.IsComputedPropertyName(node):
		expression := ast.SkipParentheses(node.Expression())
		if expression != nil && (ast.IsIdentifier(expression) || ast.IsStringOrNumericLiteralLike(expression) || expression.Kind == ast.KindBigIntLiteral) {
			return expression.Text()
		}
	}

	return ""
}

func s2699IsIdentifierText(node *ast.Node, want string) bool {
	node = ast.SkipParentheses(node)
	return node != nil && ast.IsIdentifier(node) && node.AsIdentifier().Text == want
}

func s2699FirstDeclaration(symbol *ast.Symbol) *ast.Node {
	if symbol == nil || len(symbol.Declarations) == 0 {
		return nil
	}
	return symbol.Declarations[0]
}

func s2699IsCompilerModule(symbol *ast.Symbol) bool {
	return symbol != nil &&
		symbol.Flags&ast.SymbolFlagsModule != 0 &&
		symbol.Flags&ast.SymbolFlagsAssignment != 0
}

func s2699FinalizeFQN(parts []string) string {
	for left, right := 0, len(parts)-1; left < right; left, right = left+1, right-1 {
		parts[left], parts[right] = parts[right], parts[left]
	}
	return strings.TrimPrefix(strings.Join(parts, "."), "node:")
}

var AssertionsInTestsRule = rule.Rule{
	Name: "assertions-in-tests",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil || !s2699HasSupportedAssertionLibrary(ctx) {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				reportNode, callback := s2699ExtractTestCase(node)
				if callback == nil {
					return
				}
				if s2699HasDoneCallbackAssertion(callback) {
					return
				}

				visitor := s2699AssertionVisitor{
					ctx:     ctx,
					visited: map[*ast.Node]bool{},
				}
				if visitor.visit(callback.Body()) {
					return
				}

				ctx.ReportNode(reportNode, buildS2699MissingAssertionMessage())
			},
		}
	},
}
