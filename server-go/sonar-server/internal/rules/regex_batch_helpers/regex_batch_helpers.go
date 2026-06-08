package regex_batch_helpers

import (
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
)

type Flags struct {
	IgnoreCase bool
	Unicode    bool
}

type RegexNode interface {
	Span() (start int, end int)
	regexNode()
}

type Element interface {
	RegexNode
	regexElement()
}

type ClassElement interface {
	RegexNode
	regexClassElement()
}

type Alternation interface {
	RegexNode
	AlternativesList() []*Alternative
}

type regexSpan struct {
	start int
	end   int
}

func (s regexSpan) Span() (int, int) {
	return s.start, s.end
}

type Pattern struct {
	regexSpan
	Alternatives []*Alternative
}

func (n *Pattern) regexNode() {}

func (n *Pattern) AlternativesList() []*Alternative {
	return n.Alternatives
}

type Alternative struct {
	regexSpan
	Elements []Element
}

func (n *Alternative) regexNode() {}

func (n *Alternative) regexElement() {}

type Group struct {
	regexSpan
	Alternatives []*Alternative
	Capturing    bool
}

func (n *Group) regexNode() {}

func (n *Group) regexElement() {}

func (n *Group) AlternativesList() []*Alternative {
	return n.Alternatives
}

type AssertionKind string

const (
	AssertionStart              AssertionKind = "start"
	AssertionEnd                AssertionKind = "end"
	AssertionWordBoundary       AssertionKind = "wordBoundary"
	AssertionNotWordBoundary    AssertionKind = "notWordBoundary"
	AssertionLookahead          AssertionKind = "lookahead"
	AssertionNegativeLookahead  AssertionKind = "negativeLookahead"
	AssertionLookbehind         AssertionKind = "lookbehind"
	AssertionNegativeLookbehind AssertionKind = "negativeLookbehind"
)

type Assertion struct {
	regexSpan
	Kind         AssertionKind
	Alternatives []*Alternative
}

func (n *Assertion) regexNode() {}

func (n *Assertion) regexElement() {}

func (n *Assertion) AlternativesList() []*Alternative {
	return n.Alternatives
}

type Quantifier struct {
	regexSpan
	Element Element
	Min     int
	Max     int
	Greedy  bool
}

func (n *Quantifier) regexNode() {}

func (n *Quantifier) regexElement() {}

type CharacterClass struct {
	regexSpan
	Elements []ClassElement
	Negate   bool
}

func (n *CharacterClass) regexNode() {}

func (n *CharacterClass) regexElement() {}

type Character struct {
	regexSpan
	Value int
}

func (n *Character) regexNode() {}

func (n *Character) regexElement() {}

func (n *Character) regexClassElement() {}

type CharacterClassRange struct {
	regexSpan
	Min *Character
	Max *Character
}

func (n *CharacterClassRange) regexNode() {}

func (n *CharacterClassRange) regexClassElement() {}

type CharacterSetKind string

const (
	CharacterSetDigit CharacterSetKind = "digit"
	CharacterSetSpace CharacterSetKind = "space"
	CharacterSetWord  CharacterSetKind = "word"
)

type CharacterSet struct {
	regexSpan
	Kind   CharacterSetKind
	Negate bool
}

func (n *CharacterSet) regexNode() {}

func (n *CharacterSet) regexElement() {}

func (n *CharacterSet) regexClassElement() {}

type Other struct {
	regexSpan
}

func (n *Other) regexNode() {}

func (n *Other) regexElement() {}

type UnsupportedClassElement struct {
	regexSpan
}

func (n *UnsupportedClassElement) regexNode() {}

func (n *UnsupportedClassElement) regexElement() {}

func (n *UnsupportedClassElement) regexClassElement() {}

