package s6594_prefer_regexp_exec

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const (
	useExecMessageID     = "useExec"
	suggestExecMessageID = "suggestExec"
)

var topLevelNodeKinds = []ast.Kind{
	ast.KindImportDeclaration,
	ast.KindImportEqualsDeclaration,
	ast.KindExportDeclaration,
	ast.KindExportAssignment,
	ast.KindVariableStatement,
	ast.KindExpressionStatement,
	ast.KindIfStatement,
	ast.KindDoStatement,
	ast.KindWhileStatement,
	ast.KindForStatement,
	ast.KindForInStatement,
	ast.KindForOfStatement,
	ast.KindContinueStatement,
	ast.KindBreakStatement,
	ast.KindReturnStatement,
	ast.KindWithStatement,
	ast.KindSwitchStatement,
	ast.KindLabeledStatement,
	ast.KindThrowStatement,
	ast.KindTryStatement,
	ast.KindDebuggerStatement,
	ast.KindFunctionDeclaration,
	ast.KindClassDeclaration,
	ast.KindInterfaceDeclaration,
	ast.KindTypeAliasDeclaration,
	ast.KindEnumDeclaration,
	ast.KindModuleDeclaration,
	ast.KindNamespaceExportDeclaration,
	ast.KindEmptyStatement,
}

type matchCallCandidate struct {
	callExpr  *ast.Node
	property  *ast.Node
	object    *ast.Node
	argument  *ast.Node
	lhsSymbol *ast.Symbol
}

func buildUseExecMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          useExecMessageID,
		Description: `Use the "RegExp.exec()" method instead.`,
	}
}

func buildSuggestExecMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          suggestExecMessageID,
		Description: `Replace with "RegExp.exec()"`,
	}
}

func isStringType(ctx rule.RuleContext, node *ast.Node) bool {
	t := ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(node))
	return utils.GetTypeName(ctx.TypeChecker, t) == "string"
}

func splitRegexLiteral(text string) (string, string, bool) {
	if len(text) < 2 || text[0] != '/' {
		return "", "", false
	}

	escaped := false
	closingSlash := -1
	for i := 1; i < len(text); i++ {
		switch {
		case escaped:
			escaped = false
		case text[i] == '\\':
			escaped = true
		case text[i] == '/':
			closingSlash = i
		}
	}

	if closingSlash <= 0 {
		return "", "", false
	}

	return text[1:closingSlash], text[closingSlash+1:], true
}

func staticStringValue(ctx rule.RuleContext, node *ast.Node, seen map[*ast.Symbol]struct{}) (string, bool) {
	node = ast.SkipParentheses(node)
	if node == nil {
		return "", false
	}

	switch {
	case ast.IsStringLiteral(node) || node.Kind == ast.KindNoSubstitutionTemplateLiteral:
		return node.Text(), true
	case ast.IsIdentifier(node):
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		if symbol == nil {
			return "", false
		}
		if _, ok := seen[symbol]; ok {
			return "", false
		}
		seen[symbol] = struct{}{}
		defer delete(seen, symbol)

		if symbol.ValueDeclaration == nil || !ast.IsVariableDeclaration(symbol.ValueDeclaration) {
			return "", false
		}
		decl := symbol.ValueDeclaration.AsVariableDeclaration()
		if decl.Initializer == nil {
			return "", false
		}

		return staticStringValue(ctx, decl.Initializer, seen)
	default:
		return "", false
	}
}

func regexFlags(ctx rule.RuleContext, node *ast.Node, seen map[*ast.Symbol]struct{}) (string, bool) {
	node = ast.SkipParentheses(node)
	if node == nil {
		return "", false
	}

	switch {
	case node.Kind == ast.KindRegularExpressionLiteral:
		_, flags, ok := splitRegexLiteral(node.AsRegularExpressionLiteral().Text)
		return flags, ok
	case ast.IsNewExpression(node):
		newExpr := node.AsNewExpression()
		callee := ast.SkipParentheses(newExpr.Expression)
		if !ast.IsIdentifier(callee) || callee.AsIdentifier().Text != "RegExp" {
			return "", false
		}
		args := node.Arguments()
		if len(args) < 2 {
			return "", true
		}
		return staticStringValue(ctx, args[1], map[*ast.Symbol]struct{}{})
	case ast.IsCallExpression(node):
		callExpr := node.AsCallExpression()
		callee := ast.SkipParentheses(callExpr.Expression)
		if !ast.IsIdentifier(callee) || callee.AsIdentifier().Text != "RegExp" {
			return "", false
		}
		if len(callExpr.Arguments.Nodes) < 2 {
			return "", true
		}
		return staticStringValue(ctx, callExpr.Arguments.Nodes[1], map[*ast.Symbol]struct{}{})
	case ast.IsIdentifier(node):
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		if symbol == nil {
			return "", false
		}
		if _, ok := seen[symbol]; ok {
			return "", false
		}
		seen[symbol] = struct{}{}
		defer delete(seen, symbol)

		if symbol.ValueDeclaration == nil || !ast.IsVariableDeclaration(symbol.ValueDeclaration) {
			return "", false
		}
		decl := symbol.ValueDeclaration.AsVariableDeclaration()
		if decl.Initializer == nil {
			return "", false
		}

		return regexFlags(ctx, decl.Initializer, seen)
	default:
		return "", false
	}
}

