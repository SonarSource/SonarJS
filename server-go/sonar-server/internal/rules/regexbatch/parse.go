package regexbatch

import (
	"strconv"
	"strings"
	"unicode/utf8"
)

type ContainerKind int

const (
	ContainerPattern ContainerKind = iota
	ContainerGroup
	ContainerCapturingGroup
	ContainerAssertion
)

type GroupKind int

const (
	GroupNonCapturing GroupKind = iota
	GroupCapturing
	GroupAssertion
)

type CharacterSetKind int

const (
	CharacterSetAny CharacterSetKind = iota
	CharacterSetDigit
	CharacterSetSpace
	CharacterSetWord
	CharacterSetProperty
)

type Element interface {
	elementRaw() string
}

type ClassElement interface {
	classElementRaw() string
}

type ParsedPattern struct {
	Pattern string
	Flags   string
	DotAll  bool

	Alternatives     []*Alternative
	Groups           []*Group
	Quantifiers      []*Quantifier
	CharacterClasses []*CharacterClass
	Characters       []*Character
}

type Alternative struct {
	Start      int
	End        int
	PipeBefore int
	PipeAfter  int

	ContainerKind  ContainerKind
	ContainerGroup *Group
	Elements       []Element
}

type Group struct {
	Kind         GroupKind
	Start        int
	End          int
	Raw          string
	Quantified   bool
	Alternatives []*Alternative
}

type Quantifier struct {
	Start       int
	End         int
	Raw         string
	Min         int
	Max         int
	Greedy      bool
	ElementRaw  string
	Alternative *Alternative
}

type CharacterClass struct {
	Start      int
	End        int
	Raw        string
	Negate     bool
	Quantified bool
	Elements   []ClassElement
}

type CharacterClassRange struct {
	Start int
	End   int
	Raw   string
	Min   *Character
	Max   *Character
	Class *CharacterClass
}

type CharacterSet struct {
	Start  int
	End    int
	Raw    string
	Kind   CharacterSetKind
	Negate bool
	Class  *CharacterClass
}

type Character struct {
	Start int
	End   int
	Raw   string
	Value int

	Class       *CharacterClass
	Range       *CharacterClassRange
	Alternative *Alternative
}

type SimpleElement struct {
	Raw string
}

func (g *Group) elementRaw() string                    { return g.Raw }
func (q *Quantifier) elementRaw() string               { return q.Raw }
func (c *CharacterClass) elementRaw() string           { return c.Raw }
func (c *Character) elementRaw() string                { return c.Raw }
func (c *CharacterSet) elementRaw() string             { return c.Raw }
func (s *SimpleElement) elementRaw() string            { return s.Raw }
func (c *Character) classElementRaw() string           { return c.Raw }
func (r *CharacterClassRange) classElementRaw() string { return r.Raw }
func (s *CharacterSet) classElementRaw() string        { return s.Raw }

func Parse(pattern string, flags string) *ParsedPattern {
	parser := &patternParser{
		pattern: pattern,
		unicode: strings.Contains(flags, "u") || strings.Contains(flags, "v"),
		parsed: &ParsedPattern{
			Pattern: pattern,
			Flags:   flags,
			DotAll:  strings.Contains(flags, "s"),
		},
	}
	parser.parsed.Alternatives = parser.parseDisjunction(ContainerPattern, nil)
	return parser.parsed
}

type patternParser struct {
	pattern string
	pos     int
	unicode bool
	parsed  *ParsedPattern
}

