package s1128_unused_import

import (
	"regexp"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const (
	removeUnusedImportMessageID  = "removeUnusedImport"
	removeWholeImportMessageID   = "suggestRemoveWholeStatement"
	removeSingleBindingMessageID = "suggestRemoveOneVariable"
)

var (
	excludedImports = map[string]struct{}{
		"React": {},
	}
	jsDocTags = []string{
		"@abstract", "@access", "@alias", "@arg", "@argument", "@async", "@augments", "@author",
		"@borrows", "@callback", "@class", "@classdesc", "@const", "@constant", "@constructor",
		"@constructs", "@copyright", "@default", "@defaultvalue", "@deprecated", "@desc",
		"@description", "@emits", "@enum", "@event", "@example", "@exception", "@exports",
		"@extends", "@external", "@file", "@fileoverview", "@fires", "@func", "@function",
		"@generator", "@global", "@hideconstructor", "@host", "@ignore", "@implements",
		"@inheritdoc", "@inner", "@instance", "@interface", "@kind", "@lends", "@license",
		"@link", "@linkcode", "@linkplain", "@listens", "@member", "@memberof", "@method",
		"@mixes", "@mixin", "@module", "@name", "@namespace", "@override", "@overview",
		"@package", "@param", "@private", "@prop", "@property", "@protected", "@public",
		"@readonly", "@requires", "@return", "@returns", "@see", "@since", "@static",
		"@summary", "@this", "@throws", "@todo", "@tutorial", "@type", "@typedef", "@var",
		"@variation", "@version", "@virtual", "@yield", "@yields",
	}
	blockCommentPattern = regexp.MustCompile(`(?s)/\*.*?\*/`)
)

type importedBindingKind int

const (
	importedBindingDefault importedBindingKind = iota
	importedBindingNamespace
	importedBindingNamed
)

type importedBinding struct {
	kind            importedBindingKind
	nameNode        *ast.Node
	importSpecifier *ast.Node
	importDecl      *ast.Node
	symbol          *ast.Symbol
}

func buildRemoveUnusedImportMessage(symbol string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          removeUnusedImportMessageID,
		Description: "Remove this unused import of '" + symbol + "'.",
	}
}

func buildRemoveWholeImportMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          removeWholeImportMessageID,
		Description: "Remove this import statement",
	}
}

func buildRemoveSingleBindingMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          removeSingleBindingMessageID,
		Description: "Remove this variable import",
	}
}

func collectImportedBindings(ctx rule.RuleContext) []importedBinding {
	if ctx.SourceFile == nil || !ast.IsExternalModule(ctx.SourceFile) || ctx.TypeChecker == nil {
		return nil
	}

	var bindings []importedBinding
	for _, statement := range ctx.SourceFile.Statements.Nodes {
		if !ast.IsImportDeclaration(statement) {
			continue
		}

		importDecl := statement.AsImportDeclaration()
		if importDecl.ImportClause == nil {
			continue
		}

		clause := importDecl.ImportClause.AsImportClause()
		if name := clause.Name(); name != nil {
			if binding := newImportedBinding(ctx, importedBindingDefault, name, name, statement); binding != nil {
				bindings = append(bindings, *binding)
			}
		}

		if clause.NamedBindings == nil {
			continue
		}

		bindingsNode := clause.NamedBindings.AsNode()
		switch {
		case ast.IsNamespaceImport(bindingsNode):
			if name := bindingsNode.AsNamespaceImport().Name(); name != nil {
				if binding := newImportedBinding(ctx, importedBindingNamespace, name, bindingsNode, statement); binding != nil {
					bindings = append(bindings, *binding)
				}
			}
		case ast.IsNamedImports(bindingsNode):
			for _, element := range bindingsNode.AsNamedImports().Elements.Nodes {
				if name := element.Name(); name != nil {
					if binding := newImportedBinding(ctx, importedBindingNamed, name, element, statement); binding != nil {
						bindings = append(bindings, *binding)
					}
				}
			}
		}
	}

	return bindings
}

