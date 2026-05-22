package s2301_no_selector_parameter

import (
	"regexp"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const selectorParameterMessageID = "selectorParameter"

var eventHandlerNamePattern = regexp.MustCompile(`^on[A-Z]`)

func buildSelectorParameterMessage(parameterName string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          selectorParameterMessageID,
		Description: `Provide multiple methods instead of using "` + parameterName + `" to determine which action to take.`,
	}
}

type booleanParameter struct {
	name        string
	declaration *ast.Node
}

func isBooleanLikeType(t *checker.Type) bool {
	return t != nil && checker.Type_flags(t)&checker.TypeFlagsBooleanLike != 0
}

func collectBooleanParameters(ctx rule.RuleContext, node *ast.Node) map[string]booleanParameter {
	parameters := map[string]booleanParameter{}

	for _, parameterNode := range node.Parameters() {
		if parameterNode == nil || !ast.IsParameterDeclaration(parameterNode) {
			continue
		}

		name := parameterNode.Name()
		if !ast.IsIdentifier(name) {
			continue
		}

		if !isBooleanLikeType(ctx.TypeChecker.GetTypeAtLocation(name)) {
			continue
		}

		parameters[name.AsIdentifier().Text] = booleanParameter{
			name:        name.AsIdentifier().Text,
			declaration: parameterNode,
		}
	}

	return parameters
}

func hasSideEffects(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	switch {
	case ast.IsCallExpression(node), ast.IsNewExpression(node), ast.IsAwaitExpression(node), ast.IsYieldExpression(node):
		return true
	case ast.IsBinaryExpression(node):
		if ast.IsAssignmentExpression(node, true) {
			return true
		}

		binaryExpr := node.AsBinaryExpression()
		if binaryExpr.OperatorToken.Kind == ast.KindCommaToken {
			return hasSideEffects(binaryExpr.Left) || hasSideEffects(binaryExpr.Right)
		}

		return hasSideEffects(binaryExpr.Left) || hasSideEffects(binaryExpr.Right)
	case ast.IsConditionalExpression(node):
		conditionalExpr := node.AsConditionalExpression()
		return hasSideEffects(conditionalExpr.WhenTrue) || hasSideEffects(conditionalExpr.WhenFalse)
	case ast.IsPrefixUnaryExpression(node):
		prefixExpr := node.AsPrefixUnaryExpression()
		return prefixExpr.Operator == ast.KindDeleteKeyword || hasSideEffects(prefixExpr.Operand)
	case ast.IsPostfixUnaryExpression(node):
		return true
	case ast.IsPropertyAccessExpression(node):
		return hasSideEffects(node.Expression())
	case ast.IsElementAccessExpression(node):
		elementAccess := node.AsElementAccessExpression()
		return hasSideEffects(elementAccess.Expression) || hasSideEffects(elementAccess.ArgumentExpression)
	case ast.IsArrayLiteralExpression(node):
		for _, element := range node.AsArrayLiteralExpression().Elements.Nodes {
			if element != nil && hasSideEffects(element) {
				return true
			}
		}
	case ast.IsObjectLiteralExpression(node):
		for _, property := range node.AsObjectLiteralExpression().Properties.Nodes {
			switch {
			case ast.IsPropertyAssignment(property):
				if hasSideEffects(property.AsPropertyAssignment().Initializer) {
					return true
				}
			case ast.IsSpreadAssignment(property):
				if hasSideEffects(property.AsSpreadAssignment().Expression) {
					return true
				}
			}
		}
	case ast.IsParenthesizedExpression(node):
		return hasSideEffects(node.Expression())
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

func isCallbackArgument(node *ast.Node) bool {
	parent := node.Parent
	if parent == nil {
		return false
	}

	switch {
	case ast.IsCallExpression(parent):
		for _, argument := range parent.AsCallExpression().Arguments.Nodes {
			if argument == node {
				return true
			}
		}
	case ast.IsJsxExpression(parent):
		return true
	case ast.IsPropertyAssignment(parent) && parent.AsPropertyAssignment().Initializer == node:
		name, ok := propertyName(parent.AsPropertyAssignment().Name())
		return ok && eventHandlerNamePattern.MatchString(name)
	case ast.IsMethodDeclaration(node):
		if objectLiteral := node.Parent; ast.IsObjectLiteralExpression(objectLiteral) {
			name, ok := propertyName(node.Name())
			return ok && eventHandlerNamePattern.MatchString(name)
		}
	}

	return false
}

func selectorTestNode(statement *ast.Node) *ast.Node {
	switch {
	case ast.IsIfStatement(statement):
		ifStmt := statement.AsIfStatement()
		if ifStmt.ThenStatement == nil || ifStmt.ElseStatement == nil {
			return nil
		}
		return ifStmt.Expression
	case ast.IsReturnStatement(statement):
		expr := ast.SkipParentheses(statement.AsReturnStatement().Expression)
		if !ast.IsConditionalExpression(expr) {
			return nil
		}

		conditionalExpr := expr.AsConditionalExpression()
		if !hasSideEffects(conditionalExpr.WhenTrue) && !hasSideEffects(conditionalExpr.WhenFalse) {
			return nil
		}
		return conditionalExpr.Condition
	case ast.IsExpressionStatement(statement):
		expr := ast.SkipParentheses(statement.Expression())
		if !ast.IsConditionalExpression(expr) {
			return nil
		}

		conditionalExpr := expr.AsConditionalExpression()
		if !hasSideEffects(conditionalExpr.WhenTrue) && !hasSideEffects(conditionalExpr.WhenFalse) {
			return nil
		}
		return conditionalExpr.Condition
	default:
		return nil
	}
}

func reportSelectorParameter(ctx rule.RuleContext, identifier *ast.Node, parameter booleanParameter) {
	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:   utils.TrimNodeTextRange(ctx.SourceFile, identifier),
		Message: buildSelectorParameterMessage(parameter.name),
		LabeledRanges: []rule.RuleLabeledRange{{
			Label: `Parameter "` + parameter.name + `" was declared here`,
			Range: utils.TrimNodeTextRange(ctx.SourceFile, parameter.declaration),
		}},
	})
}

