package s2234_arguments_order

import (
	"regexp"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/core"
)

const argumentsOrderMessageID = "argumentsOrder"

var directionalKeywordPattern = regexp.MustCompile(`\b(rtl|ltr|reverse|flip|swap|forward|backward)\b`)
var cryptoFunctionPattern = regexp.MustCompile(`^(md[45]_?)?(ff|gg|hh|ii)$`)

func buildArgumentsOrderMessage(arg1 string, arg2 string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          argumentsOrderMessageID,
		Description: `Arguments '` + arg1 + `' and '` + arg2 + `' have the same names but not the same order as the function parameters.`,
	}
}

type functionSignature struct {
	params       []string
	declaration  *ast.Node
	parameterLoc *core.TextRange
}

func collectBindingNames(node *ast.Node, names *[]string) {
	if node == nil {
		return
	}

	switch {
	case ast.IsIdentifier(node):
		*names = append(*names, node.AsIdentifier().Text)
	case ast.IsBindingPattern(node):
		for _, element := range node.AsBindingPattern().Elements.Nodes {
			if element == nil || !ast.IsBindingElement(element) {
				continue
			}
			collectBindingNames(element.AsBindingElement().Name(), names)
		}
	}
}

func parameterClauseRange(sourceFile *ast.SourceFile, node *ast.Node) *core.TextRange {
	parameters := node.Parameters()
	if len(parameters) == 0 {
		return nil
	}

	firstParam := utils.TrimNodeTextRange(sourceFile, parameters[0])
	lastParam := utils.TrimNodeTextRange(sourceFile, parameters[len(parameters)-1])
	loc := core.NewTextRange(firstParam.Pos(), lastParam.End())
	return &loc
}

func functionLikeDeclaration(node *ast.Node) *ast.Node {
	if node == nil {
		return nil
	}

	switch {
	case ast.IsFunctionLike(node):
		return node
	case ast.IsVariableDeclaration(node):
		initializer := ast.SkipParentheses(node.AsVariableDeclaration().Initializer)
		if ast.IsFunctionLike(initializer) {
			return initializer
		}
	case ast.IsPropertyAssignment(node):
		initializer := ast.SkipParentheses(node.AsPropertyAssignment().Initializer)
		if ast.IsFunctionLike(initializer) {
			return initializer
		}
	}

	return nil
}