func (p *patternParser) parseDisjunction(kind ContainerKind, group *Group) []*Alternative {
	alternatives := make([]*Alternative, 0, 2)
	pipeBefore := -1

	for {
		alt := &Alternative{
			Start:          p.pos,
			PipeBefore:     pipeBefore,
			PipeAfter:      -1,
			ContainerKind:  kind,
			ContainerGroup: group,
			Elements:       make([]Element, 0, 4),
		}

		for p.pos < len(p.pattern) {
			switch p.pattern[p.pos] {
			case '|':
				alt.End = p.pos
				alt.PipeAfter = p.pos
				alternatives = append(alternatives, alt)
				p.pos++
				pipeBefore = alt.PipeAfter
				goto nextAlternative
			case ')':
				alt.End = p.pos
				alternatives = append(alternatives, alt)
				return alternatives
			}

			element := p.parseElement(alt)
			if element == nil {
				p.pos++
				continue
			}
			alt.Elements = append(alt.Elements, element)
		}

		alt.End = p.pos
		alternatives = append(alternatives, alt)
		return alternatives

	nextAlternative:
	}
}

func (p *patternParser) parseElement(alt *Alternative) Element {
	var (
		element      Element
		quantifiable bool
	)

	switch p.pattern[p.pos] {
	case '^', '$':
		element = &SimpleElement{Raw: p.pattern[p.pos : p.pos+1]}
		p.pos++
	case '.':
		start := p.pos
		p.pos++
		element = &CharacterSet{
			Start:  start,
			End:    p.pos,
			Raw:    p.pattern[start:p.pos],
			Kind:   CharacterSetAny,
			Negate: false,
		}
		quantifiable = true
	case '\\':
		element, quantifiable = p.parseEscapeOutsideClass()
	case '[':
		element = p.parseCharacterClass()
		quantifiable = true
	case '(':
		element = p.parseGroup()
		quantifiable = true
	default:
		element = p.parseLiteralCharacter()
		quantifiable = true
	}

	if element == nil {
		return nil
	}

	if quantifiable {
		if quantifier := p.parseQuantifier(element.elementRaw(), alt); quantifier != nil {
			switch atom := element.(type) {
			case *Group:
				atom.Quantified = true
			case *CharacterClass:
				atom.Quantified = true
			case *Character:
				atom.Alternative = nil
			}
			return quantifier
		}
	}

	if character, ok := element.(*Character); ok {
		character.Alternative = alt
	}

	return element
}

func (p *patternParser) parseGroup() *Group {
	start := p.pos
	p.pos++

	group := &Group{Kind: GroupCapturing, Start: start}
	containerKind := ContainerCapturingGroup

	if p.pos < len(p.pattern) && p.pattern[p.pos] == '?' {
		p.pos++
		switch {
		case p.consumePrefix(":"):
			group.Kind = GroupNonCapturing
			containerKind = ContainerGroup
		case p.consumePrefix("=") || p.consumePrefix("!"):
			group.Kind = GroupAssertion
			containerKind = ContainerAssertion
		case p.consumePrefix("<=") || p.consumePrefix("<!"):
			group.Kind = GroupAssertion
			containerKind = ContainerAssertion
		case p.pos < len(p.pattern) && p.pattern[p.pos] == '<':
			p.pos++
			for p.pos < len(p.pattern) && p.pattern[p.pos] != '>' {
				p.pos++
			}
			if p.pos < len(p.pattern) && p.pattern[p.pos] == '>' {
				p.pos++
			}
			group.Kind = GroupCapturing
			containerKind = ContainerCapturingGroup
		default:
			for p.pos < len(p.pattern) && p.pattern[p.pos] != ':' && p.pattern[p.pos] != ')' {
				p.pos++
			}
			if p.pos < len(p.pattern) && p.pattern[p.pos] == ':' {
				p.pos++
				group.Kind = GroupNonCapturing
				containerKind = ContainerGroup
			} else {
				group.Kind = GroupAssertion
				containerKind = ContainerAssertion
			}
		}
	}

	group.Alternatives = p.parseDisjunction(containerKind, group)
	if p.pos < len(p.pattern) && p.pattern[p.pos] == ')' {
		p.pos++
	}
	group.End = p.pos
	group.Raw = p.pattern[start:p.pos]
	p.parsed.Groups = append(p.parsed.Groups, group)
	return group
}

