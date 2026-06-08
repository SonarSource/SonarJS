package s5860_unused_named_groups

import (
	"fmt"
	"strconv"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexbatch"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexutil"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

type groupKnowledge struct {
	name  string
	index int
	start int
	end   int
	used  bool
}

type backreferenceKnowledge struct {
	start int
	end   int
	index int
}

type regexKnowledge struct {
	node       *ast.Node
	source     *regexbatch.PatternSource
	groups     []*groupKnowledge
	matched    bool
	reported   bool
	indexedRef []backreferenceKnowledge
}

type regexIntelliSense struct {
	ctx          rule.RuleContext
	knowledge    []*regexKnowledge
	byNode       map[*ast.Node]*regexKnowledge
	bindings     map[*ast.Symbol]*regexKnowledge
	replacements map[*ast.Node]struct{}
}

func newRegexIntelliSense(ctx rule.RuleContext) *regexIntelliSense {
	return &regexIntelliSense{
		ctx:          ctx,
		byNode:       map[*ast.Node]*regexKnowledge{},
		bindings:     map[*ast.Symbol]*regexKnowledge{},
		replacements: map[*ast.Node]struct{}{},
	}
}

func buildUnusedNamedGroupsMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: "Use the named groups of this regex or remove the names.",
	}
}

func buildIndexedGroupMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: fmt.Sprintf("Directly use '%s' instead of its group number.", name),
	}
}

func buildIndexedReplacementMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: "Directly use the group names instead of their numbers.",
	}
}

func buildMissingNamedGroupMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "issue",
		Description: fmt.Sprintf("There is no group named '%s' in the regular expression.", name),
	}
}

func groupLabel(prefix string, group *groupKnowledge) rule.RuleLabeledRange {
	return rule.RuleLabeledRange{
		Label: fmt.Sprintf("%s '%s'", prefix, group.name),
	}
}

type parsedBackreference struct {
	start   int
	end     int
	index   int
	name    string
	named   bool
	escaped bool
}

func parseNamedGroups(pattern string) ([]*groupKnowledge, []parsedBackreference) {
	groups := []*groupKnowledge{}
	references := []parsedBackreference{}
	inCharacterClass := false
	escaped := false
	index := 0

	for pos := 0; pos < len(pattern); pos++ {
		switch {
		case escaped:
			escaped = false
			continue
		case pattern[pos] == '\\':
			if inCharacterClass || pos+1 >= len(pattern) {
				escaped = true
				continue
			}

			switch next := pattern[pos+1]; {
			case next >= '1' && next <= '9':
				end := pos + 2
				refIndex := int(next - '0')
				for end < len(pattern) && pattern[end] >= '0' && pattern[end] <= '9' {
					refIndex = refIndex*10 + int(pattern[end]-'0')
					end++
				}
				references = append(references, parsedBackreference{start: pos, end: end, index: refIndex})
				pos = end - 1
				continue
			case next == 'k' && pos+2 < len(pattern) && pattern[pos+2] == '<':
				end := pos + 3
				for end < len(pattern) && pattern[end] != '>' {
					end++
				}
				if end < len(pattern) {
					references = append(references, parsedBackreference{
						start: pos,
						end:   end + 1,
						name:  pattern[pos+3 : end],
						named: true,
					})
					pos = end
					continue
				}
			}

			escaped = true
		case pattern[pos] == '[':
			inCharacterClass = true
		case pattern[pos] == ']' && inCharacterClass:
			inCharacterClass = false
		case inCharacterClass || pattern[pos] != '(':
			continue
		case pos+1 < len(pattern) && pattern[pos+1] == '?':
			if pos+2 < len(pattern) && pattern[pos+2] == '<' && (pos+3 >= len(pattern) || (pattern[pos+3] != '=' && pattern[pos+3] != '!')) {
				nameStart := pos + 3
				nameEnd := nameStart
				for nameEnd < len(pattern) && pattern[nameEnd] != '>' {
					nameEnd++
				}
				index++
				if nameEnd < len(pattern) && nameEnd > nameStart {
					groupEnd := findGroupEnd(pattern, pos)
					if groupEnd < nameEnd+1 {
						groupEnd = nameEnd + 1
					}
					groups = append(groups, &groupKnowledge{
						name:  pattern[nameStart:nameEnd],
						index: index,
						start: pos,
						end:   groupEnd,
					})
				}
			}
		default:
			index++
		}
	}

	return groups, references
}