func resolveFunctionSignature(ctx rule.RuleContext, node *ast.Node) *functionSignature {
	signature := checker.Checker_getResolvedSignature(ctx.TypeChecker, node, nil, checker.CheckModeNormal)
	if signature != nil {
		declaration := functionLikeDeclaration(checker.Signature_declaration(signature))
		if declaration != nil {
			return &functionSignature{
				params:       extractParameterNamesFromFunction(declaration),
				declaration:  declaration,
				parameterLoc: parameterClauseRange(ctx.SourceFile, declaration),
			}
		}

		parameters := checker.Signature_parameters(signature)
		if len(parameters) == 0 {
			return nil
		}

		names := make([]string, len(parameters))
		for index, parameter := range parameters {
			names[index] = parameter.Name
		}
		return &functionSignature{params: names}
	}

	callee := callLikeCallee(node)
	if callee == nil {
		return nil
	}

	callee = ast.SkipParentheses(callee)
	if ast.IsFunctionLike(callee) {
		return &functionSignature{
			params:       extractParameterNamesFromFunction(callee),
			declaration:  callee,
			parameterLoc: parameterClauseRange(ctx.SourceFile, callee),
		}
	}

	if !ast.IsIdentifier(callee) {
		return nil
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(callee)
	if symbol == nil || symbol.ValueDeclaration == nil {
		return nil
	}

	declaration := functionLikeDeclaration(symbol.ValueDeclaration)
	if declaration == nil {
		return nil
	}

	return &functionSignature{
		params:       extractParameterNamesFromFunction(declaration),
		declaration:  declaration,
		parameterLoc: parameterClauseRange(ctx.SourceFile, declaration),
	}
}

func extractParameterNamesFromFunction(node *ast.Node) []string {
	parameters := node.Parameters()
	if len(parameters) == 0 {
		return nil
	}

	names := make([]string, len(parameters))
	for index, parameterNode := range parameters {
		identifiers := []string{}
		collectBindingNames(parameterNode.Name(), &identifiers)
		if len(identifiers) == 1 {
			names[index] = identifiers[0]
		}
	}
	return names
}

func callLikeCallee(node *ast.Node) *ast.Node {
	switch {
	case ast.IsCallExpression(node):
		return node.AsCallExpression().Expression
	case ast.IsNewExpression(node):
		return node.AsNewExpression().Expression
	default:
		return nil
	}
}

func callLikeArguments(node *ast.Node) []*ast.Node {
	switch {
	case ast.IsCallExpression(node):
		return node.AsCallExpression().Arguments.Nodes
	case ast.IsNewExpression(node):
		newExpr := node.AsNewExpression()
		if newExpr.Arguments == nil {
			return nil
		}
		return newExpr.Arguments.Nodes
	default:
		return nil
	}
}

func calleeName(node *ast.Node) string {
	node = ast.SkipParentheses(node)
	switch {
	case node == nil:
		return ""
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		if name != nil {
			return name.Text()
		}
	}
	return ""
}

func isComparisonOperator(kind ast.Kind) bool {
	switch kind {
	case ast.KindEqualsEqualsToken,
		ast.KindExclamationEqualsToken,
		ast.KindEqualsEqualsEqualsToken,
		ast.KindExclamationEqualsEqualsToken,
		ast.KindLessThanToken,
		ast.KindLessThanEqualsToken,
		ast.KindGreaterThanToken,
		ast.KindGreaterThanEqualsToken:
		return true
	default:
		return false
	}
}

func argumentClauseRange(ctx rule.RuleContext, args []*ast.Node) core.TextRange {
	firstArg := utils.TrimNodeTextRange(ctx.SourceFile, args[0])
	lastArg := utils.TrimNodeTextRange(ctx.SourceFile, args[len(args)-1])
	return core.NewTextRange(firstArg.Pos(), lastArg.End())
}

func reportArgumentsOrder(ctx rule.RuleContext, node *ast.Node, args []*ast.Node, arg1 string, arg2 string, signature *functionSignature) {
	diagnostic := rule.RuleDiagnostic{
		Range:   argumentClauseRange(ctx, args),
		Message: buildArgumentsOrderMessage(arg1, arg2),
	}

	if signature != nil && signature.parameterLoc != nil {
		diagnostic.LabeledRanges = []rule.RuleLabeledRange{{
			Label: "Formal parameters",
			Range: *signature.parameterLoc,
		}}
	}

	ctx.ReportDiagnostic(diagnostic)
}

func normalizedTypeName(ctx rule.RuleContext, node *ast.Node) string {
	t := ctx.TypeChecker.GetTypeAtLocation(ast.SkipParentheses(node))
	if t == nil {
		return ""
	}

	flags := checker.Type_flags(t)
	switch {
	case flags&checker.TypeFlagsStringLike != 0:
		return "string"
	case flags&checker.TypeFlagsBooleanLike != 0:
		return "boolean"
	case flags&checker.TypeFlagsNumberLike != 0:
		return "number"
	}

	switch text := ctx.TypeChecker.TypeToString(t); text {
	case "String":
		return "string"
	case "Boolean":
		return "boolean"
	case "Number":
		return "number"
	default:
		return text
	}
}

func haveCompatibleTypes(ctx rule.RuleContext, first *ast.Node, second *ast.Node) bool {
	return normalizedTypeName(ctx, first) == normalizedTypeName(ctx, second)
}

func getComparedName(node *ast.Node) string {
	node = ast.SkipParentheses(node)
	switch {
	case node == nil:
		return ""
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text
	case ast.IsCallExpression(node):
		return getComparedName(node.AsCallExpression().Expression)
	case ast.IsPropertyAccessExpression(node):
		return getComparedName(node.AsPropertyAccessExpression().Expression)
	}
	return ""
}

func checkComparedArguments(left *ast.Node, right *ast.Node, arg1 string, arg2 string) bool {
	leftName := getComparedName(left)
	rightName := getComparedName(right)
	return (leftName == arg1 && rightName == arg2) || (leftName == arg2 && rightName == arg1)
}

func areComparedArguments(node *ast.Node, arg1 string, arg2 string) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsIfStatement(current) {
			continue
		}

		test := current.AsIfStatement().Expression
		switch {
		case ast.IsBinaryExpression(test):
			binaryExpr := test.AsBinaryExpression()
			return isComparisonOperator(binaryExpr.OperatorToken.Kind) && checkComparedArguments(binaryExpr.Left, binaryExpr.Right, arg1, arg2)
		case ast.IsCallExpression(test):
			callExpr := test.AsCallExpression()
			if len(callExpr.Arguments.Nodes) != 1 || !ast.IsPropertyAccessExpression(callExpr.Expression) {
				return false
			}

			return checkComparedArguments(callExpr.Expression.AsPropertyAccessExpression().Expression, callExpr.Arguments.Nodes[0], arg1, arg2)
		default:
			return false
		}
	}

	return false
}