func (p *patternParser) parseCharacterClass() *CharacterClass {
	start := p.pos
	p.pos++

	class := &CharacterClass{
		Start:    start,
		Elements: make([]ClassElement, 0, 4),
	}
	if p.pos < len(p.pattern) && p.pattern[p.pos] == '^' {
		class.Negate = true
		p.pos++
	}

	for p.pos < len(p.pattern) {
		if p.pattern[p.pos] == ']' {
			p.pos++
			class.End = p.pos
			class.Raw = p.pattern[start:p.pos]
			p.parsed.CharacterClasses = append(p.parsed.CharacterClasses, class)
			return class
		}

		element, ok := p.parseClassElement(class)
		if !ok || element == nil {
			p.pos++
			continue
		}

		if character, ok := element.(*Character); ok &&
			p.pos < len(p.pattern) &&
			p.pattern[p.pos] == '-' &&
			p.pos+1 < len(p.pattern) &&
			p.pattern[p.pos+1] != ']' {
			hyphenPos := p.pos
			p.pos++
			nextElement, ok := p.parseClassElement(class)
			if ok {
				if maxCharacter, ok := nextElement.(*Character); ok {
					rangeNode := &CharacterClassRange{
						Start: startOf(character),
						End:   endOf(maxCharacter),
						Raw:   p.pattern[startOf(character):endOf(maxCharacter)],
						Min:   character,
						Max:   maxCharacter,
						Class: class,
					}
					character.Range = rangeNode
					maxCharacter.Range = rangeNode
					class.Elements = append(class.Elements, rangeNode)
					continue
				}
			}

			class.Elements = append(class.Elements, character)
			class.Elements = append(class.Elements, &Character{
				Start: hyphenPos,
				End:   hyphenPos + 1,
				Raw:   "-",
				Value: int('-'),
				Class: class,
			})
			if nextElement != nil {
				class.Elements = append(class.Elements, nextElement)
			}
			continue
		}

		class.Elements = append(class.Elements, element)
	}

	class.End = p.pos
	class.Raw = p.pattern[start:p.pos]
	p.parsed.CharacterClasses = append(p.parsed.CharacterClasses, class)
	return class
}

func (p *patternParser) parseClassElement(class *CharacterClass) (ClassElement, bool) {
	if p.pos >= len(p.pattern) {
		return nil, false
	}

	if p.pattern[p.pos] == '\\' {
		return p.parseEscapeInClass(class), true
	}

	start := p.pos
	r, size := utf8.DecodeRuneInString(p.pattern[p.pos:])
	if size == 0 {
		return nil, false
	}
	p.pos += size

	character := &Character{
		Start: start,
		End:   p.pos,
		Raw:   p.pattern[start:p.pos],
		Value: int(r),
		Class: class,
	}
	p.parsed.Characters = append(p.parsed.Characters, character)
	return character, true
}

func (p *patternParser) parseEscapeOutsideClass() (Element, bool) {
	start := p.pos
	p.pos++
	if p.pos >= len(p.pattern) {
		return &SimpleElement{Raw: p.pattern[start:p.pos]}, false
	}

	switch p.pattern[p.pos] {
	case 'b', 'B':
		p.pos++
		return &SimpleElement{Raw: p.pattern[start:p.pos]}, false
	case 'd', 'D':
		return p.finishCharacterSet(start, CharacterSetDigit), true
	case 's', 'S':
		return p.finishCharacterSet(start, CharacterSetSpace), true
	case 'w', 'W':
		return p.finishCharacterSet(start, CharacterSetWord), true
	case 'p', 'P':
		return p.finishPropertySet(start), true
	default:
		return p.finishEscapedCharacter(start, nil), true
	}
}