func checkFunction(ctx rule.RuleContext, node *ast.Node) {
	if ctx.TypeChecker == nil || node == nil || isCallbackArgument(node) {
		return
	}

	body := node.Body()
	if body == nil || !ast.IsBlock(body) {
		return
	}

	statements := body.Statements()
	if len(statements) != 1 {
		return
	}

	testNode := selectorTestNode(statements[0])
	if testNode == nil {
		return
	}

	parameters := collectBooleanParameters(ctx, node)
	if len(parameters) == 0 {
		return
	}

	var visit ast.Visitor
	visit = func(current *ast.Node) bool {
		if current == nil {
			return false
		}

		if current != testNode && ast.IsFunctionLike(current) {
			return false
		}

		if ast.IsIdentifier(current) {
			if parameter, ok := parameters[current.AsIdentifier().Text]; ok {
				reportSelectorParameter(ctx, current, parameter)
			}
		}

		current.ForEachChild(visit)
		return false
	}

	visit(testNode)
}

var NoSelectorParameterRule = rule.Rule{
	Name: "no-selector-parameter",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindFunctionDeclaration: func(node *ast.Node) { checkFunction(ctx, node) },
			ast.KindFunctionExpression:  func(node *ast.Node) { checkFunction(ctx, node) },
			ast.KindArrowFunction:       func(node *ast.Node) { checkFunction(ctx, node) },
			ast.KindMethodDeclaration:   func(node *ast.Node) { checkFunction(ctx, node) },
			ast.KindConstructor:         func(node *ast.Node) { checkFunction(ctx, node) },
			ast.KindSetAccessor:         func(node *ast.Node) { checkFunction(ctx, node) },
		}
	},
}
