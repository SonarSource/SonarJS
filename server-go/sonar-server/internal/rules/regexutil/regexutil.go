package regexutil

import (
	"strings"

	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
	shimscanner "github.com/microsoft/typescript-go/shim/scanner"
)

type PatternFlags struct {
	Pattern    string
	Flags      string
	FlagsKnown bool
}

type ScannerValidationError struct {
	Message string
	Start   int
	End     int
}

type CapturingGroup struct {
	Name  string
	Index int
}

type ReplacementReference struct {
	Raw     string
	Name    string
	Index   int
	IsNamed bool
}

func UnwrapExpression(node *ast.Node) *ast.Node {
	for node != nil {
		node = ast.SkipParentheses(node)
		if node == nil {
			return nil
		}

		switch node.Kind {
		case ast.KindNonNullExpression:
			node = node.AsNonNullExpression().Expression
		case ast.KindAsExpression:
			node = node.AsAsExpression().Expression
		case ast.KindSatisfiesExpression:
			node = node.AsSatisfiesExpression().Expression
		default:
			return node
		}
	}

	return nil
}

func SplitRegexLiteral(text string) (pattern string, flags string, ok bool) {
	if len(text) < 2 || text[0] != '/' {
		return "", "", false
	}

	escaped := false
	inCharacterClass := false
	closingSlash := -1
	for index := 1; index < len(text); index++ {
		switch {
		case escaped:
			escaped = false
		case text[index] == '\\':
			escaped = true
		case text[index] == '[':
			inCharacterClass = true
		case text[index] == ']' && inCharacterClass:
			inCharacterClass = false
		case text[index] == '/' && !inCharacterClass:
			closingSlash = index
		}
	}

	if closingSlash <= 0 {
		return "", "", false
	}

	return text[1:closingSlash], text[closingSlash+1:], true
}

func RegexPatternTextRange(sourceFile *ast.SourceFile, node *ast.Node) (core.TextRange, string, string, bool) {
	node = UnwrapExpression(node)
	if node == nil || !ast.IsRegularExpressionLiteral(node) {
		return core.TextRange{}, "", "", false
	}

	pattern, flags, ok := SplitRegexLiteral(node.AsRegularExpressionLiteral().Text)
	if !ok {
		return core.TextRange{}, "", "", false
	}

	textRange := utils.TrimNodeTextRange(sourceFile, node)
	return core.NewTextRange(textRange.Pos()+1, textRange.End()-1-len(flags)), pattern, flags, true
}

func StaticStringValue(ctx rulepkg.RuleContext, node *ast.Node) (string, bool) {
	return staticStringValue(ctx, node, map[*ast.Symbol]struct{}{})
}

func staticStringValue(ctx rulepkg.RuleContext, node *ast.Node, seen map[*ast.Symbol]struct{}) (string, bool) {
	node = UnwrapExpression(node)
	if node == nil {
		return "", false
	}

	switch {
	case ast.IsStringLiteral(node) || node.Kind == ast.KindNoSubstitutionTemplateLiteral:
		return node.Text(), true
	case ast.IsIdentifier(node):
		if ctx.TypeChecker == nil {
			return "", false
		}
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
		initializer := symbol.ValueDeclaration.AsVariableDeclaration().Initializer
		if initializer == nil {
			return "", false
		}
		return staticStringValue(ctx, initializer, seen)
	case ast.IsBinaryExpression(node):
		expr := node.AsBinaryExpression()
		if expr.OperatorToken.Kind != ast.KindPlusToken {
			return "", false
		}
		left, ok := staticStringValue(ctx, expr.Left, seen)
		if !ok {
			return "", false
		}
		right, ok := staticStringValue(ctx, expr.Right, seen)
		if !ok {
			return "", false
		}
		return left + right, true
	default:
		return "", false
	}
}

func ResolvePatternFlags(ctx rulepkg.RuleContext, node *ast.Node) (PatternFlags, bool) {
	return resolvePatternFlags(ctx, node, map[*ast.Symbol]struct{}{})
}

