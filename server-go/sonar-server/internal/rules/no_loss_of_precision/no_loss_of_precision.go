package no_loss_of_precision

import (
	"math/big"
	"regexp"
	"strconv"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/jsnum"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var legacyOctalPattern = regexp.MustCompile(`^0[0-7]+$`)

type scientificNotation struct {
	coefficient string
	magnitude   int
}

func buildNoLossOfPrecisionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "noLossOfPrecision",
		Description: "This number literal will lose precision at runtime.",
	}
}

func sourceTextWithoutSeparators(sourceFile *ast.SourceFile, node *ast.Node) string {
	return strings.ReplaceAll(scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, node, false), "_", "")
}

func numericValue(node *ast.Node) jsnum.Number {
	return jsnum.FromString(node.Text())
}

func isBaseTen(raw string) bool {
	prefixes := []string{"0x", "0X", "0b", "0B", "0o", "0O"}
	for _, prefix := range prefixes {
		if strings.HasPrefix(raw, prefix) {
			return false
		}
	}
	return !legacyOctalPattern.MatchString(raw)
}

func removeLeadingZeros(numberAsString string) string {
	for index, char := range numberAsString {
		if char != '0' {
			return numberAsString[index:]
		}
	}
	return numberAsString
}

func removeTrailingZeros(numberAsString string) string {
	for index := len(numberAsString) - 1; index >= 0; index-- {
		if numberAsString[index] != '0' {
			return numberAsString[:index+1]
		}
	}
	return numberAsString
}

func normalizeInteger(stringInteger string) scientificNotation {
	trimmedInteger := removeLeadingZeros(stringInteger)
	significantDigits := removeTrailingZeros(trimmedInteger)
	return scientificNotation{
		coefficient: significantDigits,
		magnitude:   len(trimmedInteger) - 1,
	}
}

func normalizeFloat(stringFloat string) scientificNotation {
	trimmedFloat := removeLeadingZeros(stringFloat)
	indexOfDecimalPoint := strings.Index(trimmedFloat, ".")

	switch indexOfDecimalPoint {
	case 0:
		significantDigits := removeLeadingZeros(trimmedFloat[1:])
		return scientificNotation{
			coefficient: significantDigits,
			magnitude:   len(significantDigits) - len(trimmedFloat),
		}
	case -1:
		return scientificNotation{
			coefficient: trimmedFloat,
			magnitude:   len(trimmedFloat) - 1,
		}
	default:
		return scientificNotation{
			coefficient: strings.ReplaceAll(trimmedFloat, ".", ""),
			magnitude:   indexOfDecimalPoint - 1,
		}
	}
}

func convertNumberToScientificNotation(stringNumber string, parseAsFloat bool) scientificNotation {
	splitNumber := strings.SplitN(strings.ToLower(stringNumber), "e", 2)
	originalCoefficient := splitNumber[0]

	var normalized scientificNotation
	if parseAsFloat || strings.Contains(originalCoefficient, ".") {
		normalized = normalizeFloat(originalCoefficient)
	} else {
		normalized = normalizeInteger(originalCoefficient)
	}

	if len(splitNumber) > 1 {
		exponent, _ := strconv.Atoi(splitNumber[1])
		normalized.magnitude += exponent
	}

	return normalized
}

func numberToRadixString(value jsnum.Number, base int) string {
	if value == 0 {
		return "0"
	}

	integer, _ := new(big.Float).SetFloat64(float64(value)).Int(nil)
	if integer == nil {
		return ""
	}
	return integer.Text(base)
}

func notBaseTenLosesPrecision(raw string, value jsnum.Number) bool {
	if value.IsInf() || value.IsNaN() {
		return true
	}

	rawString := strings.ToUpper(raw)
	base := 8
	switch {
	case strings.HasPrefix(rawString, "0B"):
		base = 2
	case strings.HasPrefix(rawString, "0X"):
		base = 16
	}

	return !strings.HasSuffix(rawString, strings.ToUpper(numberToRadixString(value, base)))
}

func toPrecisionString(value jsnum.Number, precision int) string {
	if value.IsInf() {
		if value < 0 {
			return "-Infinity"
		}
		return "Infinity"
	}
	if value.IsNaN() {
		return "NaN"
	}
	return strconv.FormatFloat(float64(value), 'e', precision-1, 64)
}

func baseTenLosesPrecision(raw string, value jsnum.Number) bool {
	if value.IsInf() || value.IsNaN() {
		return true
	}

	normalizedRawNumber := convertNumberToScientificNotation(strings.ToLower(raw), false)
	requestedPrecision := len(normalizedRawNumber.coefficient)
	if requestedPrecision > 100 {
		return true
	}

	storedNumber := toPrecisionString(value, requestedPrecision)
	normalizedStoredNumber := convertNumberToScientificNotation(storedNumber, true)

	return normalizedRawNumber.magnitude != normalizedStoredNumber.magnitude ||
		normalizedRawNumber.coefficient != normalizedStoredNumber.coefficient
}

func losesPrecision(raw string, value jsnum.Number) bool {
	if isBaseTen(raw) {
		return baseTenLosesPrecision(raw, value)
	}
	return notBaseTenLosesPrecision(raw, value)
}

var NoLossOfPrecisionRule = rule.Rule{
	Name: "no-loss-of-precision",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindNumericLiteral: func(node *ast.Node) {
				value := numericValue(node)
				if value == 0 || !losesPrecision(sourceTextWithoutSeparators(ctx.SourceFile, node), value) {
					return
				}
				ctx.ReportNode(node, buildNoLossOfPrecisionMessage())
			},
		}
	},
}
