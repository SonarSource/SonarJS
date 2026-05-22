package s8479_dompurify_unsafe_config

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

const unsafeConfigMessageID = "unsafeConfig"

var dangerousTags = map[string]struct{}{
	"script":   {},
	"iframe":   {},
	"object":   {},
	"embed":    {},
	"form":     {},
	"input":    {},
	"textarea": {},
	"select":   {},
	"meta":     {},
	"link":     {},
	"style":    {},
	"base":     {},
	"svg":      {},
	"math":     {},
}

var dangerousURIAttrs = map[string]struct{}{
	"href":       {},
	"src":        {},
	"action":     {},
	"formaction": {},
	"xlink:href": {},
	"data":       {},
}

var dangerousBooleanOptions = map[string]bool{
	"ALLOW_UNKNOWN_PROTOCOLS": true,
	"WHOLE_DOCUMENT":          true,
	"SAFE_FOR_XML":            false,
	"SANITIZE_DOM":            false,
	"RETURN_TRUSTED_TYPE":     false,
}

var sanitizeFQNs = map[string]struct{}{
	"dompurify.sanitize":            {},
	"isomorphic-dompurify.sanitize": {},
}

var eventHandlerPattern = regexp.MustCompile(`(?i)^on[a-z]`)

func buildUnsafeConfigMessage(actions []string) rule.RuleMessage {
	shown := actions
	if len(shown) > 2 {
		shown = shown[:2]
	}
	remaining := len(actions) - len(shown)

	message := fmt.Sprintf("To prevent DOM-based attacks, %s.", joinActions(shown))
	if remaining > 0 {
		issueWord := "issues"
		if remaining == 1 {
			issueWord = "issue"
		}
		message += fmt.Sprintf(" Plus %d more %s. Read 'How to fix it' for all details.", remaining, issueWord)
	}

	return rule.RuleMessage{
		Id:          unsafeConfigMessageID,
		Description: message,
	}
}

func joinActions(actions []string) string {
	if len(actions) == 1 {
		return actions[0]
	}
	return fmt.Sprintf("%s, and %s", strings.Join(actions[:len(actions)-1], ", "), actions[len(actions)-1])
}

func formatList(items []string) string {
	quoted := make([]string, 0, len(items))
	for _, item := range items {
		quoted = append(quoted, fmt.Sprintf("'%s'", item))
	}
	if len(quoted) == 1 {
		return quoted[0]
	}
	return fmt.Sprintf("%s and %s", strings.Join(quoted[:len(quoted)-1], ", "), quoted[len(quoted)-1])
}

func propertyName(node *ast.Node) (string, bool) {
	node = ast.SkipParentheses(node)
	if node == nil {
		return "", false
	}

	switch {
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text, true
	case ast.IsStringLiteral(node), ast.IsNoSubstitutionTemplateLiteral(node):
		return node.Text(), true
	default:
		return "", false
	}
}

func dangerousArrayElements(node *ast.Node, dangerousSet map[string]struct{}) []string {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsArrayLiteralExpression(node) {
		return nil
	}

	var dangerous []string
	for _, element := range node.AsArrayLiteralExpression().Elements.Nodes {
		if element == nil || !ast.IsStringLiteral(element) && !ast.IsNoSubstitutionTemplateLiteral(element) {
			continue
		}
		text := element.Text()
		if _, ok := dangerousSet[strings.ToLower(text)]; ok {
			dangerous = append(dangerous, text)
		}
	}
	return dangerous
}

