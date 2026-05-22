package no_duplicate_enum_values

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

type enumValueKind uint8

const (
	enumValueString enumValueKind = iota
	enumValueNumber
)

type enumValue struct {
	kind        enumValueKind
	stringValue string
	numberValue float64
}

func buildDuplicateValueMessage(value string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "duplicateValue",
		Description: fmt.Sprintf("Duplicate enum member value %s.", value),
	}
}

func parseNumericLiteral(text string) (float64, bool) {
	normalized := strings.ReplaceAll(text, "_", "")
	if normalized == "" {
		return 0, false
	}

	if strings.ContainsAny(normalized, ".eE") {
		value, err := strconv.ParseFloat(normalized, 64)
		return value, err == nil
	}

	if integer, err := strconv.ParseInt(normalized, 0, 64); err == nil {
		return float64(integer), true
	}

	value, err := strconv.ParseFloat(normalized, 64)
	return value, err == nil
}

func parseUnaryStringValue(text string) (float64, bool) {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return 0, true
	}

	if integer, err := strconv.ParseInt(trimmed, 0, 64); err == nil {
		return float64(integer), true
	}

	value, err := strconv.ParseFloat(trimmed, 64)
	return value, err == nil
}

func getEnumMemberValue(initializer *ast.Node) (enumValue, bool) {
	switch initializer.Kind {
	case ast.KindStringLiteral:
		return enumValue{kind: enumValueString, stringValue: initializer.AsStringLiteral().Text}, true
	case ast.KindNoSubstitutionTemplateLiteral:
		return enumValue{kind: enumValueString, stringValue: initializer.AsNoSubstitutionTemplateLiteral().Text}, true
	case ast.KindNumericLiteral:
		value, ok := parseNumericLiteral(initializer.AsNumericLiteral().Text)
		return enumValue{kind: enumValueNumber, numberValue: value}, ok
	case ast.KindPrefixUnaryExpression:
		prefix := initializer.AsPrefixUnaryExpression()
		if prefix.Operator != ast.KindMinusToken && prefix.Operator != ast.KindPlusToken {
			return enumValue{}, false
		}

		innerValue, ok := getEnumMemberValue(prefix.Operand)
		if !ok {
			return enumValue{}, false
		}

		numberValue := innerValue.numberValue
		if innerValue.kind == enumValueString {
			numberValue, ok = parseUnaryStringValue(innerValue.stringValue)
			if !ok {
				return enumValue{}, false
			}
		}

		if prefix.Operator == ast.KindMinusToken {
			numberValue = -numberValue
		}

		return enumValue{kind: enumValueNumber, numberValue: numberValue}, true
	default:
		return enumValue{}, false
	}
}

func enumValuesEqual(left, right enumValue) bool {
	if left.kind != right.kind {
		return false
	}

	switch left.kind {
	case enumValueString:
		return left.stringValue == right.stringValue
	case enumValueNumber:
		if math.IsNaN(left.numberValue) && math.IsNaN(right.numberValue) {
			return true
		}
		if left.numberValue == 0 && right.numberValue == 0 {
			return math.Signbit(left.numberValue) == math.Signbit(right.numberValue)
		}
		return left.numberValue == right.numberValue
	default:
		return false
	}
}

func formatEnumValue(value enumValue) string {
	switch value.kind {
	case enumValueString:
		return value.stringValue
	case enumValueNumber:
		if value.numberValue == 0 {
			return "0"
		}
		return strconv.FormatFloat(value.numberValue, 'g', -1, 64)
	default:
		return ""
	}
}

var NoDuplicateEnumValuesRule = rule.Rule{
	Name: "no-duplicate-enum-values",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindEnumDeclaration: func(node *ast.Node) {
				seenValues := []enumValue{}
				for _, member := range node.AsEnumDeclaration().Members.Nodes {
					initializer := member.AsEnumMember().Initializer
					if initializer == nil {
						continue
					}

					value, ok := getEnumMemberValue(initializer)
					if !ok {
						continue
					}

					isDuplicate := false
					for _, seen := range seenValues {
						if enumValuesEqual(seen, value) {
							isDuplicate = true
							break
						}
					}

					if isDuplicate {
						ctx.ReportNode(member, buildDuplicateValueMessage(formatEnumValue(value)))
						continue
					}

					seenValues = append(seenValues, value)
				}
			},
		}
	},
}
