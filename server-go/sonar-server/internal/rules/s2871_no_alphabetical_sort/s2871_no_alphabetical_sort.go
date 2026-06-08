package s2871_no_alphabetical_sort

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const (
	provideCompareFunctionMessageID            = "provideCompareFunction"
	provideCompareFunctionForStringsMessageID  = "provideCompareFunctionForArrayOfStrings"
	suggestNumericOrderMessageID               = "suggestNumericOrder"
	suggestLanguageSensitiveOrderMessageID     = "suggestLanguageSensitiveOrder"
	compareNumberFunctionPlaceholder           = "(a, b) => (a - b)"
	languageSensitiveOrderFunctionPlaceholder  = "(a, b) => a.localeCompare(b)"
	compareBigIntFunctionPlaceholderSingleLine = "(a, b) => {\n  if (a < b) {\n    return -1;\n  } else if (a > b) {\n    return 1;\n  } else {\n    return 0;\n  }\n}"
)

var (
	sortLikeMethods = map[string]struct{}{
		"sort":     {},
		"toSorted": {},
	}
	equalityOperators = map[ast.Kind]struct{}{
		ast.KindEqualsEqualsToken:            {},
		ast.KindExclamationEqualsToken:       {},
		ast.KindEqualsEqualsEqualsToken:      {},
		ast.KindExclamationEqualsEqualsToken: {},
	}
)

type primitiveArrayKind uint8

const (
	primitiveArrayKindUnknown primitiveArrayKind = iota
	primitiveArrayKindNumber
	primitiveArrayKindBigInt
	primitiveArrayKindString
	primitiveArrayKindBoolean
)

type bareSortInfo struct {
	methodName string
	receiver   *ast.Node
}

func buildProvideCompareFunctionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          provideCompareFunctionMessageID,
		Description: "Provide a compare function to avoid sorting elements alphabetically.",
	}
}

func buildProvideCompareFunctionForStringsMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          provideCompareFunctionForStringsMessageID,
		Description: "Provide a compare function that depends on \"String.localeCompare\", to reliably sort elements alphabetically.",
	}
}

func buildSuggestNumericOrderMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          suggestNumericOrderMessageID,
		Description: "Add a comparator function to sort in ascending order",
	}
}

func buildSuggestLanguageSensitiveOrderMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          suggestLanguageSensitiveOrderMessageID,
		Description: "Add a comparator function to sort in ascending language-sensitive order",
	}
}

func sameNode(left *ast.Node, right *ast.Node) bool {
	return left == right
}

func staticPropertyName(node *ast.Node) (string, *ast.Node, bool) {
	node = ast.SkipParentheses(node)
	if node == nil {
		return "", nil, false
	}

	switch {
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		if name == nil {
			return "", nil, false
		}
		return name.Text(), name.AsNode(), true
	case ast.IsElementAccessExpression(node):
		argument := ast.SkipParentheses(node.AsElementAccessExpression().ArgumentExpression)
		if argument == nil {
			return "", nil, false
		}
		if ast.IsStringLiteral(argument) || argument.Kind == ast.KindNoSubstitutionTemplateLiteral {
			return argument.Text(), argument, true
		}
	}

	return "", nil, false
}

func sourceTextOfNode(sourceFile *ast.SourceFile, node *ast.Node) string {
	return scanner.GetSourceTextOfNodeFromSourceFile(sourceFile, node, false)
}

func sortReceiver(callExpr *ast.CallExpression) *ast.Node {
	switch {
	case ast.IsPropertyAccessExpression(callExpr.Expression):
		return callExpr.Expression.AsPropertyAccessExpression().Expression
	case ast.IsElementAccessExpression(callExpr.Expression):
		return callExpr.Expression.AsElementAccessExpression().Expression
	default:
		return nil
	}
}

func constrainedArrayLikeType(typeChecker *checker.Checker, t *checker.Type) bool {
	if t == nil {
		return false
	}

	constraint, isTypeParameter := utils.GetConstraintInfo(typeChecker, t)
	if isTypeParameter && constraint == nil {
		return false
	}
	if constraint != nil {
		t = constraint
	}

	for _, part := range utils.UnionTypeParts(t) {
		if !checker.Checker_isArrayOrTupleType(typeChecker, part) {
			return false
		}
	}

	return true
}

func primitiveArrayKindForType(typeChecker *checker.Checker, t *checker.Type) primitiveArrayKind {
	if t == nil || utils.IsUnionType(t) || utils.IsIntersectionType(t) || utils.IsTypeParameter(t) || !checker.Checker_isArrayType(typeChecker, t) {
		return primitiveArrayKindUnknown
	}

	typeArguments := checker.Checker_getTypeArguments(typeChecker, t)
	if len(typeArguments) == 0 {
		return primitiveArrayKindUnknown
	}

	elementType := typeArguments[0]
	switch {
	case utils.IsTypeFlagSet(elementType, checker.TypeFlagsNumberLike):
		return primitiveArrayKindNumber
	case utils.IsTypeFlagSet(elementType, checker.TypeFlagsBigIntLike):
		return primitiveArrayKindBigInt
	case utils.IsTypeFlagSet(elementType, checker.TypeFlagsStringLike):
		return primitiveArrayKindString
	case utils.IsTypeFlagSet(elementType, checker.TypeFlagsBooleanLike):
		return primitiveArrayKindBoolean
	default:
		return primitiveArrayKindUnknown
	}
}

