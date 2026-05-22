package s1529_bitwise_and_or_in_condition

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const bitwiseOperatorsMessageID = "bitwiseOperator"

var topLevelNodeKinds = []ast.Kind{
	ast.KindImportDeclaration,
	ast.KindImportEqualsDeclaration,
	ast.KindExportDeclaration,
	ast.KindExportAssignment,
	ast.KindVariableStatement,
	ast.KindExpressionStatement,
	ast.KindIfStatement,
	ast.KindDoStatement,
	ast.KindWhileStatement,
	ast.KindForStatement,
	ast.KindForInStatement,
	ast.KindForOfStatement,
	ast.KindContinueStatement,
	ast.KindBreakStatement,
	ast.KindReturnStatement,
	ast.KindWithStatement,
	ast.KindSwitchStatement,
	ast.KindLabeledStatement,
	ast.KindThrowStatement,
	ast.KindTryStatement,
	ast.KindDebuggerStatement,
	ast.KindFunctionDeclaration,
	ast.KindClassDeclaration,
	ast.KindInterfaceDeclaration,
	ast.KindTypeAliasDeclaration,
	ast.KindEnumDeclaration,
	ast.KindModuleDeclaration,
	ast.KindNamespaceExportDeclaration,
	ast.KindEmptyStatement,
}

func buildBitwiseOperatorsMessage(operator string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          bitwiseOperatorsMessageID,
		Description: `Review this use of bitwise "` + operator + `" operator; conditional "` + operator + operator + `" might have been intended.`,
	}
}

func isBitwiseAndOr(kind ast.Kind) bool {
	return kind == ast.KindAmpersandToken || kind == ast.KindBarToken
}

func isBitwiseOperator(kind ast.Kind) bool {
	switch kind {
	case ast.KindAmpersandToken,
		ast.KindBarToken,
		ast.KindCaretToken,
		ast.KindLessThanLessThanToken,
		ast.KindGreaterThanGreaterThanToken,
		ast.KindGreaterThanGreaterThanGreaterThanToken,
		ast.KindAmpersandEqualsToken,
		ast.KindBarEqualsToken,
		ast.KindCaretEqualsToken,
		ast.KindLessThanLessThanEqualsToken,
		ast.KindGreaterThanGreaterThanEqualsToken,
		ast.KindGreaterThanGreaterThanGreaterThanEqualsToken:
		return true
	default:
		return false
	}
}

func bitwiseOperatorText(kind ast.Kind) string {
	switch kind {
	case ast.KindAmpersandToken:
		return "&"
	case ast.KindBarToken:
		return "|"
	default:
		return ""
	}
}

func isNumericType(t *checker.Type) bool {
	if t == nil {
		return false
	}

	if checker.Type_flags(t)&(checker.TypeFlagsNumberLike|checker.TypeFlagsBigIntLike) != 0 {
		return true
	}

	if utils.IsUnionType(t) || utils.IsIntersectionType(t) {
		for _, part := range t.Types() {
			if isNumericType(part) {
				return true
			}
		}
	}

	return false
}

func isNumericOperand(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	if ctx.TypeChecker != nil {
		return isNumericType(ctx.TypeChecker.GetTypeAtLocation(node))
	}

	switch node.Kind {
	case ast.KindNumericLiteral, ast.KindBigIntLiteral:
		return true
	default:
		return false
	}
}

func isInsideCondition(node *ast.Node) bool {
	child := node

	for parent := node.Parent; parent != nil; parent = parent.Parent {
		switch parent.Kind {
		case ast.KindIfStatement:
			return parent.AsIfStatement().Expression == child
		case ast.KindForStatement:
			return parent.AsForStatement().Condition == child
		case ast.KindWhileStatement:
			return parent.AsWhileStatement().Expression == child
		case ast.KindDoStatement:
			return parent.AsDoStatement().Expression == child
		case ast.KindConditionalExpression:
			return parent.AsConditionalExpression().Condition == child
		}

		child = parent
	}

	return false
}

func isLastTopLevelNode(node *ast.Node) bool {
	if node == nil || node.Parent == nil || node.Parent.Kind != ast.KindSourceFile {
		return false
	}

	statements := node.Parent.Statements()
	return len(statements) > 0 && statements[len(statements)-1] == node
}

var BitwiseAndOrInConditionRule = rule.Rule{
	Name: "bitwise-operators",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		var lonelyBitwiseAndOr *ast.Node
		fileContainsSeveralBitwiseOperations := false
		flushed := false

		flush := func(node *ast.Node) {
			if flushed || !isLastTopLevelNode(node) {
				return
			}
			flushed = true

			if fileContainsSeveralBitwiseOperations || lonelyBitwiseAndOr == nil || !isInsideCondition(lonelyBitwiseAndOr) {
				return
			}

			binaryExpr := lonelyBitwiseAndOr.AsBinaryExpression()
			operator := bitwiseOperatorText(binaryExpr.OperatorToken.Kind)
			if operator == "" {
				return
			}

			ctx.ReportRange(
				scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, binaryExpr.OperatorToken.Pos()),
				buildBitwiseOperatorsMessage(operator),
			)
		}

		listeners := rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				binaryExpr := node.AsBinaryExpression()
				operatorKind := binaryExpr.OperatorToken.Kind

				if lonelyBitwiseAndOr == nil &&
					isBitwiseAndOr(operatorKind) &&
					!isNumericOperand(ctx, binaryExpr.Left) &&
					!isNumericOperand(ctx, binaryExpr.Right) {
					lonelyBitwiseAndOr = node
				} else if isBitwiseOperator(operatorKind) {
					fileContainsSeveralBitwiseOperations = true
				}
			},
		}

		for _, kind := range topLevelNodeKinds {
			listeners[rule.ListenerOnExit(kind)] = flush
		}

		return listeners
	},
}
