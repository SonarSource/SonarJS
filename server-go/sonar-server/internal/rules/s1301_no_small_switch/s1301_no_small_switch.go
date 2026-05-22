package s1301_no_small_switch

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const replaceSwitchMessageID = "replaceSwitch"

func buildReplaceSwitchMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          replaceSwitchMessageID,
		Description: `Replace this "switch" statement by "if" statements to increase readability.`,
	}
}

func sameSimpleExpression(left *ast.Node, right *ast.Node) bool {
	left = ast.SkipParentheses(left)
	right = ast.SkipParentheses(right)

	switch {
	case left == nil || right == nil:
		return false
	case ast.IsIdentifier(left) && ast.IsIdentifier(right):
		return left.AsIdentifier().Text == right.AsIdentifier().Text
	case ast.IsPropertyAccessExpression(left) && ast.IsPropertyAccessExpression(right):
		leftAccess := left.AsPropertyAccessExpression()
		rightAccess := right.AsPropertyAccessExpression()
		leftName := leftAccess.Name()
		rightName := rightAccess.Name()
		return leftName != nil &&
			rightName != nil &&
			leftName.Text() == rightName.Text() &&
			sameSimpleExpression(leftAccess.Expression, rightAccess.Expression)
	default:
		return false
	}
}

func defaultClause(node *ast.SwitchStatement) *ast.CaseOrDefaultClause {
	for _, clause := range node.CaseBlock.AsCaseBlock().Clauses.Nodes {
		if clause.Kind == ast.KindDefaultClause {
			return clause.AsCaseOrDefaultClause()
		}
	}
	return nil
}

func hasNeverTypeAnnotation(statement *ast.Node, discriminant *ast.Node) bool {
	if !ast.IsVariableStatement(statement) {
		return false
	}

	declarationList := statement.AsVariableStatement().DeclarationList.AsVariableDeclarationList()
	for _, declarationNode := range declarationList.Declarations.Nodes {
		declaration := declarationNode.AsVariableDeclaration()
		name := declaration.Name()
		if !ast.IsIdentifier(name) || declaration.Type == nil || declaration.Initializer == nil {
			continue
		}
		if declaration.Type.Kind == ast.KindNeverKeyword && sameSimpleExpression(declaration.Initializer, discriminant) {
			return true
		}
	}

	return false
}

func callExpressionFromStatement(statement *ast.Node) *ast.Node {
	switch {
	case ast.IsExpressionStatement(statement) && ast.IsCallExpression(statement.AsExpressionStatement().Expression):
		return statement.AsExpressionStatement().Expression
	case ast.IsReturnStatement(statement) && ast.IsCallExpression(statement.AsReturnStatement().Expression):
		return statement.AsReturnStatement().Expression
	case ast.IsThrowStatement(statement) && ast.IsCallExpression(statement.AsThrowStatement().Expression):
		return statement.AsThrowStatement().Expression
	default:
		return nil
	}
}

func hasNeverTypedCallArg(
	ctx rule.RuleContext,
	statement *ast.Node,
	discriminant *ast.Node,
) bool {
	if ctx.TypeChecker == nil {
		return false
	}

	callExpr := callExpressionFromStatement(statement)
	if callExpr == nil {
		return false
	}

	callType := ctx.TypeChecker.GetTypeAtLocation(callExpr)
	if !utils.IsTypeFlagSet(callType, checker.TypeFlagsNever) {
		return false
	}

	signature := checker.Checker_getResolvedSignature(ctx.TypeChecker, callExpr, nil, checker.CheckModeNormal)
	if signature == nil {
		return false
	}

	params := checker.Signature_parameters(signature)
	for index, argument := range callExpr.Arguments() {
		if !sameSimpleExpression(argument, discriminant) {
			continue
		}

		argType := ctx.TypeChecker.GetTypeAtLocation(argument)
		if !utils.IsTypeFlagSet(argType, checker.TypeFlagsNever) || index >= len(params) {
			continue
		}

		paramType := ctx.TypeChecker.GetTypeOfSymbolAtLocation(params[index], argument)
		if utils.IsTypeFlagSet(paramType, checker.TypeFlagsNever) {
			return true
		}
	}

	return false
}

func isExhaustivenessCheck(ctx rule.RuleContext, node *ast.SwitchStatement) bool {
	clause := defaultClause(node)
	if clause == nil {
		return false
	}

	for _, statement := range clause.Statements.Nodes {
		if hasNeverTypeAnnotation(statement, node.Expression) || hasNeverTypedCallArg(ctx, statement, node.Expression) {
			return true
		}
	}

	return false
}

var NoSmallSwitchRule = rule.Rule{
	Name: "no-small-switch",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindSwitchStatement: func(node *ast.Node) {
				stmt := node.AsSwitchStatement()
				cases := stmt.CaseBlock.AsCaseBlock().Clauses.Nodes
				hasDefault := defaultClause(stmt) != nil

				if len(cases) >= 2 && !(len(cases) == 2 && hasDefault) {
					return
				}
				if hasDefault && isExhaustivenessCheck(ctx, stmt) {
					return
				}

				ctx.ReportRange(scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, node.Pos()), buildReplaceSwitchMessage())
			},
		}
	},
}