func hasGlobalRegexFlag(ctx rule.RuleContext, node *ast.Node) bool {
	flags, ok := regexFlags(ctx, node, map[*ast.Symbol]struct{}{})
	return ok && strings.Contains(flags, "g")
}

func lhsAssignedSymbol(ctx rule.RuleContext, node *ast.Node) *ast.Symbol {
	parent := node.Parent
	if parent == nil {
		return nil
	}

	if ast.IsVariableDeclaration(parent) && parent.AsVariableDeclaration().Initializer == node {
		name := parent.Name()
		if ast.IsIdentifier(name) {
			return ctx.TypeChecker.GetSymbolAtLocation(name)
		}
		return nil
	}

	if ast.IsAssignmentExpression(parent, true) && parent.AsBinaryExpression().Right == node {
		left := ast.SkipParentheses(parent.AsBinaryExpression().Left)
		if ast.IsIdentifier(left) {
			return ctx.TypeChecker.GetSymbolAtLocation(left)
		}
	}

	return nil
}

func buildExecReplacement(ctx rule.RuleContext, candidate matchCallCandidate) string {
	objectText := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, candidate.object, false)
	argumentText := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, candidate.argument, false)
	return "RegExp(" + argumentText + ").exec(" + objectText + ")"
}

func isLastTopLevelNode(node *ast.Node) bool {
	if node == nil || node.Parent == nil || node.Parent.Kind != ast.KindSourceFile {
		return false
	}

	statements := node.Parent.Statements()
	return len(statements) > 0 && statements[len(statements)-1] == node
}

var PreferRegexpExecRule = rule.Rule{
	Name: "prefer-regexp-exec",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		lengthAccessSymbols := map[*ast.Symbol]bool{}
		candidates := make([]matchCallCandidate, 0, 4)
		flushed := false

		flush := func(node *ast.Node) {
			if flushed || !isLastTopLevelNode(node) {
				return
			}
			flushed = true

			for _, candidate := range candidates {
				if candidate.lhsSymbol != nil && lengthAccessSymbols[candidate.lhsSymbol] {
					continue
				}

				replacement := buildExecReplacement(ctx, candidate)
				ctx.ReportNodeWithSuggestions(candidate.property, buildUseExecMessage(), func() []rule.RuleSuggestion {
					return []rule.RuleSuggestion{{
						Message: buildSuggestExecMessage(),
						FixesArr: []rule.RuleFix{
							rule.RuleFixReplace(ctx.SourceFile, candidate.callExpr, replacement),
						},
					}}
				})
			}
		}

		listeners := rule.RuleListeners{
			ast.KindPropertyAccessExpression: func(node *ast.Node) {
				name := node.AsPropertyAccessExpression().Name()
				if name == nil || name.Text() != "length" {
					return
				}

				object := ast.SkipParentheses(node.AsPropertyAccessExpression().Expression)
				if !ast.IsIdentifier(object) {
					return
				}

				if symbol := ctx.TypeChecker.GetSymbolAtLocation(object); symbol != nil {
					lengthAccessSymbols[symbol] = true
				}
			},
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				if len(callExpr.Arguments.Nodes) != 1 {
					return
				}

				callee := ast.SkipParentheses(callExpr.Expression)
				if !ast.IsPropertyAccessExpression(callee) {
					return
				}

				property := callee.AsPropertyAccessExpression().Name()
				if property == nil || property.Text() != "match" {
					return
				}

				object := callee.AsPropertyAccessExpression().Expression
				if !isStringType(ctx, object) || hasGlobalRegexFlag(ctx, callExpr.Arguments.Nodes[0]) {
					return
				}

				candidates = append(candidates, matchCallCandidate{
					callExpr:  node,
					property:  property,
					object:    object,
					argument:  callExpr.Arguments.Nodes[0],
					lhsSymbol: lhsAssignedSymbol(ctx, node),
				})
			},
		}

		for _, kind := range topLevelNodeKinds {
			listeners[rule.ListenerOnExit(kind)] = flush
		}

		return listeners
	},
}