func SplitRegexLiteral(text string) (string, string, bool) {
	if len(text) < 2 || text[0] != '/' {
		return "", "", false
	}

	escaped := false
	closingSlash := -1
	for index := 1; index < len(text); index++ {
		switch {
		case escaped:
			escaped = false
		case text[index] == '\\':
			escaped = true
		case text[index] == '/':
			closingSlash = index
		}
	}

	if closingSlash <= 0 {
		return "", "", false
	}

	return text[1:closingSlash], text[closingSlash+1:], true
}

func ParseRegexLiteral(text string) (*Pattern, Flags, bool) {
	pattern, flagsText, ok := SplitRegexLiteral(text)
	if !ok {
		return nil, Flags{}, false
	}
	parsed, ok := ParsePattern(pattern, flagsText)
	return parsed, parseFlags(flagsText), ok
}

func ParsePattern(pattern string, flagsText string) (*Pattern, bool) {
	p := parser{
		pattern: pattern,
		flags:   parseFlags(flagsText),
		length:  len(pattern),
	}
	result := p.parsePattern()
	return result, result != nil
}

func parseFlags(text string) Flags {
	return Flags{
		IgnoreCase: strings.ContainsRune(text, 'i'),
		Unicode:    strings.ContainsRune(text, 'u') || strings.ContainsRune(text, 'v'),
	}
}

func LiteralRange(sourceFile *ast.SourceFile, literal *ast.Node, node RegexNode) core.TextRange {
	start, end := node.Span()
	return LiteralRangeOffsets(sourceFile, literal, start, end)
}

func LiteralRangeOffsets(sourceFile *ast.SourceFile, literal *ast.Node, start int, end int) core.TextRange {
	literalRange := utils.TrimNodeTextRange(sourceFile, literal)
	return core.NewTextRange(literalRange.Pos()+1+start, literalRange.Pos()+1+end)
}

func Walk(node RegexNode, visit func(RegexNode)) {
	if node == nil {
		return
	}

	visit(node)

	switch current := node.(type) {
	case *Pattern:
		for _, alternative := range current.Alternatives {
			Walk(alternative, visit)
		}
	case *Alternative:
		for _, element := range current.Elements {
			Walk(element, visit)
		}
	case *Group:
		for _, alternative := range current.Alternatives {
			Walk(alternative, visit)
		}
	case *Assertion:
		for _, alternative := range current.Alternatives {
			Walk(alternative, visit)
		}
	case *Quantifier:
		Walk(current.Element, visit)
	case *CharacterClass:
		for _, element := range current.Elements {
			Walk(element, visit)
		}
	case *CharacterClassRange:
		Walk(current.Min, visit)
		Walk(current.Max, visit)
	}
}

type parser struct {
	pattern string
	flags   Flags
	pos     int
	length  int
}

func (p *parser) parsePattern() *Pattern {
	start := p.pos
	alternatives := p.parseDisjunction(0)
	return &Pattern{
		regexSpan:    regexSpan{start: start, end: p.pos},
		Alternatives: alternatives,
	}
}

func (p *parser) parseDisjunction(until byte) []*Alternative {
	alternatives := []*Alternative{}
	alternativeStart := p.pos
	elements := []Element{}

	for {
		if p.pos >= p.length || (until != 0 && p.currentByte() == until) || p.currentByte() == '|' {
			alternatives = append(alternatives, &Alternative{
				regexSpan: regexSpan{start: alternativeStart, end: p.pos},
				Elements:  elements,
			})
			if p.pos < p.length && p.currentByte() == '|' {
				p.pos++
				alternativeStart = p.pos
				elements = nil
				continue
			}
			break
		}

		element := p.parseElement()
		if element != nil {
			elements = append(elements, element)
		} else {
			p.consumeRune()
		}
	}

	return alternatives
}