func findGroupEnd(pattern string, start int) int {
	depth := 0
	inCharacterClass := false
	escaped := false

	for pos := start; pos < len(pattern); pos++ {
		switch {
		case escaped:
			escaped = false
		case pattern[pos] == '\\':
			escaped = true
		case pattern[pos] == '[':
			if !inCharacterClass {
				inCharacterClass = true
			}
		case pattern[pos] == ']':
			if inCharacterClass {
				inCharacterClass = false
			}
		case inCharacterClass:
			continue
		case pattern[pos] == '(':
			depth++
		case pattern[pos] == ')':
			depth--
			if depth == 0 {
				return pos + 1
			}
		}
	}

	return start
}

func makeRegexKnowledge(node *ast.Node, source *regexbatch.PatternSource) *regexKnowledge {
	groups, references := parseNamedGroups(source.Pattern)
	knowledge := &regexKnowledge{
		node:   node,
		source: source,
		groups: groups,
	}

	for _, ref := range references {
		if ref.named {
			for _, group := range groups {
				if group.name == ref.name {
					group.used = true
				}
			}
			continue
		}

		for _, group := range groups {
			if group.index == ref.index {
				knowledge.indexedRef = append(knowledge.indexedRef, backreferenceKnowledge{
					start: ref.start,
					end:   ref.end,
					index: ref.index,
				})
			}
		}
	}

	return knowledge
}

func (r *regexIntelliSense) collectKnowledge(node *ast.Node) {
	source, ok := regexbatch.ResolvePatternSource(r.ctx, node)
	if !ok || !regexbatch.ValidatePatternWithFlags(source.Pattern, source.Flags) {
		return
	}

	knowledge := makeRegexKnowledge(node, source)
	r.knowledge = append(r.knowledge, knowledge)
	r.byNode[node] = knowledge
}

func identifierSymbol(ctx rule.RuleContext, node *ast.Node) *ast.Symbol {
	if ctx.TypeChecker == nil || node == nil || !ast.IsIdentifier(node) {
		return nil
	}
	return ctx.TypeChecker.GetSymbolAtLocation(node)
}

func (r *regexIntelliSense) findRegex(node *ast.Node) *regexKnowledge {
	node = regexutil.UnwrapExpression(node)
	if node == nil {
		return nil
	}
	if knowledge := r.byNode[node]; knowledge != nil {
		return knowledge
	}

	if symbol := identifierSymbol(r.ctx, node); symbol != nil &&
		symbol.ValueDeclaration != nil &&
		ast.IsVariableDeclaration(symbol.ValueDeclaration) {
		initializer := symbol.ValueDeclaration.AsVariableDeclaration().Initializer
		if initializer != nil && initializer != node {
			return r.findRegex(initializer)
		}
	}

	return nil
}

func isStringRegexMatcherCall(ctx rule.RuleContext, callExpr *ast.CallExpression) (*ast.Node, bool) {
	callee := regexutil.UnwrapExpression(callExpr.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return nil, false
	}

	name := callee.AsPropertyAccessExpression().Name()
	if name == nil {
		return nil, false
	}

	switch name.Text() {
	case "match", "matchAll":
		if len(callExpr.Arguments.Nodes) == 0 || !regexutil.IsStringType(ctx, callee.AsPropertyAccessExpression().Expression) {
			return nil, false
		}
		return callExpr.Arguments.Nodes[0], true
	case "exec":
		if len(callExpr.Arguments.Nodes) == 0 || !regexutil.IsStringType(ctx, callExpr.Arguments.Nodes[0]) {
			return nil, false
		}
		return callee.AsPropertyAccessExpression().Expression, true
	default:
		return nil, false
	}
}

