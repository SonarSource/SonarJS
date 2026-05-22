package s2259_null_dereference

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

type s2259NullState uint8

const (
	s2259NullStateUnknown s2259NullState = iota
	s2259NullStateConfirmed
	s2259NullStateDiscarded
)

func buildS2259NullDereferenceMessage(symbol string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "nullDereference",
		Description: fmt.Sprintf("TypeError can be thrown as %q might be null or undefined here.", symbol),
	}
}

func buildS2259ShortCircuitErrorMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "shortCircuitError",
		Description: "TypeError can be thrown as expression might be null or undefined here.",
	}
}

func s2259ComparableNode(node *ast.Node) *ast.Node {
	node = ast.SkipParentheses(node)
	for node != nil && ast.IsNonNullExpression(node) {
		node = ast.SkipParentheses(node.AsNonNullExpression().Expression)
	}
	return node
}

func s2259IsNullishLiteral(node *ast.Node) bool {
	node = s2259ComparableNode(node)
	return utils.IsNullLiteral(node) || utils.IsUndefinedIdentifier(node)
}

func s2259NodesEquivalent(left, right *ast.Node) bool {
	left = s2259ComparableNode(left)
	right = s2259ComparableNode(right)
	if left == nil || right == nil {
		return left == right
	}
	if left.Kind != right.Kind {
		return false
	}

	switch {
	case ast.IsIdentifier(left):
		return left.AsIdentifier().Text == right.AsIdentifier().Text
	case ast.IsPropertyAccessExpression(left):
		leftAccess := left.AsPropertyAccessExpression()
		rightAccess := right.AsPropertyAccessExpression()
		leftName := leftAccess.Name()
		rightName := rightAccess.Name()
		if leftName == nil || rightName == nil {
			return leftName == rightName
		}
		return s2259NodesEquivalent(leftAccess.Expression, rightAccess.Expression) &&
			s2259NodesEquivalent(leftName.AsNode(), rightName.AsNode())
	case ast.IsElementAccessExpression(left):
		leftAccess := left.AsElementAccessExpression()
		rightAccess := right.AsElementAccessExpression()
		return s2259NodesEquivalent(leftAccess.Expression, rightAccess.Expression) &&
			s2259NodesEquivalent(leftAccess.ArgumentExpression, rightAccess.ArgumentExpression)
	case ast.IsStringLiteral(left),
		ast.IsNumericLiteral(left),
		ast.IsBigIntLiteral(left),
		left.Kind == ast.KindNoSubstitutionTemplateLiteral:
		return left.Text() == right.Text()
	case left.Kind == ast.KindThisKeyword,
		left.Kind == ast.KindNullKeyword,
		left.Kind == ast.KindTrueKeyword,
		left.Kind == ast.KindFalseKeyword:
		return true
	default:
		return false
	}
}

func s2259NullStateFromBinary(expr *ast.BinaryExpression, node *ast.Node) s2259NullState {
	left := s2259ComparableNode(expr.Left)
	right := s2259ComparableNode(expr.Right)

	matchesNullishComparison := (s2259IsNullishLiteral(right) && s2259NodesEquivalent(left, node)) ||
		(s2259IsNullishLiteral(left) && s2259NodesEquivalent(right, node))
	if !matchesNullishComparison {
		return s2259NullStateUnknown
	}

	switch expr.OperatorToken.Kind {
	case ast.KindEqualsEqualsToken, ast.KindEqualsEqualsEqualsToken:
		return s2259NullStateConfirmed
	case ast.KindExclamationEqualsToken, ast.KindExclamationEqualsEqualsToken:
		return s2259NullStateDiscarded
	default:
		return s2259NullStateUnknown
	}
}

func s2259NearestLogicalExpression(node *ast.Node) *ast.BinaryExpression {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsBinaryExpression(current) && ast.IsLogicalExpression(current) {
			return current.AsBinaryExpression()
		}
	}
	return nil
}

func s2259TypeMayBeNullish(ctx rule.RuleContext, node *ast.Node) bool {
	if ctx.TypeChecker == nil || node == nil {
		return false
	}

	t := ctx.TypeChecker.GetTypeAtLocation(node)
	if utils.IsTypeFlagSet(t, checker.TypeFlagsNull|checker.TypeFlagsUndefined) {
		return true
	}

	for _, part := range utils.UnionTypeParts(checker.Checker_getApparentType(ctx.TypeChecker, t)) {
		if utils.IsTypeFlagSet(part, checker.TypeFlagsNull|checker.TypeFlagsUndefined) {
			return true
		}
	}

	return false
}