func (p *parser) parseElement() Element {
	if p.pos >= p.length {
		return nil
	}

	start := p.pos
	var element Element

	switch p.currentByte() {
	case '^':
		p.pos++
		element = &Assertion{
			regexSpan: regexSpan{start: start, end: p.pos},
			Kind:      AssertionStart,
		}
	case '$':
		p.pos++
		element = &Assertion{
			regexSpan: regexSpan{start: start, end: p.pos},
			Kind:      AssertionEnd,
		}
	case '(':
		element = p.parseGroupOrAssertion()
	case '[':
		element = p.parseCharacterClass()
	case '.':
		p.pos++
		element = &Other{regexSpan: regexSpan{start: start, end: p.pos}}
	case '\\':
		element = p.parseEscape(false)
	default:
		value, _, end := p.consumeRune()
		element = &Character{
			regexSpan: regexSpan{start: start, end: end},
			Value:     int(value),
		}
	}

	return p.parseQuantifier(element)
}

func (p *parser) parseGroupOrAssertion() Element {
	start := p.pos
	p.pos++

	if p.matchString("?=") {
		alternatives := p.parseDisjunction(')')
		p.consumeIf(')')
		return &Assertion{
			regexSpan:    regexSpan{start: start, end: p.pos},
			Kind:         AssertionLookahead,
			Alternatives: alternatives,
		}
	}
	if p.matchString("?!") {
		alternatives := p.parseDisjunction(')')
		p.consumeIf(')')
		return &Assertion{
			regexSpan:    regexSpan{start: start, end: p.pos},
			Kind:         AssertionNegativeLookahead,
			Alternatives: alternatives,
		}
	}
	if p.matchString("?<=") {
		alternatives := p.parseDisjunction(')')
		p.consumeIf(')')
		return &Assertion{
			regexSpan:    regexSpan{start: start, end: p.pos},
			Kind:         AssertionLookbehind,
			Alternatives: alternatives,
		}
	}
	if p.matchString("?<!") {
		alternatives := p.parseDisjunction(')')
		p.consumeIf(')')
		return &Assertion{
			regexSpan:    regexSpan{start: start, end: p.pos},
			Kind:         AssertionNegativeLookbehind,
			Alternatives: alternatives,
		}
	}

	capturing := true
	if p.matchString("?:") {
		capturing = false
	} else if p.matchString("?<") {
		for p.pos < p.length && p.currentByte() != '>' {
			p.consumeRune()
		}
		p.consumeIf('>')
	}

	alternatives := p.parseDisjunction(')')
	p.consumeIf(')')

	return &Group{
		regexSpan:    regexSpan{start: start, end: p.pos},
		Alternatives: alternatives,
		Capturing:    capturing,
	}
}

func (p *parser) parseCharacterClass() Element {
	start := p.pos
	p.pos++

	negate := p.consumeIf('^')
	elements := []ClassElement{}

	for p.pos < p.length {
		if p.currentByte() == ']' && len(elements) == 0 {
			elements = append(elements, p.parseClassCharacter())
			continue
		}
		if p.currentByte() == ']' {
			break
		}

		first := p.parseClassElement()
		if first == nil {
			break
		}

		if character, ok := first.(*Character); ok && p.currentByte() == '-' && p.pos+1 < p.length && p.pattern[p.pos+1] != ']' {
			hyphenPos := p.pos
			p.pos++
			second := p.parseClassElement()
			if secondCharacter, ok := second.(*Character); ok {
				elements = append(elements, &CharacterClassRange{
					regexSpan: regexSpan{start: character.start, end: secondCharacter.end},
					Min:       character,
					Max:       secondCharacter,
				})
				continue
			}
			elements = append(elements, first)
			elements = append(elements, &Character{
				regexSpan: regexSpan{start: hyphenPos, end: hyphenPos + 1},
				Value:     int('-'),
			})
			if second != nil {
				elements = append(elements, second)
			}
			continue
		}

		elements = append(elements, first)
	}

	p.consumeIf(']')

	return &CharacterClass{
		regexSpan: regexSpan{start: start, end: p.pos},
		Elements:  elements,
		Negate:    negate,
	}
}

func (p *parser) parseClassElement() ClassElement {
	if p.pos >= p.length {
		return nil
	}
	if p.currentByte() == '\\' {
		return p.parseClassEscape()
	}
	return p.parseClassCharacter()
}