func (p *patternParser) parseEscapeInClass(class *CharacterClass) ClassElement {
	start := p.pos
	p.pos++
	if p.pos >= len(p.pattern) {
		character := &Character{
			Start: start,
			End:   p.pos,
			Raw:   p.pattern[start:p.pos],
			Value: int('\\'),
			Class: class,
		}
		p.parsed.Characters = append(p.parsed.Characters, character)
		return character
	}

	switch p.pattern[p.pos] {
	case 'd', 'D':
		return p.finishCharacterSetWithClass(start, CharacterSetDigit, class)
	case 's', 'S':
		return p.finishCharacterSetWithClass(start, CharacterSetSpace, class)
	case 'w', 'W':
		return p.finishCharacterSetWithClass(start, CharacterSetWord, class)
	case 'p', 'P':
		return p.finishPropertySetWithClass(start, class)
	default:
		return p.finishEscapedCharacter(start, class)
	}
}

func (p *patternParser) finishCharacterSet(start int, kind CharacterSetKind) *CharacterSet {
	return p.finishCharacterSetWithClass(start, kind, nil)
}

func (p *patternParser) finishCharacterSetWithClass(start int, kind CharacterSetKind, class *CharacterClass) *CharacterSet {
	p.pos++
	return &CharacterSet{
		Start:  start,
		End:    p.pos,
		Raw:    p.pattern[start:p.pos],
		Kind:   kind,
		Negate: isNegatedCharacterSet(p.pattern[start+1]),
		Class:  class,
	}
}

func (p *patternParser) finishPropertySet(start int) *CharacterSet {
	return p.finishPropertySetWithClass(start, nil)
}

func (p *patternParser) finishPropertySetWithClass(start int, class *CharacterClass) *CharacterSet {
	p.pos++
	if p.pos < len(p.pattern) && p.pattern[p.pos] == '{' {
		p.pos++
		for p.pos < len(p.pattern) && p.pattern[p.pos] != '}' {
			p.pos++
		}
		if p.pos < len(p.pattern) {
			p.pos++
		}
	}
	return &CharacterSet{
		Start:  start,
		End:    p.pos,
		Raw:    p.pattern[start:p.pos],
		Kind:   CharacterSetProperty,
		Negate: p.pattern[start+1] == 'P',
		Class:  class,
	}
}

func (p *patternParser) finishEscapedCharacter(start int, class *CharacterClass) *Character {
	value, end := parseEscapedCharacterValue(p.pattern, start)
	p.pos = end
	character := &Character{
		Start: start,
		End:   p.pos,
		Raw:   p.pattern[start:p.pos],
		Value: value,
		Class: class,
	}
	p.parsed.Characters = append(p.parsed.Characters, character)
	return character
}

func (p *patternParser) parseLiteralCharacter() *Character {
	start := p.pos
	r, size := utf8.DecodeRuneInString(p.pattern[p.pos:])
	if size == 0 {
		return nil
	}
	p.pos += size
	character := &Character{
		Start: start,
		End:   p.pos,
		Raw:   p.pattern[start:p.pos],
		Value: int(r),
	}
	p.parsed.Characters = append(p.parsed.Characters, character)
	return character
}

