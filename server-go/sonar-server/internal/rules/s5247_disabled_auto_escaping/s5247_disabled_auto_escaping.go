package s5247_disabled_auto_escaping

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

const disabledAutoEscapingMessageID = "disabledAutoEscaping"

const disabledAutoEscapingMessage = "Make sure disabling auto-escaping feature is safe here."

type sensitiveOption struct {
	property string
	value    bool
	index    int
}

var sensitiveCalls = map[string]sensitiveOption{
	"handlebars.compile": {property: "noEscape", value: true, index: 1},
	"marked.setOptions":  {property: "sanitize", value: false, index: 0},
	"markdown-it":        {property: "html", value: true, index: 0},
	"swig.setDefaults":   {property: "autoescape", value: false, index: 0},
}

func buildDisabledAutoEscapingMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          disabledAutoEscapingMessageID,
		Description: disabledAutoEscapingMessage,
	}
}

func reportWithSecondary(ctx rule.RuleContext, target *ast.Node, secondary *ast.Node) {
	if target == nil || secondary == nil || ctx.SourceFile == nil {
		return
	}

	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:   utils.TrimNodeTextRange(ctx.SourceFile, target),
		Message: buildDisabledAutoEscapingMessage(),
		LabeledRanges: []rule.RuleLabeledRange{{
			Range: utils.TrimNodeTextRange(ctx.SourceFile, secondary),
		}},
	})
}

func isBooleanLiteral(node *ast.Node, value bool) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}
	if value {
		return node.Kind == ast.KindTrueKeyword
	}
	return node.Kind == ast.KindFalseKeyword
}

