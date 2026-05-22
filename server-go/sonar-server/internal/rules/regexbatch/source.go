package regexbatch

import (
	"strconv"
	"strings"
	"unicode/utf8"

	rulepkg "github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
	shimscanner "github.com/microsoft/typescript-go/shim/scanner"
)

type PatternSource struct {
	Pattern    string
	Flags      string
	FlagsKnown bool

	byteStarts   []int
	byteEnds     []int
	contentRange core.TextRange
}

type decodedString struct {
	value        string
	byteStarts   []int
	byteEnds     []int
	contentRange core.TextRange
}

func (d *decodedString) appendMappedValue(value string, srcStart int, srcEnd int) {
	if value == "" {
		return
	}

	d.value += value
	if len(value) == srcEnd-srcStart {
		for i := 0; i < len(value); i++ {
			d.byteStarts = append(d.byteStarts, srcStart+i)
			d.byteEnds = append(d.byteEnds, srcStart+i+1)
		}
		return
	}

	for i := 0; i < len(value); i++ {
		d.byteStarts = append(d.byteStarts, srcStart)
		d.byteEnds = append(d.byteEnds, srcEnd)
	}
}

func (d *decodedString) appendDecodedString(other decodedString) {
	if d.contentRange == (core.TextRange{}) {
		d.contentRange = other.contentRange
	}
	d.value += other.value
	d.byteStarts = append(d.byteStarts, other.byteStarts...)
	d.byteEnds = append(d.byteEnds, other.byteEnds...)
}

func (d decodedString) resolveRange(start int, end int) (core.TextRange, bool) {
	if start < 0 || end < start || end > len(d.value) {
		return core.TextRange{}, false
	}

	if start == end {
		switch {
		case len(d.byteStarts) == 0:
			return core.NewTextRange(d.contentRange.Pos(), d.contentRange.Pos()), true
		case start == len(d.value):
			pos := d.byteEnds[len(d.byteEnds)-1]
			return core.NewTextRange(pos, pos), true
		default:
			pos := d.byteStarts[start]
			return core.NewTextRange(pos, pos), true
		}
	}

	rangeStart := d.byteStarts[start]
	rangeEnd := d.byteEnds[start]
	currentStart := d.byteStarts[start]
	currentEnd := d.byteEnds[start]

	for index := start + 1; index < end; index++ {
		byteStart := d.byteStarts[index]
		byteEnd := d.byteEnds[index]

		switch {
		case byteStart == currentStart && byteEnd == currentEnd:
			continue
		case byteStart == currentEnd:
			currentStart = byteStart
			currentEnd = byteEnd
			rangeEnd = byteEnd
		default:
			return core.TextRange{}, false
		}
	}

	return core.NewTextRange(rangeStart, rangeEnd), true
}

func (p *PatternSource) ResolvePatternRange(start int, end int) (core.TextRange, bool) {
	if p == nil {
		return core.TextRange{}, false
	}
	return decodedString{
		value:        p.Pattern,
		byteStarts:   p.byteStarts,
		byteEnds:     p.byteEnds,
		contentRange: p.contentRange,
	}.resolveRange(start, end)
}