func assignedIdentifier(node *ast.Node) *ast.Node {
	parent := node.Parent
	switch {
	case parent != nil && ast.IsVariableDeclaration(parent) && parent.AsVariableDeclaration().Initializer == node && ast.IsIdentifier(parent.Name()):
		return parent.Name()
	case parent != nil && ast.IsBinaryExpression(parent) && parent.AsBinaryExpression().Right == node && ast.IsIdentifier(parent.AsBinaryExpression().Left):
		return parent.AsBinaryExpression().Left
	default:
		return nil
	}
}

func (r *regexIntelliSense) collectPatternMatcher(callNode *ast.Node) {
	callExpr := callNode.AsCallExpression()
	patternNode, ok := isStringRegexMatcherCall(r.ctx, callExpr)
	if !ok {
		return
	}

	regex := r.findRegex(patternNode)
	if regex == nil {
		return
	}

	matcher := assignedIdentifier(callNode)
	if matcher == nil {
		return
	}

	if symbol := identifierSymbol(r.ctx, matcher); symbol != nil {
		regex.matched = true
		r.bindings[symbol] = regex
	}
}

func staticNumericValue(ctx rule.RuleContext, node *ast.Node) (int, bool) {
	node = regexutil.UnwrapExpression(node)
	if node == nil {
		return 0, false
	}

	switch {
	case ast.IsNumericLiteral(node):
		value, err := strconv.Atoi(node.AsNumericLiteral().Text)
		return value, err == nil
	case ast.IsIdentifier(node):
		if ctx.TypeChecker == nil {
			return 0, false
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		if symbol == nil || symbol.ValueDeclaration == nil || !ast.IsVariableDeclaration(symbol.ValueDeclaration) {
			return 0, false
		}
		return staticNumericValue(ctx, symbol.ValueDeclaration.AsVariableDeclaration().Initializer)
	default:
		return 0, false
	}
}

func (r *regexIntelliSense) resolveMatcher(node *ast.Node) *regexKnowledge {
	if symbol := identifierSymbol(r.ctx, node); symbol != nil {
		return r.bindings[symbol]
	}
	return nil
}

func groupSecondaries(regex *regexKnowledge, groups []*groupKnowledge, label string) []rule.RuleLabeledRange {
	secondaries := make([]rule.RuleLabeledRange, 0, len(groups))
	for _, group := range groups {
		textRange, ok := regex.source.ResolvePatternRange(group.start, group.end)
		if !ok || textRange.Len() == 0 {
			continue
		}
		secondary := groupLabel(label, group)
		secondary.Range = textRange
		secondaries = append(secondaries, secondary)
	}
	return secondaries
}

func (r *regexIntelliSense) checkIndexBasedGroupReference(node *ast.Node) {
	if !ast.IsElementAccessExpression(node) {
		return
	}

	elementAccess := node.AsElementAccessExpression()
	regex := r.resolveMatcher(elementAccess.Expression)
	if regex == nil {
		return
	}

	index, ok := staticNumericValue(r.ctx, elementAccess.ArgumentExpression)
	if !ok {
		return
	}

	for _, group := range regex.groups {
		if group.index != index {
			continue
		}
		group.used = true
		r.ctx.ReportDiagnostic(rule.RuleDiagnostic{
			Range:         utils.TrimNodeTextRange(r.ctx.SourceFile, elementAccess.ArgumentExpression),
			Message:       buildIndexedGroupMessage(group.name),
			LabeledRanges: groupSecondaries(regex, []*groupKnowledge{group}, "Group"),
		})
		r.reportUnusedGroups(regex)
		return
	}
}

func (r *regexIntelliSense) groupContainer(node *ast.Node) *regexKnowledge {
	node = regexutil.UnwrapExpression(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return nil
	}

	propertyAccess := node.AsPropertyAccessExpression()
	name := propertyAccess.Name()
	if name == nil || name.Text() != "groups" {
		return nil
	}

	object := regexutil.UnwrapExpression(propertyAccess.Expression)
	if ast.IsPropertyAccessExpression(object) {
		parent := object.AsPropertyAccessExpression().Name()
		if parent != nil && parent.Text() == "indices" {
			return r.resolveMatcher(object.AsPropertyAccessExpression().Expression)
		}
	}

	return r.resolveMatcher(propertyAccess.Expression)
}

func (r *regexIntelliSense) checkNamedGroupReference(node *ast.Node) {
	var (
		container *regexKnowledge
		nameNode  *ast.Node
		groupName string
	)

	switch {
	case ast.IsPropertyAccessExpression(node):
		propertyAccess := node.AsPropertyAccessExpression()
		container = r.groupContainer(propertyAccess.Expression)
		nameNode = propertyAccess.Name()
		if nameNode != nil {
			groupName = nameNode.AsIdentifier().Text
		}
	case ast.IsElementAccessExpression(node):
		elementAccess := node.AsElementAccessExpression()
		container = r.groupContainer(elementAccess.Expression)
		if value, ok := regexutil.StaticStringValue(r.ctx, elementAccess.ArgumentExpression); ok {
			groupName = value
			nameNode = elementAccess.ArgumentExpression
		}
	}

	if container == nil || nameNode == nil || groupName == "" {
		return
	}

	for _, group := range container.groups {
		if group.name == groupName {
			group.used = true
			r.reportUnusedGroups(container)
			return
		}
	}

	r.ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:         utils.TrimNodeTextRange(r.ctx.SourceFile, nameNode),
		Message:       buildMissingNamedGroupMessage(groupName),
		LabeledRanges: groupSecondaries(container, container.groups, "Named group"),
	})
	r.reportUnusedGroups(container)
}