func dangerousAttributes(node *ast.Node) []string {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsArrayLiteralExpression(node) {
		return nil
	}

	var dangerous []string
	for _, element := range node.AsArrayLiteralExpression().Elements.Nodes {
		if element == nil || !ast.IsStringLiteral(element) && !ast.IsNoSubstitutionTemplateLiteral(element) {
			continue
		}
		text := element.Text()
		if eventHandlerPattern.MatchString(text) {
			dangerous = append(dangerous, text)
		}
	}
	return dangerous
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

func isUnanchoredRegex(sourceFile *ast.SourceFile, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if sourceFile == nil || node == nil || !ast.IsRegularExpressionLiteral(node) {
		return false
	}

	r := utils.TrimNodeTextRange(sourceFile, node)
	text := sourceFile.Text()[r.Pos():r.End()]
	return !strings.HasPrefix(text, "/^")
}

func actionForProperty(sourceFile *ast.SourceFile, property *ast.PropertyAssignment) string {
	key, ok := propertyName(property.Name())
	if !ok {
		return ""
	}

	switch key {
	case "ADD_TAGS", "ALLOWED_TAGS":
		dangerous := dangerousArrayElements(property.Initializer, dangerousTags)
		if len(dangerous) > 0 {
			return fmt.Sprintf("remove %s from '%s'", formatList(dangerous), key)
		}
	case "ADD_ATTR", "ALLOWED_ATTR":
		dangerous := dangerousAttributes(property.Initializer)
		if len(dangerous) > 0 {
			return fmt.Sprintf("remove %s from '%s'", formatList(dangerous), key)
		}
	case "ADD_URI_SAFE_ATTR":
		dangerous := dangerousArrayElements(property.Initializer, dangerousURIAttrs)
		if len(dangerous) > 0 {
			return fmt.Sprintf("remove %s from '%s'", formatList(dangerous), key)
		}
	case "ALLOWED_URI_REGEXP":
		if isUnanchoredRegex(sourceFile, property.Initializer) {
			return "anchor the 'ALLOWED_URI_REGEXP' pattern with '^' to prevent partial URI matches"
		}
	default:
		if dangerousValue, ok := dangerousBooleanOptions[key]; ok && isBooleanLiteral(property.Initializer, dangerousValue) {
			return fmt.Sprintf("set '%s' to '%t'", key, !dangerousValue)
		}
	}

	return ""
}

func collectActions(sourceFile *ast.SourceFile, config *ast.ObjectLiteralExpression) []string {
	var actions []string
	for _, property := range config.Properties.Nodes {
		if property == nil || !ast.IsPropertyAssignment(property) {
			continue
		}
		if action := actionForProperty(sourceFile, property.AsPropertyAssignment()); action != "" {
			actions = append(actions, action)
		}
	}
	return actions
}

func s8479RequireCall(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node != nil &&
		ast.IsCallExpression(node) &&
		len(node.Arguments()) == 1 &&
		ast.IsIdentifier(node.Expression()) &&
		node.Expression().AsIdentifier().Text == "require"
}

func s8479FirstDeclaration(symbol *ast.Symbol) *ast.Node {
	if symbol == nil || len(symbol.Declarations) == 0 {
		return nil
	}
	return symbol.Declarations[0]
}

func s8479IsCompilerModule(symbol *ast.Symbol) bool {
	return symbol != nil &&
		symbol.Flags&ast.SymbolFlagsModule != 0 &&
		symbol.Flags&ast.SymbolFlagsAssignment != 0
}

func s8479DeclarationNameText(node *ast.Node) string {
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

func s8479FinalizeFQN(parts []string) string {
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
			if s8479RequireCall(node) {
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
			name := s8479DeclarationNameText(node.PropertyNameOrName())
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
			declaration := s8479FirstDeclaration(symbol)
			if s8479IsCompilerModule(symbol) || declaration == nil || declaration == node || declaration.Contains(rootNode) {
				parts = append(parts, node.AsIdentifier().Text)
				return s8479FinalizeFQN(parts)
			}
			node = declaration
		case ast.KindStringLiteral, ast.KindNoSubstitutionTemplateLiteral:
			parts = append(parts, node.Text())
			return s8479FinalizeFQN(parts)
		case ast.KindImportClause, ast.KindObjectBindingPattern, ast.KindBlock, ast.KindExpressionStatement, ast.KindNamedImports, ast.KindModuleBlock:
			node = node.Parent
		default:
			return ""
		}
	}

	return ""
}

var DOMPurifyUnsafeConfigRule = rule.Rule{
	Name: "dompurify-unsafe-config",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.SourceFile == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				if _, ok := sanitizeFQNs[fullyQualifiedNameTS(ctx, node)]; !ok {
					return
				}

				callExpression := node.AsCallExpression()
				if len(callExpression.Arguments.Nodes) < 2 {
					return
				}

				configArg := ast.SkipParentheses(callExpression.Arguments.Nodes[1])
				if configArg == nil || !ast.IsObjectLiteralExpression(configArg) {
					return
				}

				actions := collectActions(ctx.SourceFile, configArg.AsObjectLiteralExpression())
				if len(actions) == 0 {
					return
				}

				ctx.ReportNode(configArg, buildUnsafeConfigMessage(actions))
			},
		}
	},
}