func s2259IsWriteReference(identifier *ast.Node) bool {
	parent := identifier.Parent
	if parent == nil {
		return false
	}

	switch {
	case ast.IsVariableDeclaration(parent) && parent.Name() == identifier:
		return parent.AsVariableDeclaration().Initializer != nil
	case ast.IsBinaryExpression(parent) && ast.IsAssignmentExpression(parent, true) && parent.AsBinaryExpression().Left == identifier:
		return true
	case ast.IsPrefixUnaryExpression(parent) && parent.AsPrefixUnaryExpression().Operand == identifier:
		operator := parent.AsPrefixUnaryExpression().Operator
		return operator == ast.KindPlusPlusToken || operator == ast.KindMinusMinusToken
	case ast.IsPostfixUnaryExpression(parent) && parent.AsPostfixUnaryExpression().Operand == identifier:
		operator := parent.AsPostfixUnaryExpression().Operator
		return operator == ast.KindPlusPlusToken || operator == ast.KindMinusMinusToken
	default:
		return false
	}
}

func s2259IsWrittenInDifferentFunction(ctx rule.RuleContext, symbol *ast.Symbol, currentFunction *ast.Node) bool {
	if ctx.SourceFile == nil || ctx.TypeChecker == nil || symbol == nil {
		return false
	}

	written := false
	var visit func(node *ast.Node)
	visit = func(node *ast.Node) {
		if node == nil || written {
			return
		}

		if ast.IsIdentifier(node) {
			currentSymbol := ctx.TypeChecker.GetSymbolAtLocation(node)
			if currentSymbol == symbol && s2259IsWriteReference(node) {
				if writeFunction := utils.GetParentFunctionNode(node); writeFunction != currentFunction {
					written = true
					return
				}
			}
		}

		node.ForEachChild(func(child *ast.Node) bool {
			visit(child)
			return written
		})
	}

	ctx.SourceFile.Node.ForEachChild(func(child *ast.Node) bool {
		visit(child)
		return written
	})

	return written
}

func s2259MaybeReportShortCircuit(ctx rule.RuleContext, accessNode *ast.Node, object *ast.Node) bool {
	logicalExpr := s2259NearestLogicalExpression(accessNode)
	if logicalExpr == nil {
		return false
	}

	left := s2259ComparableNode(logicalExpr.Left)
	if !ast.IsBinaryExpression(left) {
		return false
	}

	nullState := s2259NullStateFromBinary(left.AsBinaryExpression(), object)
	shouldReport :=
		(nullState == s2259NullStateConfirmed && logicalExpr.OperatorToken.Kind == ast.KindAmpersandAmpersandToken) ||
			(nullState == s2259NullStateDiscarded && logicalExpr.OperatorToken.Kind == ast.KindBarBarToken)
	if !shouldReport {
		return false
	}

	ctx.ReportNode(object, buildS2259ShortCircuitErrorMessage())
	return true
}

var NullDereferenceRule = rule.Rule{
	Name: "null-dereference",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		reportedSymbols := map[*ast.Symbol]struct{}{}

		checkNullDereference := func(node *ast.Node) {
			node = s2259ComparableNode(node)
			if !ast.IsIdentifier(node) {
				return
			}

			symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
			if symbol == nil {
				return
			}

			if _, ok := reportedSymbols[symbol]; ok {
				return
			}
			if s2259IsWrittenInDifferentFunction(ctx, symbol, utils.GetParentFunctionNode(node)) {
				return
			}
			if !s2259TypeMayBeNullish(ctx, node) {
				return
			}

			reportedSymbols[symbol] = struct{}{}
			ctx.ReportNode(node, buildS2259NullDereferenceMessage(node.AsIdentifier().Text))
		}

		return rule.RuleListeners{
			ast.KindPropertyAccessExpression: func(node *ast.Node) {
				access := node.AsPropertyAccessExpression()
				if access.QuestionDotToken != nil {
					return
				}
				s2259MaybeReportShortCircuit(ctx, node, access.Expression)
				checkNullDereference(access.Expression)
			},
			ast.KindElementAccessExpression: func(node *ast.Node) {
				access := node.AsElementAccessExpression()
				if access.QuestionDotToken != nil {
					return
				}
				s2259MaybeReportShortCircuit(ctx, node, access.Expression)
				checkNullDereference(access.Expression)
			},
			ast.KindForOfStatement: func(node *ast.Node) {
				checkNullDereference(node.AsForInOrOfStatement().Expression)
			},
		}
	},
}