func (p *parser) parseClassCharacter() *Character {
	start := p.pos
	value, _, end := p.consumeRune()
	return &Character{
		regexSpan: regexSpan{start: start, end: end},
		Value:     int(value),
	}
}

func (p *parser) parseEscape(inCharacterClass bool) Element {
	start := p.pos
	p.pos++

	if p.pos >= p.length {
		return &Character{
			regexSpan: regexSpan{start: start, end: p.pos},
			Value:     int('\\'),
		}
	}

	switch p.currentByte() {
	case 'b':
		p.pos++
		if inCharacterClass {
			return &Character{
				regexSpan: regexSpan{start: start, end: p.pos},
				Value:     int('\b'),
			}
		}
		return &Assertion{
			regexSpan: regexSpan{start: start, end: p.pos},
			Kind:      AssertionWordBoundary,
		}
	case 'B':
		p.pos++
		if inCharacterClass {
			return &Character{
				regexSpan: regexSpan{start: start, end: p.pos},
				Value:     int('B'),
			}
		}
		return &Assertion{
			regexSpan: regexSpan{start: start, end: p.pos},
			Kind:      AssertionNotWordBoundary,
		}
	case 'd', 'D':
		negate := p.currentByte() == 'D'
		p.pos++
		return &CharacterSet{
			regexSpan: regexSpan{start: start, end: p.pos},
			Kind:      CharacterSetDigit,
			Negate:    negate,
		}
	case 's', 'S':
		negate := p.currentByte() == 'S'
		p.pos++
		return &CharacterSet{
			regexSpan: regexSpan{start: start, end: p.pos},
			Kind:      CharacterSetSpace,
			Negate:    negate,
		}
	case 'w', 'W':
		negate := p.currentByte() == 'W'
		p.pos++
		return &CharacterSet{
			regexSpan: regexSpan{start: start, end: p.pos},
			Kind:      CharacterSetWord,
			Negate:    negate,
		}
	case 'n', 'r', 't', 'v', 'f', '0':
		mapped := map[byte]rune{
			'n': '\n',
			'r': '\r',
			't': '\t',
			'v': '\v',
			'f': '\f',
			'0': 0,
		}[p.currentByte()]
		p.pos++
		return &Character{
			regexSpan: regexSpan{start: start, end: p.pos},
			Value:     int(mapped),
		}
	case 'x':
		if value, ok := p.consumeHexEscape(2); ok {
			return &Character{
				regexSpan: regexSpan{start: start, end: p.pos},
				Value:     value,
			}
		}
	case 'u':
		if value, ok := p.consumeUnicodeEscape(); ok {
			return &Character{
				regexSpan: regexSpan{start: start, end: p.pos},
				Value:     value,
			}
		}
	case 'p', 'P':
		if inCharacterClass {
			p.consumePropertyEscape()
			return &UnsupportedClassElement{regexSpan: regexSpan{start: start, end: p.pos}}
		}
	case '1', '2', '3', '4', '5', '6', '7', '8', '9':
		for p.pos < p.length && isASCIIDigit(p.currentByte()) {
			p.pos++
		}
		return &Other{regexSpan: regexSpan{start: start, end: p.pos}}
	}

	value, _, end := p.consumeRune()
	return &Character{
		regexSpan: regexSpan{start: start, end: end},
		Value:     int(value),
	}
}

func (p *parser) parseClassEscape() ClassElement {
	element := p.parseEscape(true)
	switch current := element.(type) {
	case *Character:
		return current
	case *CharacterSet:
		return current
	case *UnsupportedClassElement:
		return current
	default:
		start, end := current.Span()
		return &UnsupportedClassElement{regexSpan: regexSpan{start: start, end: end}}
	}
}