func collectDestructuredGroupNames(node *ast.Node, names *[]string) {
	if node == nil || !ast.IsBindingPattern(node) {
		return
	}

	for _, element := range node.AsBindingPattern().Elements.Nodes {
		if element == nil || !ast.IsBindingElement(element) {
			continue
		}
		propertyName := element.AsBindingElement().PropertyName
		switch {
		case ast.IsIdentifier(propertyName):
			*names = append(*names, propertyName.AsIdentifier().Text)
		case propertyName == nil && ast.IsIdentifier(element.AsBindingElement().Name()):
			*names = append(*names, element.AsBindingElement().Name().AsIdentifier().Text)
		}
	}
}

func (r *regexIntelliSense) checkGroupDestructuring(node *ast.Node) {
	var (
		target    *ast.Node
		container *regexKnowledge
	)

	switch {
	case ast.IsVariableDeclaration(node):
		target = node.Name()
		container = r.groupContainer(node.AsVariableDeclaration().Initializer)
	case ast.IsBinaryExpression(node):
		if !ast.IsAssignmentExpression(node, false) {
			return
		}
		target = node.AsBinaryExpression().Left
		container = r.groupContainer(node.AsBinaryExpression().Right)
	default:
		return
	}

	if container == nil {
		return
	}

	names := []string{}
	collectDestructuredGroupNames(target, &names)
	for _, name := range names {
		for _, group := range container.groups {
			if group.name == name {
				group.used = true
			}
		}
	}
}