func resolvePatternFlags(
	ctx rulepkg.RuleContext,
	node *ast.Node,
	seen map[*ast.Symbol]struct{},
) (PatternFlags, bool) {
	node = UnwrapExpression(node)
	if node == nil {
		return PatternFlags{}, false
	}

	switch {
	case ast.IsRegularExpressionLiteral(node):
		pattern, flags, ok := SplitRegexLiteral(node.AsRegularExpressionLiteral().Text)
		if !ok {
			return PatternFlags{}, false
		}
		return PatternFlags{Pattern: pattern, Flags: flags, FlagsKnown: true}, true
	case ast.IsStringLiteral(node) || node.Kind == ast.KindNoSubstitutionTemplateLiteral:
		return PatternFlags{Pattern: node.Text(), FlagsKnown: true}, true
	case ast.IsIdentifier(node):
		if ctx.TypeChecker == nil {
			return PatternFlags{}, false
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		if symbol == nil {
			return PatternFlags{}, false
		}
		if _, ok := seen[symbol]; ok {
			return PatternFlags{}, false
		}
		seen[symbol] = struct{}{}
		defer delete(seen, symbol)

		if symbol.ValueDeclaration == nil || !ast.IsVariableDeclaration(symbol.ValueDeclaration) {
			return PatternFlags{}, false
		}
		initializer := symbol.ValueDeclaration.AsVariableDeclaration().Initializer
		if initializer == nil {
			return PatternFlags{}, false
		}
		return resolvePatternFlags(ctx, initializer, seen)
	case ast.IsCallExpression(node):
		callee := UnwrapExpression(node.Expression())
		if ast.IsIdentifier(callee) && callee.AsIdentifier().Text == "RegExp" {
			return resolveRegExpConstructor(ctx, node.Arguments(), seen)
		}
	case ast.IsNewExpression(node):
		callee := UnwrapExpression(node.AsNewExpression().Expression)
		if ast.IsIdentifier(callee) && callee.AsIdentifier().Text == "RegExp" {
			return resolveRegExpConstructor(ctx, node.Arguments(), seen)
		}
	case ast.IsBinaryExpression(node):
		expr := node.AsBinaryExpression()
		if expr.OperatorToken.Kind != ast.KindPlusToken {
			return PatternFlags{}, false
		}
		left, ok := resolvePatternFlags(ctx, expr.Left, seen)
		if !ok || !left.FlagsKnown || left.Flags != "" {
			return PatternFlags{}, false
		}
		right, ok := resolvePatternFlags(ctx, expr.Right, seen)
		if !ok || !right.FlagsKnown || right.Flags != "" {
			return PatternFlags{}, false
		}
		return PatternFlags{
			Pattern:    left.Pattern + right.Pattern,
			FlagsKnown: true,
		}, true
	}

	return PatternFlags{}, false
}

func resolveRegExpConstructor(
	ctx rulepkg.RuleContext,
	args []*ast.Node,
	seen map[*ast.Symbol]struct{},
) (PatternFlags, bool) {
	if len(args) == 0 {
		return PatternFlags{}, false
	}

	pattern, ok := resolvePatternFlags(ctx, args[0], seen)
	if !ok {
		return PatternFlags{}, false
	}

	flags := ""
	flagsKnown := true
	if len(args) >= 2 {
		value, ok := staticStringValue(ctx, args[1], seen)
		if !ok {
			flagsKnown = false
		} else {
			flags = value
		}
	}

	return PatternFlags{
		Pattern:    pattern.Pattern,
		Flags:      flags,
		FlagsKnown: flagsKnown,
	}, true
}

func IsStringType(ctx rulepkg.RuleContext, node *ast.Node) bool {
	if ctx.TypeChecker == nil || node == nil {
		return false
	}
	return utils.GetTypeName(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(UnwrapExpression(node))) == "string"
}

func IsStringMatchCall(ctx rulepkg.RuleContext, node *ast.CallExpression) bool {
	callee := UnwrapExpression(node.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}

	name := callee.AsPropertyAccessExpression().Name()
	return name != nil &&
		name.Text() == "match" &&
		IsStringType(ctx, callee.AsPropertyAccessExpression().Expression)
}

func IsStringReplaceCall(ctx rulepkg.RuleContext, node *ast.CallExpression) bool {
	callee := UnwrapExpression(node.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}

	name := callee.AsPropertyAccessExpression().Name()
	if name == nil {
		return false
	}

	switch name.Text() {
	case "replace", "replaceAll":
		return IsStringType(ctx, callee.AsPropertyAccessExpression().Expression)
	default:
		return false
	}
}

func ExtractReplacementReferences(value string) []ReplacementReference {
	refs := make([]ReplacementReference, 0, 4)
	for index := 0; index < len(value); index++ {
		if value[index] != '$' || index+1 >= len(value) {
			continue
		}

		switch next := value[index+1]; {
		case next >= '0' && next <= '9':
			start := index + 1
			end := start
			for end < len(value) && value[end] >= '0' && value[end] <= '9' {
				end++
			}
			number := 0
			for pos := start; pos < end; pos++ {
				number = number*10 + int(value[pos]-'0')
			}
			refs = append(refs, ReplacementReference{
				Raw:   value[index:end],
				Index: number,
			})
			index = end - 1
		case next == '<':
			start := index + 2
			end := start
			if start >= len(value) || !isReplacementNameStart(value[start]) {
				continue
			}
			end++
			for end < len(value) && isReplacementNamePart(value[end]) {
				end++
			}
			if end < len(value) && value[end] == '>' {
				refs = append(refs, ReplacementReference{
					Raw:     value[index : end+1],
					Name:    value[start:end],
					IsNamed: true,
				})
				index = end
			}
		}
	}
	return refs
}

func CollectCapturingGroups(pattern string) []CapturingGroup {
	groups := make([]CapturingGroup, 0, 4)
	inCharacterClass := false
	escaped := false
	index := 0

	for pos := 0; pos < len(pattern); pos++ {
		switch {
		case escaped:
			escaped = false
			continue
		case pattern[pos] == '\\':
			escaped = true
			continue
		case pattern[pos] == '[':
			inCharacterClass = true
			continue
		case pattern[pos] == ']' && inCharacterClass:
			inCharacterClass = false
			continue
		case inCharacterClass || pattern[pos] != '(':
			continue
		}

		if pos+1 >= len(pattern) || pattern[pos+1] != '?' {
			index++
			groups = append(groups, CapturingGroup{Index: index})
			continue
		}

		if pos+2 >= len(pattern) {
			continue
		}

		if pattern[pos+2] == '<' && (pos+3 >= len(pattern) || (pattern[pos+3] != '=' && pattern[pos+3] != '!')) {
			nameStart := pos + 3
			nameEnd := nameStart
			for nameEnd < len(pattern) && pattern[nameEnd] != '>' {
				nameEnd++
			}
			index++
			group := CapturingGroup{Index: index}
			if nameEnd < len(pattern) && nameEnd > nameStart {
				group.Name = pattern[nameStart:nameEnd]
			}
			groups = append(groups, group)
		}
	}

	return groups
}

func ValidatePatternWithFlags(pattern string, flags string) []ScannerValidationError {
	return ValidateRegexLiteralSource("/" + EscapePatternForLiteral(pattern) + "/" + flags)
}

func ValidateRegexLiteralSource(source string) []ScannerValidationError {
	validator := shimscanner.NewScanner()
	validator.SetScriptTarget(core.ScriptTargetESNext)
	validator.SetLanguageVariant(core.LanguageVariantStandard)
	validator.SetText(source)

	errors := make([]ScannerValidationError, 0, 2)
	validator.SetOnError(func(message *ast.DiagnosticsMessage, start, length int, args ...any) {
		diagnostic := ast.NewDiagnostic(nil, core.NewTextRange(start, start+length), message, args...)
		errors = append(errors, ScannerValidationError{
			Message: utils.GetDiagnosticMessage(diagnostic),
			Start:   start,
			End:     start + length,
		})
	})

	validator.Scan()
	validator.ReScanSlashToken(true)
	return errors
}

func ValidateFlags(flags string) bool {
	seen := map[rune]struct{}{}
	hasU := false
	hasV := false
	for _, flag := range flags {
		switch flag {
		case 'd', 'g', 'i', 'm', 's', 'u', 'v', 'y':
		default:
			return false
		}
		if _, ok := seen[flag]; ok {
			return false
		}
		seen[flag] = struct{}{}
		hasU = hasU || flag == 'u'
		hasV = hasV || flag == 'v'
	}
	return !(hasU && hasV)
}

func DisplayRegex(pattern string, flags string) string {
	return "/" + pattern + "/" + flags
}

func HasUnterminatedCharacterClass(pattern string) bool {
	inCharacterClass := false
	escaped := false
	for index := 0; index < len(pattern); index++ {
		switch {
		case escaped:
			escaped = false
		case pattern[index] == '\\':
			escaped = true
		case pattern[index] == '[':
			inCharacterClass = true
		case pattern[index] == ']' && inCharacterClass:
			inCharacterClass = false
		}
	}
	return inCharacterClass
}

func EscapePatternForLiteral(pattern string) string {
	var builder strings.Builder
	builder.Grow(len(pattern) + 4)

	for index := 0; index < len(pattern); index++ {
		if pattern[index] == '/' && !IsEscapedAt(pattern, index) {
			builder.WriteByte('\\')
		}
		builder.WriteByte(pattern[index])
	}

	return builder.String()
}

func IsEscapedAt(text string, index int) bool {
	backslashes := 0
	for pos := index - 1; pos >= 0 && text[pos] == '\\'; pos-- {
		backslashes++
	}
	return backslashes%2 == 1
}

func isReplacementNameStart(ch byte) bool {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}

func isReplacementNamePart(ch byte) bool {
	return isReplacementNameStart(ch) || (ch >= '0' && ch <= '9') || ch == '_'
}