func propertyName(node *ast.Node) string {
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

func uniqueWriteExpression(ctx rule.RuleContext, identifier *ast.Node) *ast.Node {
	if identifier == nil || !ast.IsIdentifier(identifier) || ctx.TypeChecker == nil || ctx.SourceFile == nil {
		return nil
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(identifier)
	if symbol == nil {
		return nil
	}

	var writeExpr *ast.Node
	writeCount := 0

	var visit func(node *ast.Node)
	visit = func(node *ast.Node) {
		if node == nil {
			return
		}

		if ast.IsIdentifier(node) && ctx.TypeChecker.GetSymbolAtLocation(node) == symbol {
			parent := node.Parent
			switch {
			case parent != nil && ast.IsVariableDeclaration(parent) && parent.Name() == node:
				if initializer := parent.AsVariableDeclaration().Initializer; initializer != nil {
					writeCount++
					writeExpr = initializer
				}
			case parent != nil &&
				ast.IsBinaryExpression(parent) &&
				ast.IsAssignmentExpression(parent, false) &&
				parent.AsBinaryExpression().Left == node:
				writeCount++
				writeExpr = parent.AsBinaryExpression().Right
			}
		}

		node.ForEachChild(func(child *ast.Node) bool {
			if writeCount > 1 {
				return true
			}
			visit(child)
			return false
		})
	}

	visit(&ctx.SourceFile.Node)
	if writeCount == 1 {
		return writeExpr
	}
	return nil
}

func objectLiteralValue(ctx rule.RuleContext, node *ast.Node) *ast.ObjectLiteralExpression {
	node = ast.SkipParentheses(node)
	if node == nil {
		return nil
	}
	if ast.IsObjectLiteralExpression(node) {
		return node.AsObjectLiteralExpression()
	}
	if ast.IsIdentifier(node) {
		if writeExpr := uniqueWriteExpression(ctx, node); writeExpr != nil && ast.IsObjectLiteralExpression(writeExpr) {
			return writeExpr.AsObjectLiteralExpression()
		}
	}
	return nil
}

func getPropertyFromSpread(ctx rule.RuleContext, spread *ast.SpreadAssignment, key string) *ast.PropertyAssignment {
	if spread == nil {
		return nil
	}
	return getProperty(ctx, objectLiteralValue(ctx, spread.Expression), key)
}

func getProperty(ctx rule.RuleContext, objectExpression *ast.ObjectLiteralExpression, key string) *ast.PropertyAssignment {
	if objectExpression == nil {
		return nil
	}

	for i := len(objectExpression.Properties.Nodes) - 1; i >= 0; i-- {
		property := objectExpression.Properties.Nodes[i]
		switch {
		case ast.IsPropertyAssignment(property):
			if propertyName(property.AsPropertyAssignment().Name()) == key {
				return property.AsPropertyAssignment()
			}
		case ast.IsSpreadAssignment(property):
			if spreadProperty := getPropertyFromSpread(ctx, property.AsSpreadAssignment(), key); spreadProperty != nil {
				return spreadProperty
			}
		}
	}

	return nil
}

func getPropertyWithBooleanValue(ctx rule.RuleContext, objectExpression *ast.ObjectLiteralExpression, key string, value bool) *ast.PropertyAssignment {
	property := getProperty(ctx, objectExpression, key)
	if property != nil && isBooleanLiteral(property.Initializer, value) {
		return property
	}
	return nil
}

func resolveFunctionNode(ctx rule.RuleContext, node *ast.Node) *ast.Node {
	node = ast.SkipParentheses(node)
	if node == nil || ctx.TypeChecker == nil {
		return nil
	}

	if ast.IsFunctionDeclaration(node) || ast.IsFunctionExpression(node) || ast.IsArrowFunction(node) {
		return node
	}

	if !ast.IsIdentifier(node) {
		return nil
	}

	if writeExpr := uniqueWriteExpression(ctx, node); writeExpr != nil {
		writeExpr = ast.SkipParentheses(writeExpr)
		if ast.IsFunctionExpression(writeExpr) || ast.IsArrowFunction(writeExpr) {
			return writeExpr
		}
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil || len(symbol.Declarations) != 1 {
		return nil
	}

	declaration := symbol.Declarations[0]
	if declaration != nil && ast.IsFunctionDeclaration(declaration) {
		return declaration
	}

	return nil
}

func isEmptySanitizerFunction(node *ast.Node) bool {
	if node == nil || !ast.IsFunctionLike(node) {
		return false
	}

	parameters := node.Parameters()
	if len(parameters) != 1 {
		return false
	}

	firstParam := parameters[0].Name()
	if !ast.IsIdentifier(firstParam) {
		return false
	}
	paramName := firstParam.AsIdentifier().Text

	body := node.Body()
	if body == nil {
		return false
	}
	if !ast.IsBlock(body) {
		body = ast.SkipParentheses(body)
		return body != nil && ast.IsIdentifier(body) && body.AsIdentifier().Text == paramName
	}

	statements := body.AsBlock().Statements.Nodes
	if len(statements) != 1 || !ast.IsReturnStatement(statements[0]) {
		return false
	}

	returnValue := ast.SkipParentheses(statements[0].AsReturnStatement().Expression)
	return returnValue != nil && ast.IsIdentifier(returnValue) && returnValue.AsIdentifier().Text == paramName
}

func invalidSanitizerFunction(ctx rule.RuleContext, node *ast.Node) bool {
	functionNode := resolveFunctionNode(ctx, node)
	return functionNode != nil && isEmptySanitizerFunction(functionNode)
}

func s5247RequireCall(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil &&
		ast.IsCallExpression(node) &&
		len(node.Arguments()) == 1 &&
		ast.IsIdentifier(node.Expression()) &&
		node.Expression().AsIdentifier().Text == "require"
}

func s5247FirstDeclaration(symbol *ast.Symbol) *ast.Node {
	if symbol == nil || len(symbol.Declarations) == 0 {
		return nil
	}
	return symbol.Declarations[0]
}

func s5247IsCompilerModule(symbol *ast.Symbol) bool {
	return symbol != nil &&
		symbol.Flags&ast.SymbolFlagsModule != 0 &&
		symbol.Flags&ast.SymbolFlagsAssignment != 0
}

func s5247FinalizeFQN(parts []string) string {
	for left, right := 0, len(parts)-1; left < right; left, right = left+1, right-1 {
		parts[left], parts[right] = parts[right], parts[left]
	}
	return strings.TrimPrefix(strings.Join(parts, "."), "node:")
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
			if s5247RequireCall(node) {
				args := node.Arguments()
				if len(args) != 1 {
					return ""
				}
				node = args[0]
			} else {
				node = node.Expression()
			}
		case ast.KindNewExpression:
			node = node.Expression()
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
			name := propertyName(node.PropertyNameOrName())
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
			declaration := s5247FirstDeclaration(symbol)
			if s5247IsCompilerModule(symbol) || declaration == nil || declaration == node || declaration.Contains(rootNode) {
				parts = append(parts, node.AsIdentifier().Text)
				return s5247FinalizeFQN(parts)
			}
			node = declaration
		case ast.KindStringLiteral, ast.KindNoSubstitutionTemplateLiteral:
			parts = append(parts, node.Text())
			return s5247FinalizeFQN(parts)
		case ast.KindImportClause, ast.KindObjectBindingPattern, ast.KindBlock, ast.KindExpressionStatement, ast.KindNamedImports, ast.KindModuleBlock:
			node = node.Parent
		default:
			return ""
		}
	}

	return ""
}

func checkSensitiveCall(ctx rule.RuleContext, target *ast.Node, arguments []*ast.Node, config sensitiveOption) {
	if len(arguments) <= config.index {
		return
	}

	options := objectLiteralValue(ctx, arguments[config.index])
	if options == nil {
		return
	}

	unsafeProperty := getPropertyWithBooleanValue(ctx, options, config.property, config.value)
	if unsafeProperty != nil {
		reportWithSecondary(ctx, target, &unsafeProperty.Node)
	}
}

func isMustacheEscapeAssignment(left *ast.Node, ctx rule.RuleContext) bool {
	if left == nil || !ast.IsPropertyAccessExpression(left) {
		return false
	}

	if propertyName(left.AsPropertyAccessExpression().Name()) != "escape" {
		return false
	}

	if fullyQualifiedNameTS(ctx, left) == "mustache.escape" {
		return true
	}

	object := ast.SkipParentheses(left.AsPropertyAccessExpression().Expression)
	return object != nil && ast.IsIdentifier(object) && object.AsIdentifier().Text == "Mustache"
}

var DisabledAutoEscapingRule = rule.Rule{
	Name: "disabled-auto-escaping",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				if config, ok := sensitiveCalls[fullyQualifiedNameTS(ctx, node)]; ok {
					callExpression := node.AsCallExpression()
					checkSensitiveCall(ctx, ast.SkipParentheses(callExpression.Expression), callExpression.Arguments.Nodes, config)
				}
			},
			ast.KindNewExpression: func(node *ast.Node) {
				if fullyQualifiedNameTS(ctx, node) == "kramed.Renderer" {
					newExpression := node.AsNewExpression()
					checkSensitiveCall(ctx, ast.SkipParentheses(newExpression.Expression), newExpression.Arguments.Nodes, sensitiveOption{
						property: "sanitize",
						value:    false,
						index:    0,
					})
				}
			},
			ast.KindBinaryExpression: func(node *ast.Node) {
				if !ast.IsAssignmentExpression(node, false) {
					return
				}

				assignment := node.AsBinaryExpression()
				left := ast.SkipParentheses(assignment.Left)
				if !isMustacheEscapeAssignment(left, ctx) {
					return
				}
				if invalidSanitizerFunction(ctx, assignment.Right) {
					ctx.ReportNode(left, buildDisabledAutoEscapingMessage())
				}
			},
		}
	},
}