func (p *patternParser) parseQuantifier(elementRaw string, alt *Alternative) *Quantifier {
	if p.pos >= len(p.pattern) {
		return nil
	}

	start := p.pos
	min := 0
	max := 0

	switch p.pattern[p.pos] {
	case '*':
		min = 0
		max = -1
		p.pos++
	case '+':
		min = 1
		max = -1
		p.pos++
	case '?':
		min = 0
		max = 1
		p.pos++
	case '{':
		save := p.pos
		p.pos++

		valueStart := p.pos
		for p.pos < len(p.pattern) && p.pattern[p.pos] >= '0' && p.pattern[p.pos] <= '9' {
			p.pos++
		}
		if valueStart == p.pos {
			p.pos = save
			return nil
		}

		parsedMin, err := strconv.Atoi(p.pattern[valueStart:p.pos])
		if err != nil {
			p.pos = save
			return nil
		}
		min = parsedMin
		max = min

		if p.pos < len(p.pattern) && p.pattern[p.pos] == ',' {
			p.pos++
			if p.pos < len(p.pattern) && p.pattern[p.pos] == '}' {
				max = -1
			} else {
				maxStart := p.pos
				for p.pos < len(p.pattern) && p.pattern[p.pos] >= '0' && p.pattern[p.pos] <= '9' {
					p.pos++
				}
				if maxStart == p.pos {
					p.pos = save
					return nil
				}
				parsedMax, err := strconv.Atoi(p.pattern[maxStart:p.pos])
				if err != nil {
					p.pos = save
					return nil
				}
				max = parsedMax
			}
		}

		if p.pos >= len(p.pattern) || p.pattern[p.pos] != '}' {
			p.pos = save
			return nil
		}
		p.pos++
	default:
		return nil
	}

	greedy := true
	if p.pos < len(p.pattern) && p.pattern[p.pos] == '?' {
		greedy = false
		p.pos++
	}

	quantifier := &Quantifier{
		Start:       start,
		End:         p.pos,
		Raw:         p.pattern[start:p.pos],
		Min:         min,
		Max:         max,
		Greedy:      greedy,
		ElementRaw:  elementRaw,
		Alternative: alt,
	}
	p.parsed.Quantifiers = append(p.parsed.Quantifiers, quantifier)
	return quantifier
}

func parseEscapedCharacterValue(pattern string, start int) (int, int) {
	if start+1 >= len(pattern) {
		return int('\\'), len(pattern)
	}

	pos := start + 1
	switch pattern[pos] {
	case 'n':
		return int('\n'), pos + 1
	case 'r':
		return int('\r'), pos + 1
	case 't':
		return int('\t'), pos + 1
	case 'v':
		return int('\v'), pos + 1
	case 'f':
		return int('\f'), pos + 1
	case 'b':
		return int('\b'), pos + 1
	case '0':
		return 0, pos + 1
	case 'c':
		if pos+1 < len(pattern) {
			return int(pattern[pos+1] & 0x1f), pos + 2
		}
		return int('c'), pos + 1
	case 'x':
		if pos+2 < len(pattern) {
			if value, err := strconv.ParseUint(pattern[pos+1:pos+3], 16, 8); err == nil {
				return int(value), pos + 3
			}
		}
		return int('x'), pos + 1
	case 'u':
		if pos+1 < len(pattern) && pattern[pos+1] == '{' {
			end := pos + 2
			for end < len(pattern) && pattern[end] != '}' {
				end++
			}
			if end < len(pattern) {
				if value, err := strconv.ParseUint(pattern[pos+2:end], 16, 32); err == nil {
					return int(value), end + 1
				}
				return int('u'), end + 1
			}
			return int('u'), len(pattern)
		}
		if pos+4 < len(pattern) {
			if value, err := strconv.ParseUint(pattern[pos+1:pos+5], 16, 16); err == nil {
				return int(value), pos + 5
			}
		}
		return int('u'), pos + 1
	default:
		r, size := utf8.DecodeRuneInString(pattern[pos:])
		if size == 0 {
			return int('\\'), len(pattern)
		}
		return int(r), pos + size
	}
}

func startOf(character *Character) int {
	if character == nil {
		return 0
	}
	return character.Start
}

func endOf(character *Character) int {
	if character == nil {
		return 0
	}
	return character.End
}

func (p *patternParser) consumePrefix(prefix string) bool {
	if strings.HasPrefix(p.pattern[p.pos:], prefix) {
		p.pos += len(prefix)
		return true
	}
	return false
}

func isNegatedCharacterSet(ch byte) bool {
	switch ch {
	case 'D', 'S', 'W':
		return true
	default:
		return false
	}
}