func (p *parser) parseQuantifier(element Element) Element {
	if element == nil || p.pos >= p.length {
		return element
	}

	quantifierStart, _ := element.Span()
	save := p.pos
	min, max, ok := p.consumeQuantifierPrefix()
	if !ok {
		p.pos = save
		return element
	}

	greedy := true
	if p.consumeIf('?') {
		greedy = false
	}

	return &Quantifier{
		regexSpan: regexSpan{start: quantifierStart, end: p.pos},
		Element:   element,
		Min:       min,
		Max:       max,
		Greedy:    greedy,
	}
}

func (p *parser) consumeQuantifierPrefix() (int, int, bool) {
	if p.pos >= p.length {
		return 0, 0, false
	}

	switch p.currentByte() {
	case '*':
		p.pos++
		return 0, -1, true
	case '+':
		p.pos++
		return 1, -1, true
	case '?':
		p.pos++
		return 0, 1, true
	case '{':
		save := p.pos
		p.pos++
		minStart := p.pos
		for p.pos < p.length && isASCIIDigit(p.currentByte()) {
			p.pos++
		}
		if p.pos == minStart {
			p.pos = save
			return 0, 0, false
		}
		min, _ := strconv.Atoi(p.pattern[minStart:p.pos])
		max := min
		if p.consumeIf(',') {
			maxStart := p.pos
			for p.pos < p.length && isASCIIDigit(p.currentByte()) {
				p.pos++
			}
			if p.pos == maxStart {
				max = -1
			} else {
				max, _ = strconv.Atoi(p.pattern[maxStart:p.pos])
			}
		}
		if !p.consumeIf('}') {
			p.pos = save
			return 0, 0, false
		}
		return min, max, true
	default:
		return 0, 0, false
	}
}

func (p *parser) consumeUnicodeEscape() (int, bool) {
	save := p.pos
	p.pos++
	if p.consumeIf('{') {
		start := p.pos
		for p.pos < p.length && isASCIIHexDigit(p.currentByte()) {
			p.pos++
		}
		if p.pos == start || !p.consumeIf('}') {
			p.pos = save
			return 0, false
		}
		value, err := strconv.ParseInt(p.pattern[start:p.pos-1], 16, 32)
		if err != nil {
			p.pos = save
			return 0, false
		}
		return int(value), true
	}

	if p.pos+4 > p.length {
		p.pos = save
		return 0, false
	}
	for _, ch := range []byte(p.pattern[p.pos : p.pos+4]) {
		if !isASCIIHexDigit(ch) {
			p.pos = save
			return 0, false
		}
	}
	value, err := strconv.ParseInt(p.pattern[p.pos:p.pos+4], 16, 32)
	if err != nil {
		p.pos = save
		return 0, false
	}
	p.pos += 4
	return int(value), true
}

func (p *parser) consumeHexEscape(length int) (int, bool) {
	save := p.pos
	p.pos++
	if p.pos+length > p.length {
		p.pos = save
		return 0, false
	}
	for _, ch := range []byte(p.pattern[p.pos : p.pos+length]) {
		if !isASCIIHexDigit(ch) {
			p.pos = save
			return 0, false
		}
	}
	value, err := strconv.ParseInt(p.pattern[p.pos:p.pos+length], 16, 32)
	if err != nil {
		p.pos = save
		return 0, false
	}
	p.pos += length
	return int(value), true
}

func (p *parser) consumePropertyEscape() {
	p.pos++
	if p.pos < p.length && p.currentByte() == '{' {
		p.pos++
		for p.pos < p.length && p.currentByte() != '}' {
			p.consumeRune()
		}
		p.consumeIf('}')
	}
}

func (p *parser) currentByte() byte {
	if p.pos >= p.length {
		return 0
	}
	return p.pattern[p.pos]
}

func (p *parser) consumeIf(ch byte) bool {
	if p.pos < p.length && p.pattern[p.pos] == ch {
		p.pos++
		return true
	}
	return false
}

func (p *parser) matchString(text string) bool {
	if strings.HasPrefix(p.pattern[p.pos:], text) {
		p.pos += len(text)
		return true
	}
	return false
}