func isIntentionalComparatorReversal(node *ast.Node, arg1 string, arg2 string) bool {
	var enclosingFunction *ast.Node
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsArrowFunction(current) || ast.IsFunctionExpression(current) {
			enclosingFunction = current
			break
		}
	}

	if enclosingFunction == nil {
		return false
	}

	parameters := enclosingFunction.Parameters()
	if len(parameters) != 2 {
		return false
	}

	first := parameters[0].Name()
	second := parameters[1].Name()
	if !ast.IsIdentifier(first) || !ast.IsIdentifier(second) {
		return false
	}

	firstName := first.AsIdentifier().Text
	secondName := second.AsIdentifier().Text
	if len(firstName) != 1 || len(secondName) != 1 {
		return false
	}

	if !((firstName == arg1 || firstName == arg2) && (secondName == arg1 || secondName == arg2)) {
		return false
	}

	body := enclosingFunction.Body()
	if body == node {
		return true
	}

	if !ast.IsBlock(body) {
		return false
	}

	statements := body.Statements()
	return len(statements) == 1 && ast.IsReturnStatement(statements[0]) && statements[0].AsReturnStatement().Expression == node
}

func isDirectionalContext(node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		switch {
		case ast.IsPropertyAssignment(current):
			name, ok := propertyName(current.AsPropertyAssignment().Name())
			if ok && directionalKeywordPattern.MatchString(name) {
				return true
			}
		case ast.IsMethodDeclaration(current):
			name, ok := propertyName(current.Name())
			if ok && directionalKeywordPattern.MatchString(name) {
				return true
			}
		}
	}

	return false
}

func propertyName(node *ast.Node) (string, bool) {
	switch {
	case node == nil:
		return "", false
	case ast.IsIdentifier(node):
		return node.AsIdentifier().Text, true
	case ast.IsStringLiteral(node), ast.IsNoSubstitutionTemplateLiteral(node):
		return node.Text(), true
	default:
		return "", false
	}
}

func nodeText(ctx rule.RuleContext, node *ast.Node) string {
	if node == nil {
		return ""
	}
	textRange := utils.TrimNodeTextRange(ctx.SourceFile, node)
	return ctx.SourceFile.Text()[textRange.Pos():textRange.End()]
}