func newImportedBinding(
	ctx rule.RuleContext,
	kind importedBindingKind,
	nameNode *ast.Node,
	importSpecifier *ast.Node,
	importDecl *ast.Node,
) *importedBinding {
	if nameNode == nil || !ast.IsIdentifier(nameNode) {
		return nil
	}

	name := nameNode.AsIdentifier().Text
	if _, excluded := excludedImports[name]; excluded {
		return nil
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(nameNode)
	if symbol == nil {
		return nil
	}

	return &importedBinding{
		kind:            kind,
		nameNode:        nameNode,
		importSpecifier: importSpecifier,
		importDecl:      importDecl,
		symbol:          symbol,
	}
}

func collectUsedImportSymbols(ctx rule.RuleContext) map[*ast.Symbol]struct{} {
	used := map[*ast.Symbol]struct{}{}
	if ctx.SourceFile == nil || ctx.TypeChecker == nil {
		return used
	}

	var visit func(node *ast.Node)
	visit = func(node *ast.Node) {
		if node == nil {
			return
		}

		if ast.IsIdentifier(node) && !isImportLocalDefinition(node) {
			symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
			if symbol != nil {
				used[symbol] = struct{}{}
			}
		}

		node.ForEachChild(func(child *ast.Node) bool {
			visit(child)
			return false
		})
	}

	visit(&ctx.SourceFile.Node)
	return used
}

func collectJSXIdentifierNames(sourceFile *ast.SourceFile) map[string]struct{} {
	names := map[string]struct{}{}

	var visit func(node *ast.Node)
	visit = func(node *ast.Node) {
		if node == nil {
			return
		}

		switch node.Kind {
		case ast.KindJsxOpeningElement:
			addJSXTagIdentifier(node.AsJsxOpeningElement().TagName, names)
		case ast.KindJsxSelfClosingElement:
			addJSXTagIdentifier(node.AsJsxSelfClosingElement().TagName, names)
		case ast.KindJsxClosingElement:
			addJSXTagIdentifier(node.AsJsxClosingElement().TagName, names)
		}

		node.ForEachChild(func(child *ast.Node) bool {
			visit(child)
			return false
		})
	}

	visit(&sourceFile.Node)
	return names
}

func addJSXTagIdentifier(node *ast.Node, names map[string]struct{}) {
	node = ast.SkipParentheses(node)
	if node == nil {
		return
	}

	switch {
	case ast.IsIdentifier(node):
		names[node.AsIdentifier().Text] = struct{}{}
	case ast.IsPropertyAccessExpression(node):
		expr := node.AsPropertyAccessExpression().Expression
		if ast.IsIdentifier(expr) {
			names[expr.AsIdentifier().Text] = struct{}{}
		}
	}
}

func isImportLocalDefinition(node *ast.Node) bool {
	parent := node.Parent
	if parent == nil {
		return false
	}

	switch {
	case ast.IsImportClause(parent):
		return parent.AsImportClause().Name() == node
	case ast.IsNamespaceImport(parent):
		return parent.AsNamespaceImport().Name() == node
	case ast.IsImportSpecifier(parent):
		return parent.AsImportSpecifier().Name() == node
	default:
		return false
	}
}

func configuredJSXFactoryNames(ctx rule.RuleContext) map[string]struct{} {
	names := map[string]struct{}{}
	if ctx.Program == nil {
		return names
	}

	options := ctx.Program.Options()
	if options.JsxFactory != "" {
		names[options.JsxFactory] = struct{}{}
	}
	if options.JsxFragmentFactory != "" {
		names[options.JsxFragmentFactory] = struct{}{}
	}
	return names
}

func hasJSXPragma(sourceFile *ast.SourceFile, identifier string) bool {
	if sourceFile == nil {
		return false
	}

	return strings.Contains(sourceFile.Text(), "@jsx "+identifier)
}

func jsDocMentionsIdentifier(sourceFile *ast.SourceFile, identifier string) bool {
	if sourceFile == nil {
		return false
	}

	for _, comment := range blockCommentPattern.FindAllString(sourceFile.Text(), -1) {
		hasTag := false
		for _, tag := range jsDocTags {
			if strings.Contains(comment, tag) {
				hasTag = true
				break
			}
		}
		if hasTag && strings.Contains(comment, identifier) {
			return true
		}
	}

	return false
}

func importLocals(importDecl *ast.Node) []*ast.Node {
	if importDecl == nil || !ast.IsImportDeclaration(importDecl) || importDecl.AsImportDeclaration().ImportClause == nil {
		return nil
	}

	clause := importDecl.AsImportDeclaration().ImportClause.AsImportClause()
	locals := []*ast.Node{}
	if name := clause.Name(); name != nil {
		locals = append(locals, name)
	}

	if clause.NamedBindings == nil {
		return locals
	}

	bindings := clause.NamedBindings.AsNode()
	switch {
	case ast.IsNamespaceImport(bindings):
		if name := bindings.AsNamespaceImport().Name(); name != nil {
			locals = append(locals, name)
		}
	case ast.IsNamedImports(bindings):
		for _, element := range bindings.AsNamedImports().Elements.Nodes {
			if name := element.Name(); name != nil {
				locals = append(locals, name)
			}
		}
	}

	return locals
}

func removeWholeImportRange(sourceFile *ast.SourceFile, importDecl *ast.Node) core.TextRange {
	start := scanner.GetTokenPosOfNode(importDecl, sourceFile, false)
	end := importDecl.End()
	text := sourceFile.Text()
	for end < len(text) && utils.IsStrWhiteSpace(rune(text[end])) {
		end++
	}
	return core.NewTextRange(start, end)
}

func removeDefaultImportRange(sourceFile *ast.SourceFile, importDecl *ast.Node, nameNode *ast.Node) core.TextRange {
	start := scanner.GetTokenPosOfNode(nameNode, sourceFile, false)
	end := nameNode.End()
	text := sourceFile.Text()
	for end < len(text) && utils.IsStrWhiteSpace(rune(text[end])) {
		end++
	}
	if end < len(text) && text[end] == ',' {
		end++
		for end < len(text) && utils.IsStrWhiteSpace(rune(text[end])) {
			end++
		}
	}
	return core.NewTextRange(start, end)
}

func removeNamespaceImportRange(sourceFile *ast.SourceFile, specifier *ast.Node) core.TextRange {
	start := scanner.GetTokenPosOfNode(specifier, sourceFile, false)
	text := sourceFile.Text()
	for start > 0 && utils.IsStrWhiteSpace(rune(text[start-1])) {
		start--
	}
	if start > 0 && text[start-1] == ',' {
		start--
		for start > 0 && utils.IsStrWhiteSpace(rune(text[start-1])) {
			start--
		}
	}
	return core.NewTextRange(start, specifier.End())
}

func removeNamedImportRange(sourceFile *ast.SourceFile, importDecl *ast.Node, specifier *ast.Node) core.TextRange {
	clause := importDecl.AsImportDeclaration().ImportClause.AsImportClause()
	if clause.NamedBindings == nil {
		return utils.TrimNodeTextRange(sourceFile, specifier)
	}

	bindings := clause.NamedBindings.AsNode()
	if !ast.IsNamedImports(bindings) {
		return utils.TrimNodeTextRange(sourceFile, specifier)
	}

	elements := bindings.AsNamedImports().Elements.Nodes
	if len(elements) == 1 {
		start := scanner.GetTokenPosOfNode(bindings, sourceFile, false)
		if clause.Name() != nil {
			text := sourceFile.Text()
			for start > 0 && utils.IsStrWhiteSpace(rune(text[start-1])) {
				start--
			}
			if start > 0 && text[start-1] == ',' {
				start--
				for start > 0 && utils.IsStrWhiteSpace(rune(text[start-1])) {
					start--
				}
			}
		}
		return core.NewTextRange(start, bindings.End())
	}

	index := -1
	for i, element := range elements {
		if element == specifier {
			index = i
			break
		}
	}
	if index <= 0 {
		return core.NewTextRange(
			scanner.GetTokenPosOfNode(specifier, sourceFile, false),
			scanner.GetTokenPosOfNode(elements[1], sourceFile, false),
		)
	}

	return core.NewTextRange(elements[index-1].End(), specifier.End())
}

func suggestionForBinding(ctx rule.RuleContext, binding importedBinding) rule.RuleSuggestion {
	locals := importLocals(binding.importDecl)
	if len(locals) == 1 {
		return rule.RuleSuggestion{
			Message: buildRemoveWholeImportMessage(),
			FixesArr: []rule.RuleFix{
				rule.RuleFixRemoveRange(removeWholeImportRange(ctx.SourceFile, binding.importDecl)),
			},
		}
	}

	var removeRange core.TextRange
	switch binding.kind {
	case importedBindingDefault:
		removeRange = removeDefaultImportRange(ctx.SourceFile, binding.importDecl, binding.nameNode)
	case importedBindingNamespace:
		removeRange = removeNamespaceImportRange(ctx.SourceFile, binding.importSpecifier)
	default:
		removeRange = removeNamedImportRange(ctx.SourceFile, binding.importDecl, binding.importSpecifier)
	}

	return rule.RuleSuggestion{
		Message: buildRemoveSingleBindingMessage(),
		FixesArr: []rule.RuleFix{
			rule.RuleFixRemoveRange(removeRange),
		},
	}
}

func isBindingUsed(
	ctx rule.RuleContext,
	binding importedBinding,
	usedSymbols map[*ast.Symbol]struct{},
	jsxFactories map[string]struct{},
	jsxNames map[string]struct{},
) bool {
	if _, ok := usedSymbols[binding.symbol]; ok {
		return true
	}

	name := binding.nameNode.AsIdentifier().Text
	if _, ok := jsxFactories[name]; ok {
		return true
	}
	if hasJSXPragma(ctx.SourceFile, name) {
		return true
	}
	if jsDocMentionsIdentifier(ctx.SourceFile, name) {
		return true
	}

	// Lowercase JSX tags don't resolve to imported symbols, so preserve imports
	// whose local name appears as a JSX identifier token.
	if _, ok := jsxNames[name]; ok {
		return true
	}

	return false
}

var UnusedImportRule = rule.Rule{
	Name: "unused-import",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.SourceFile == nil || ctx.TypeChecker == nil {
			return nil
		}

		bindings := collectImportedBindings(ctx)
		if len(bindings) == 0 {
			return nil
		}

		usedSymbols := collectUsedImportSymbols(ctx)
		jsxFactories := configuredJSXFactoryNames(ctx)
		jsxNames := collectJSXIdentifierNames(ctx.SourceFile)

		for _, binding := range bindings {
			if isBindingUsed(ctx, binding, usedSymbols, jsxFactories, jsxNames) {
				continue
			}

			name := binding.nameNode.AsIdentifier().Text
			ctx.ReportNodeWithSuggestions(binding.nameNode, buildRemoveUnusedImportMessage(name), func() []rule.RuleSuggestion {
				return []rule.RuleSuggestion{suggestionForBinding(ctx, binding)}
			})
		}

		return nil
	},
}