func (p *parser) consumeRune() (rune, int, int) {
	if p.pos >= p.length {
		return 0, 0, p.pos
	}
	start := p.pos
	value, size := utf8.DecodeRuneInString(p.pattern[p.pos:])
	if size == 0 {
		return 0, 0, start
	}
	p.pos += size
	return value, size, p.pos
}

func isASCIIDigit(ch byte) bool {
	return ch >= '0' && ch <= '9'
}

func isASCIIHexDigit(ch byte) bool {
	return isASCIIDigit(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')
}

type interval struct {
	from  int
	to    int
	owner ClassElement
}

func DuplicateCharacterClassElements(class *CharacterClass, flags Flags) []RegexNode {
	intervals := []interval{}
	duplicates := []RegexNode{}
	seen := map[RegexNode]struct{}{}

	for _, element := range class.Elements {
		elementIntervals := classElementIntervals(element, flags)
		if len(elementIntervals) == 0 {
			intervals = append(intervals, elementIntervals...)
			continue
		}

		intersections := []RegexNode{}
		for _, current := range elementIntervals {
			for _, existing := range intervals {
				if current.from <= existing.to && existing.from <= current.to {
					if _, ok := seen[existing.owner]; !ok {
						intersections = append(intersections, existing.owner)
					}
					seen[existing.owner] = struct{}{}
				}
			}
		}

		if len(intersections) > 0 {
			for _, intersection := range intersections {
				if _, ok := seen[intersection]; !ok {
					continue
				}
				if !containsRegexNode(duplicates, intersection) {
					duplicates = append(duplicates, intersection)
				}
			}
			if !containsRegexNode(duplicates, element) {
				duplicates = append(duplicates, element)
			}
		}

		intervals = append(intervals, elementIntervals...)
	}

	return duplicates
}

func containsRegexNode(nodes []RegexNode, target RegexNode) bool {
	for _, node := range nodes {
		if node == target {
			return true
		}
	}
	return false
}

func classElementIntervals(element ClassElement, flags Flags) []interval {
	switch current := element.(type) {
	case *Character:
		return expandIntervals(interval{from: current.Value, to: current.Value, owner: current}, flags)
	case *CharacterClassRange:
		return expandIntervals(interval{from: current.Min.Value, to: current.Max.Value, owner: current}, flags)
	case *CharacterSet:
		return characterSetIntervals(current, flags)
	default:
		return nil
	}
}

func expandIntervals(base interval, flags Flags) []interval {
	if !flags.IgnoreCase {
		return []interval{base}
	}

	upperFrom := firstCodePoint(strings.ToUpper(string(rune(base.from))))
	upperTo := firstCodePoint(strings.ToUpper(string(rune(base.to))))
	lowerFrom := firstCodePoint(strings.ToLower(string(rune(upperFrom))))
	lowerTo := firstCodePoint(strings.ToLower(string(rune(upperTo))))

	if lowerFrom == upperFrom || lowerTo == upperTo {
		return []interval{base}
	}
	if (!isASCII(base.from) || !isASCII(base.to)) && !flags.Unicode {
		return []interval{base}
	}

	return []interval{
		{from: upperFrom, to: upperTo, owner: base.owner},
		{from: lowerFrom, to: lowerTo, owner: base.owner},
	}
}

func characterSetIntervals(set *CharacterSet, flags Flags) []interval {
	add := func(from int, to int, out *[]interval) {
		*out = append(*out, interval{from: from, to: to, owner: set})
	}

	intervals := []interval{}
	switch set.Kind {
	case CharacterSetDigit:
		if set.Negate {
			add(0x00, int('0')-1, &intervals)
			if flags.Unicode {
				add(int('9')+1, 0xff, &intervals)
			} else {
				add(int('9')+1, 0x10ffff, &intervals)
			}
		} else {
			add(int('0'), int('9'), &intervals)
		}
	case CharacterSetSpace:
		if set.Negate {
			add(0x00, int('\t')-1, &intervals)
			add(int('\r')+1, int(' ')-1, &intervals)
			if flags.Unicode {
				add(int(' ')+1, 0x84, &intervals)
				add(0x86, 0x9f, &intervals)
				add(0xa1, 0x167f, &intervals)
				add(0x1681, 0x1fff, &intervals)
				add(0x200b, 0x2027, &intervals)
				add(0x202a, 0x202e, &intervals)
				add(0x2030, 0x205e, &intervals)
				add(0x2060, 0x2fff, &intervals)
				add(0x3001, 0x10ffff, &intervals)
			} else {
				add(int(' ')+1, 0x10ffff, &intervals)
			}
		} else {
			add(int('\t'), int('\r'), &intervals)
			add(int(' '), int(' '), &intervals)
			if flags.Unicode {
				add(0x85, 0x85, &intervals)
				add(0xa0, 0xa0, &intervals)
				add(0x1680, 0x1680, &intervals)
				add(0x2000, 0x200a, &intervals)
				add(0x2028, 0x2029, &intervals)
				add(0x202f, 0x202f, &intervals)
				add(0x205f, 0x205f, &intervals)
				add(0x3000, 0x3000, &intervals)
			}
		}
	case CharacterSetWord:
		if set.Negate {
			add(0x00, int('0')-1, &intervals)
			add(int('9')+1, int('A')-1, &intervals)
			add(int('Z')+1, int('_')-1, &intervals)
			add(int('`'), int('`'), &intervals)
			if flags.Unicode {
				add(int('z')+1, 0x00b4, &intervals)
			} else {
				add(int('z')+1, 0x10ffff, &intervals)
			}
		} else {
			add(int('0'), int('9'), &intervals)
			add(int('A'), int('Z'), &intervals)
			add(int('_'), int('_'), &intervals)
			add(int('a'), int('z'), &intervals)
		}
	}

	return intervals
}

func firstCodePoint(value string) int {
	r, _ := utf8.DecodeRuneInString(value)
	return int(r)
}

func isASCII(value int) bool {
	return value < 128
}

func IsAnchored(alternative *Alternative, kind AssertionKind) bool {
	if len(alternative.Elements) == 0 {
		return false
	}

	index := 0
	if kind == AssertionEnd {
		index = len(alternative.Elements) - 1
	}

	assertion, ok := alternative.Elements[index].(*Assertion)
	return ok && assertion.Kind == kind
}

func AlternationContainsOnlySingleCharacters(node Alternation) bool {
	alternatives := node.AlternativesList()
	if len(alternatives) <= 1 {
		return false
	}

	for _, alternative := range alternatives {
		if len(alternative.Elements) != 1 {
			return false
		}
		if _, ok := alternative.Elements[0].(*Character); !ok {
			return false
		}
	}

	return true
}

func MatchesEmptyString(node RegexNode) bool {
	switch current := node.(type) {
	case *Alternative:
		for _, element := range current.Elements {
			if !MatchesEmptyString(element) {
				return false
			}
		}
		return true
	case *Assertion:
		return true
	case *Group:
		for _, alternative := range current.Alternatives {
			if MatchesEmptyString(alternative) {
				return true
			}
		}
		return false
	case *Pattern:
		for _, alternative := range current.Alternatives {
			if MatchesEmptyString(alternative) {
				return true
			}
		}
		return false
	case *Quantifier:
		return current.Min == 0
	default:
		return false
	}
}

func IsOptionalQuantifier(node RegexNode) bool {
	quantifier, ok := node.(*Quantifier)
	return ok && quantifier.Min == 0
}

func IsEndAssertion(node RegexNode) bool {
	assertion, ok := node.(*Assertion)
	return ok && assertion.Kind == AssertionEnd
}

func ToUpperLowerCaseInterval(from int, to int, flags Flags) []interval {
	return expandIntervals(interval{from: from, to: to, owner: &Character{Value: from}}, flags)
}

func IsLetter(value int) bool {
	return unicode.IsLetter(rune(value))
}