func isJsonStringifyCall(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsCallExpression(node) {
		return false
	}

	callExpr := node.AsCallExpression()
	if len(callExpr.Arguments.Nodes) != 1 || !ast.IsPropertyAccessExpression(callExpr.Expression) {
		return false
	}

	propertyAccess := callExpr.Expression.AsPropertyAccessExpression()
	object := ast.SkipParentheses(propertyAccess.Expression)
	name := propertyAccess.Name()
	return object != nil && ast.IsIdentifier(object) && object.AsIdentifier().Text == "JSON" && name != nil && name.Text() == "stringify"
}

func getBareSortInfo(ctx rule.RuleContext, node *ast.Node) *bareSortInfo {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsCallExpression(node) {
		return nil
	}

	callExpr := node.AsCallExpression()
	if len(callExpr.Arguments.Nodes) != 0 {
		return nil
	}

	methodName, _, ok := staticPropertyName(callExpr.Expression)
	if !ok {
		return nil
	}
	if _, ok := sortLikeMethods[methodName]; !ok {
		return nil
	}

	receiver := sortReceiver(callExpr)
	if receiver == nil || !constrainedArrayLikeType(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(receiver))) {
		return nil
	}

	return &bareSortInfo{
		methodName: methodName,
		receiver:   receiver,
	}
}

func isJsonStringifySortComparison(ctx rule.RuleContext, callExpr *ast.CallExpression) bool {
	parent := callExpr.Node.Parent
	if !isJsonStringifyCall(parent) {
		return false
	}

	parentCall := parent.AsCallExpression()
	if len(parentCall.Arguments.Nodes) != 1 || !sameNode(parentCall.Arguments.Nodes[0], &callExpr.Node) {
		return false
	}

	grandparent := parent.Parent
	if grandparent == nil || !ast.IsBinaryExpression(grandparent) {
		return false
	}
	if _, ok := equalityOperators[grandparent.AsBinaryExpression().OperatorToken.Kind]; !ok {
		return false
	}

	sibling := grandparent.AsBinaryExpression().Right
	if sameNode(sibling, parent) {
		sibling = grandparent.AsBinaryExpression().Left
	}
	if !isJsonStringifyCall(sibling) {
		return false
	}

	siblingCall := sibling.AsCallExpression()
	if len(siblingCall.Arguments.Nodes) != 1 {
		return false
	}

	callInfo := getBareSortInfo(ctx, &callExpr.Node)
	siblingInfo := getBareSortInfo(ctx, siblingCall.Arguments.Nodes[0])
	if callInfo == nil || siblingInfo == nil || callInfo.methodName != siblingInfo.methodName {
		return false
	}

	return primitiveArrayKindForType(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(callInfo.receiver))) != primitiveArrayKindUnknown &&
		primitiveArrayKindForType(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(siblingInfo.receiver))) != primitiveArrayKindUnknown
}

func replacementTextForCall(sourceFile *ast.SourceFile, callExpr *ast.CallExpression, placeholder string) string {
	text := sourceTextOfNode(sourceFile, &callExpr.Node)
	if strings.HasSuffix(text, ")") {
		return strings.TrimSuffix(text, ")") + placeholder + ")"
	}

	return text
}

func reportSuggestionsForSort(ctx rule.RuleContext, callExpr *ast.CallExpression, originalType *checker.Type) []rule.RuleSuggestion {
	switch primitiveArrayKindForType(ctx.TypeChecker, originalType) {
	case primitiveArrayKindNumber:
		return []rule.RuleSuggestion{{
			Message: buildSuggestNumericOrderMessage(),
			FixesArr: []rule.RuleFix{
				rule.RuleFixReplace(ctx.SourceFile, &callExpr.Node, replacementTextForCall(ctx.SourceFile, callExpr, compareNumberFunctionPlaceholder)),
			},
		}}
	case primitiveArrayKindBigInt:
		return []rule.RuleSuggestion{{
			Message: buildSuggestNumericOrderMessage(),
			FixesArr: []rule.RuleFix{
				rule.RuleFixReplace(ctx.SourceFile, &callExpr.Node, replacementTextForCall(ctx.SourceFile, callExpr, compareBigIntFunctionPlaceholderSingleLine)),
			},
		}}
	case primitiveArrayKindString:
		return []rule.RuleSuggestion{{
			Message: buildSuggestLanguageSensitiveOrderMessage(),
			FixesArr: []rule.RuleFix{
				rule.RuleFixReplace(ctx.SourceFile, &callExpr.Node, replacementTextForCall(ctx.SourceFile, callExpr, languageSensitiveOrderFunctionPlaceholder)),
			},
		}}
	default:
		return nil
	}
}

var NoAlphabeticalSortRule = rule.Rule{
	Name: "no-alphabetical-sort",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				if len(callExpr.Arguments.Nodes) != 0 {
					return
				}

				methodName, property, ok := staticPropertyName(callExpr.Expression)
				if !ok {
					return
				}
				if _, ok := sortLikeMethods[methodName]; !ok {
					return
				}

				receiver := sortReceiver(callExpr)
				if receiver == nil {
					return
				}

				originalType := ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(receiver))
				if !constrainedArrayLikeType(ctx.TypeChecker, originalType) || isJsonStringifySortComparison(ctx, callExpr) {
					return
				}

				message := buildProvideCompareFunctionMessage()
				if primitiveArrayKindForType(ctx.TypeChecker, originalType) == primitiveArrayKindString {
					message = buildProvideCompareFunctionForStringsMessage()
				}

				ctx.ReportNodeWithSuggestions(property, message, func() []rule.RuleSuggestion {
					return reportSuggestionsForSort(ctx, callExpr, originalType)
				})
			},
		}
	},
}