func (p *PatternSource) ContentRange() core.TextRange {
	if p == nil {
		return core.TextRange{}
	}
	return p.contentRange
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

func ResolvePatternSource(ctx rulepkg.RuleContext, node *ast.Node) (*PatternSource, bool) {
	node = UnwrapExpression(node)
	if node == nil {
		return nil, false
	}

	switch {
	case ast.IsRegularExpressionLiteral(node):
		return resolveRegExpLiteral(ctx.SourceFile, node)
	case ast.IsCallExpression(node):
		callExpr := node.AsCallExpression()
		if !isRegExpCallee(UnwrapExpression(callExpr.Expression)) {
			return nil, false
		}
		return resolveRegExpConstructor(ctx, callExpr.Arguments.Nodes)
	case ast.IsNewExpression(node):
		newExpr := node.AsNewExpression()
		if !isRegExpCallee(UnwrapExpression(newExpr.Expression)) {
			return nil, false
		}
		return resolveRegExpConstructor(ctx, node.Arguments())
	default:
		return nil, false
	}
}

func resolveRegExpLiteral(sourceFile *ast.SourceFile, node *ast.Node) (*PatternSource, bool) {
	pattern, flags, ok := splitRegexLiteral(node.AsRegularExpressionLiteral().Text)
	if !ok {
		return nil, false
	}

	textRange := utils.TrimNodeTextRange(sourceFile, node)
	start := textRange.Pos() + 1
	end := textRange.End() - 1 - len(flags)
	if end < start {
		end = start
	}

	decoded := decodedString{
		value:        pattern,
		contentRange: core.NewTextRange(start, end),
	}
	for i := 0; i < len(pattern); i++ {
		decoded.byteStarts = append(decoded.byteStarts, start+i)
		decoded.byteEnds = append(decoded.byteEnds, start+i+1)
	}

	return &PatternSource{
		Pattern:      pattern,
		Flags:        flags,
		FlagsKnown:   true,
		byteStarts:   decoded.byteStarts,
		byteEnds:     decoded.byteEnds,
		contentRange: decoded.contentRange,
	}, true
}

func resolveRegExpConstructor(ctx rulepkg.RuleContext, args []*ast.Node) (*PatternSource, bool) {
	patternValue, patternRange, ok := resolveStringExpression(ctx, firstArgument(args), map[*ast.Symbol]struct{}{})
	if !ok {
		return nil, false
	}

	flags := ""
	flagsKnown := true
	if len(args) >= 2 {
		flagsValue, _, ok := resolveStringExpression(ctx, args[1], map[*ast.Symbol]struct{}{})
		if !ok {
			flagsKnown = false
		} else {
			flags = flagsValue.value
		}
	}

	return &PatternSource{
		Pattern:      patternValue.value,
		Flags:        flags,
		FlagsKnown:   flagsKnown,
		byteStarts:   patternValue.byteStarts,
		byteEnds:     patternValue.byteEnds,
		contentRange: patternRange,
	}, true
}

func firstArgument(args []*ast.Node) *ast.Node {
	if len(args) == 0 {
		return nil
	}
	return args[0]
}

func resolveStringExpression(
	ctx rulepkg.RuleContext,
	node *ast.Node,
	seen map[*ast.Symbol]struct{},
) (decodedString, core.TextRange, bool) {
	node = UnwrapExpression(node)
	if node == nil {
		return decodedString{}, core.TextRange{}, false
	}

	switch {
	case ast.IsStringLiteral(node):
		value, ok := decodeQuotedStringLiteral(ctx.SourceFile, node, '\'')
		if !ok {
			value, ok = decodeQuotedStringLiteral(ctx.SourceFile, node, '"')
		}
		return value, value.contentRange, ok
	case ast.IsNoSubstitutionTemplateLiteral(node):
		value, ok := decodeTemplateLiteral(ctx.SourceFile, node)
		return value, value.contentRange, ok
	case ast.IsTaggedTemplateExpression(node):
		value, ok := decodeStringRawTemplate(ctx.SourceFile, node)
		return value, value.contentRange, ok
	case ast.IsIdentifier(node):
		if ctx.TypeChecker == nil {
			return decodedString{}, core.TextRange{}, false
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		if symbol == nil {
			return decodedString{}, core.TextRange{}, false
		}
		if _, ok := seen[symbol]; ok {
			return decodedString{}, core.TextRange{}, false
		}
		seen[symbol] = struct{}{}
		defer delete(seen, symbol)

		if symbol.ValueDeclaration == nil || !ast.IsVariableDeclaration(symbol.ValueDeclaration) {
			return decodedString{}, core.TextRange{}, false
		}

		initializer := symbol.ValueDeclaration.AsVariableDeclaration().Initializer
		if initializer == nil {
			return decodedString{}, core.TextRange{}, false
		}

		return resolveStringExpression(ctx, initializer, seen)
	case ast.IsBinaryExpression(node):
		expr := node.AsBinaryExpression()
		if expr.OperatorToken.Kind != ast.KindPlusToken {
			return decodedString{}, core.TextRange{}, false
		}

		left, _, ok := resolveStringExpression(ctx, expr.Left, seen)
		if !ok {
			return decodedString{}, core.TextRange{}, false
		}
		right, _, ok := resolveStringExpression(ctx, expr.Right, seen)
		if !ok {
			return decodedString{}, core.TextRange{}, false
		}

		combined := decodedString{contentRange: left.contentRange}
		combined.appendDecodedString(left)
		combined.appendDecodedString(right)
		return combined, combined.contentRange, true
	default:
		return decodedString{}, core.TextRange{}, false
	}
}

func decodeQuotedStringLiteral(sourceFile *ast.SourceFile, node *ast.Node, quote byte) (decodedString, bool) {
	textRange := utils.TrimNodeTextRange(sourceFile, node)
	raw := sourceFile.Text()[textRange.Pos():textRange.End()]
	if len(raw) < 2 || raw[0] != quote || raw[len(raw)-1] != quote {
		return decodedString{}, false
	}

	contentStart := textRange.Pos() + 1
	contentEnd := textRange.End() - 1
	return decodeEscapedStringContent(sourceFile.Text(), contentStart, contentEnd, true), true
}

func decodeTemplateLiteral(sourceFile *ast.SourceFile, node *ast.Node) (decodedString, bool) {
	textRange := utils.TrimNodeTextRange(sourceFile, node)
	raw := sourceFile.Text()[textRange.Pos():textRange.End()]
	if len(raw) < 2 || raw[0] != '`' || raw[len(raw)-1] != '`' {
		return decodedString{}, false
	}

	contentStart := textRange.Pos() + 1
	contentEnd := textRange.End() - 1
	return decodeEscapedStringContent(sourceFile.Text(), contentStart, contentEnd, false), true
}

func decodeStringRawTemplate(sourceFile *ast.SourceFile, node *ast.Node) (decodedString, bool) {
	tagged := node.AsTaggedTemplateExpression()
	tag := UnwrapExpression(tagged.Tag)
	if tag == nil || !ast.IsPropertyAccessExpression(tag) {
		return decodedString{}, false
	}

	propertyAccess := tag.AsPropertyAccessExpression()
	object := UnwrapExpression(propertyAccess.Expression)
	name := propertyAccess.Name()
	if object == nil || name == nil {
		return decodedString{}, false
	}
	if !ast.IsIdentifier(object) || object.AsIdentifier().Text != "String" || name.Text() != "raw" {
		return decodedString{}, false
	}

	template := UnwrapExpression(tagged.Template)
	if template == nil || !ast.IsNoSubstitutionTemplateLiteral(template) {
		return decodedString{}, false
	}

	textRange := utils.TrimNodeTextRange(sourceFile, template)
	raw := sourceFile.Text()[textRange.Pos():textRange.End()]
	if len(raw) < 2 || raw[0] != '`' || raw[len(raw)-1] != '`' {
		return decodedString{}, false
	}

	contentStart := textRange.Pos() + 1
	contentEnd := textRange.End() - 1
	decoded := decodedString{
		contentRange: core.NewTextRange(contentStart, contentEnd),
	}
	for pos := contentStart; pos < contentEnd; {
		r, size := utf8.DecodeRuneInString(sourceFile.Text()[pos:contentEnd])
		if r == utf8.RuneError && size == 0 {
			break
		}
		decoded.appendMappedValue(string(r), pos, pos+size)
		pos += size
	}
	return decoded, true
}

func decodeEscapedStringContent(source string, contentStart int, contentEnd int, lineBreaksError bool) decodedString {
	decoded := decodedString{
		contentRange: core.NewTextRange(contentStart, contentEnd),
	}

	for pos := contentStart; pos < contentEnd; {
		ch := source[pos]
		if ch != '\\' {
			r, size := utf8.DecodeRuneInString(source[pos:contentEnd])
			if r == utf8.RuneError && size == 0 {
				break
			}
			decoded.appendMappedValue(string(r), pos, pos+size)
			pos += size
			continue
		}

		value, next := decodeEscapeSequence(source, pos, contentEnd, lineBreaksError)
		decoded.appendMappedValue(value, pos, next)
		pos = next
	}

	return decoded
}

func decodeEscapeSequence(source string, start int, limit int, lineBreaksError bool) (string, int) {
	if start+1 >= limit {
		return "", limit
	}

	pos := start + 1
	switch source[pos] {
	case '\'':
		return "'", pos + 1
	case '"':
		return `"`, pos + 1
	case '\\':
		return `\`, pos + 1
	case 'b':
		return "\b", pos + 1
	case 'f':
		return "\f", pos + 1
	case 'n':
		return "\n", pos + 1
	case 'r':
		return "\r", pos + 1
	case 't':
		return "\t", pos + 1
	case 'v':
		return "\v", pos + 1
	case '0':
		if pos+1 < limit && source[pos+1] >= '0' && source[pos+1] <= '9' {
			return "\x00", pos + 1
		}
		return "\x00", pos + 1
	case 'x':
		if pos+2 < limit {
			if value, err := strconv.ParseUint(source[pos+1:pos+3], 16, 8); err == nil {
				return string(byte(value)), pos + 3
			}
		}
		return "x", pos + 1
	case 'u':
		if pos+1 < limit && source[pos+1] == '{' {
			end := pos + 2
			for end < limit && source[end] != '}' {
				end++
			}
			if end < limit {
				if value, err := strconv.ParseUint(source[pos+2:end], 16, 32); err == nil {
					return string(rune(value)), end + 1
				}
				return source[start : end+1], end + 1
			}
			return source[start:limit], limit
		}
		if pos+4 < limit {
			if value, err := strconv.ParseUint(source[pos+1:pos+5], 16, 16); err == nil {
				return string(rune(value)), pos + 5
			}
		}
		return "u", pos + 1
	case '\r':
		pos++
		if pos < limit && source[pos] == '\n' {
			pos++
		}
		return "", pos
	case '\n':
		return "", pos + 1
	default:
		if !lineBreaksError && source[pos] == '\n' {
			return "\n", pos + 1
		}
		return source[pos : pos+1], pos + 1
	}
}

func splitRegexLiteral(text string) (pattern string, flags string, ok bool) {
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

func isRegExpCallee(node *ast.Node) bool {
	switch {
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text == "RegExp"
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		return name != nil && name.Text() == "RegExp"
	default:
		return false
	}
}

func ValidatePatternWithFlags(pattern string, flags string) bool {
	if !validateFlags(flags) {
		return false
	}

	validator := shimscanner.NewScanner()
	validator.SetScriptTarget(core.ScriptTargetESNext)
	validator.SetLanguageVariant(core.LanguageVariantStandard)
	validator.SetText("/" + escapePatternForLiteral(pattern) + "/" + flags)

	valid := true
	validator.SetOnError(func(message *ast.DiagnosticsMessage, start, length int, args ...any) {
		valid = false
	})

	validator.Scan()
	validator.ReScanSlashToken(true)
	return valid
}

func validateFlags(flags string) bool {
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

func escapePatternForLiteral(pattern string) string {
	var builder strings.Builder
	builder.Grow(len(pattern) + 4)

	for index := 0; index < len(pattern); index++ {
		if pattern[index] == '/' && !isEscapedAt(pattern, index) {
			builder.WriteByte('\\')
		}
		builder.WriteByte(pattern[index])
	}

	return builder.String()
}

func isEscapedAt(text string, index int) bool {
	backslashes := 0
	for pos := index - 1; pos >= 0 && text[pos] == '\\'; pos-- {
		backslashes++
	}
	return backslashes%2 == 1
}