func (r *regexIntelliSense) checkStringReplaceGroupReferences(callExpr *ast.CallExpression) {
	if !regexutil.IsStringReplaceCall(r.ctx, callExpr) || len(callExpr.Arguments.Nodes) < 2 {
		return
	}

	regex := r.findRegex(callExpr.Arguments.Nodes[0])
	if regex == nil {
		return
	}

	replacement := regexutil.UnwrapExpression(callExpr.Arguments.Nodes[1])
	if replacement == nil {
		return
	}
	value, ok := regexutil.StaticStringValue(r.ctx, replacement)
	if !ok {
		return
	}

	indexedGroups := []*groupKnowledge{}
	for _, reference := range regexutil.ExtractReplacementReferences(value) {
		if reference.IsNamed {
			for _, group := range regex.groups {
				if group.name == reference.Name {
					group.used = true
				}
			}
			continue
		}

		for _, group := range regex.groups {
			if group.index == reference.Index {
				group.used = true
				indexedGroups = append(indexedGroups, group)
			}
		}
	}

	if len(indexedGroups) == 0 {
		return
	}
	if _, ok := r.replacements[replacement]; ok {
		return
	}

	r.ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:         utils.TrimNodeTextRange(r.ctx.SourceFile, replacement),
		Message:       buildIndexedReplacementMessage(),
		LabeledRanges: groupSecondaries(regex, indexedGroups, "Group"),
	})
	r.replacements[replacement] = struct{}{}
	r.reportUnusedGroups(regex)
}

func (r *regexIntelliSense) reportUnusedGroups(regex *regexKnowledge) {
	if regex == nil || !regex.matched || regex.reported {
		return
	}

	unused := []*groupKnowledge{}
	for _, group := range regex.groups {
		if !group.used {
			unused = append(unused, group)
		}
	}
	if len(unused) == 0 {
		return
	}

	r.ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:         utils.TrimNodeTextRange(r.ctx.SourceFile, regex.node),
		Message:       buildUnusedNamedGroupsMessage(),
		LabeledRanges: groupSecondaries(regex, unused, "Named group"),
	})
	regex.reported = true
}

func (r *regexIntelliSense) checkUnusedGroups() {
	for _, regex := range r.knowledge {
		r.reportUnusedGroups(regex)
	}
}

func (r *regexIntelliSense) checkIndexedBackreferences() {
	for _, regex := range r.knowledge {
		for _, reference := range regex.indexedRef {
			var target *groupKnowledge
			for _, group := range regex.groups {
				if group.index == reference.index {
					target = group
					break
				}
			}
			if target == nil {
				continue
			}
			textRange, ok := regex.source.ResolvePatternRange(reference.start, reference.end)
			if !ok {
				continue
			}
			r.ctx.ReportDiagnostic(rule.RuleDiagnostic{
				Range:         textRange,
				Message:       buildIndexedGroupMessage(target.name),
				LabeledRanges: groupSecondaries(regex, []*groupKnowledge{target}, "Group"),
			})
		}
	}
}

var UnusedNamedGroupsRule = rule.Rule{
	Name: "unused-named-groups",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		intellisense := newRegexIntelliSense(ctx)
		return rule.RuleListeners{
			ast.KindRegularExpressionLiteral: func(node *ast.Node) {
				intellisense.collectKnowledge(node)
			},
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				intellisense.collectKnowledge(node)
				intellisense.collectPatternMatcher(node)
				intellisense.checkStringReplaceGroupReferences(callExpr)
			},
			ast.KindNewExpression: func(node *ast.Node) {
				intellisense.collectKnowledge(node)
			},
			ast.KindElementAccessExpression: func(node *ast.Node) {
				intellisense.checkIndexBasedGroupReference(node)
				intellisense.checkNamedGroupReference(node)
			},
			ast.KindPropertyAccessExpression: func(node *ast.Node) {
				intellisense.checkNamedGroupReference(node)
			},
			ast.KindVariableDeclaration: func(node *ast.Node) {
				intellisense.checkGroupDestructuring(node)
			},
			ast.KindBinaryExpression: func(node *ast.Node) {
				intellisense.checkGroupDestructuring(node)
			},
			rule.ListenerOnExit(ast.KindSourceFile): func(node *ast.Node) {
				intellisense.checkUnusedGroups()
				intellisense.checkIndexedBackreferences()
			},
		}
	},
}