func isIntentionalTernarySwap(ctx rule.RuleContext, node *ast.Node, arg1 string, arg2 string) bool {
	parent := node.Parent
	if !ast.IsConditionalExpression(parent) {
		return false
	}

	conditionalExpr := parent.AsConditionalExpression()

	var otherBranch *ast.Node
	switch node {
	case conditionalExpr.WhenTrue:
		otherBranch = conditionalExpr.WhenFalse
	case conditionalExpr.WhenFalse:
		otherBranch = conditionalExpr.WhenTrue
	default:
		return false
	}

	otherBranch = ast.SkipParentheses(otherBranch)
	if !ast.IsCallExpression(otherBranch) {
		return false
	}

	callExpr := node.AsCallExpression()
	otherCall := otherBranch.AsCallExpression()

	if len(callExpr.Arguments.Nodes) != len(otherCall.Arguments.Nodes) {
		return false
	}
	if nodeText(ctx, callExpr.Expression) != nodeText(ctx, otherCall.Expression) {
		return false
	}

	index1 := -1
	index2 := -1
	for index, argument := range callExpr.Arguments.Nodes {
		if ast.IsIdentifier(argument) {
			switch argument.AsIdentifier().Text {
			case arg1:
				index1 = index
			case arg2:
				index2 = index
			}
		}
	}

	if index1 < 0 || index2 < 0 {
		return false
	}

	otherAtIndex1 := otherCall.Arguments.Nodes[index1]
	otherAtIndex2 := otherCall.Arguments.Nodes[index2]
	if !ast.IsIdentifier(otherAtIndex1) || otherAtIndex1.AsIdentifier().Text != arg2 {
		return false
	}
	if !ast.IsIdentifier(otherAtIndex2) || otherAtIndex2.AsIdentifier().Text != arg1 {
		return false
	}

	test := ast.SkipParentheses(conditionalExpr.Condition)
	if !ast.IsBinaryExpression(test) {
		return false
	}

	binaryExpr := test.AsBinaryExpression()
	if !isComparisonOperator(binaryExpr.OperatorToken.Kind) {
		return false
	}

	leftName := getComparedName(binaryExpr.Left)
	rightName := getComparedName(binaryExpr.Right)
	return (leftName == arg1 || leftName == arg2) && (rightName == arg1 || rightName == arg2)
}

func isCryptoCyclicRotation(node *ast.Node, params []string) bool {
	callee := callLikeCallee(node)
	name := calleeName(callee)
	if !cryptoFunctionPattern.MatchString(name) {
		return false
	}

	args := callLikeArguments(node)
	if len(params) < 4 || len(args) < 4 {
		return false
	}

	argNames := make([]string, 4)
	for index := 0; index < 4; index++ {
		if !ast.IsIdentifier(args[index]) {
			return false
		}
		argNames[index] = args[index].AsIdentifier().Text
	}

	for _, name := range params[:4] {
		if name == "" {
			return false
		}
	}

	for rotation := 1; rotation < 4; rotation++ {
		matches := true
		for index, argName := range argNames {
			if argName != params[(index+rotation)%4] {
				matches = false
				break
			}
		}
		if matches {
			return true
		}
	}

	return false
}

func swappedArgumentName(ctx rule.RuleContext, args []*ast.Node, argNames []string, params []string, argName string, argIndex int) string {
	indexInParams := -1
	for index, paramName := range params {
		if paramName == argName {
			indexInParams = index
			break
		}
	}

	if indexInParams < 0 || indexInParams == argIndex || indexInParams >= len(argNames) || argIndex >= len(params) {
		return ""
	}

	potentiallySwapped := argNames[indexInParams]
	if potentiallySwapped == "" || potentiallySwapped != params[argIndex] {
		return ""
	}

	if !haveCompatibleTypes(ctx, args[argIndex], args[indexInParams]) {
		return ""
	}

	return potentiallySwapped
}

func checkArguments(ctx rule.RuleContext, node *ast.Node) {
	args := callLikeArguments(node)
	if len(args) < 2 {
		return
	}

	argNames := make([]string, len(args))
	identifierCount := 0
	for index, argument := range args {
		if ast.IsIdentifier(argument) {
			argNames[index] = argument.AsIdentifier().Text
			identifierCount++
		}
	}

	if identifierCount < 2 {
		return
	}

	signature := resolveFunctionSignature(ctx, node)
	if signature == nil || len(signature.params) == 0 {
		return
	}
	if isCryptoCyclicRotation(node, signature.params) {
		return
	}

	for argIndex, argName := range argNames {
		if argName == "" {
			continue
		}

		swappedName := swappedArgumentName(ctx, args, argNames, signature.params, argName, argIndex)
		if swappedName == "" {
			continue
		}
		if areComparedArguments(node, argName, swappedName) || isIntentionalComparatorReversal(node, argName, swappedName) || isDirectionalContext(node) || isIntentionalTernarySwap(ctx, node, argName, swappedName) {
			continue
		}

		reportArgumentsOrder(ctx, node, args, argName, swappedName, signature)
		return
	}
}

var ArgumentsOrderRule = rule.Rule{
	Name: "arguments-order",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) { checkArguments(ctx, node) },
			ast.KindNewExpression:  func(node *ast.Node) { checkArguments(ctx, node) },
		}
	},
}
