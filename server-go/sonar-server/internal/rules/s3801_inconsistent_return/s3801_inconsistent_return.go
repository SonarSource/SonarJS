package s3801_inconsistent_return

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const inconsistentReturnMessageID = "inconsistentReturn"

type returnConsistencyScope struct {
	returnStatements    []*ast.Node
	hasReturnWithValue  bool
	hasReturnWithoutVal bool
}

func buildInconsistentReturnMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          inconsistentReturnMessageID,
		Description: `Refactor this function to use "return" consistently.`,
	}
}

func buildReturnLabel(hasValue bool) string {
	if hasValue {
		return "Return with value"
	}
	return "Return without value"
}

func buildImplicitReturnLabel() string {
	return "Implicit return without value"
}

func isAnalyzedFunction(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindFunctionDeclaration,
		ast.KindFunctionExpression,
		ast.KindArrowFunction,
		ast.KindMethodDeclaration,
		ast.KindGetAccessor,
		ast.KindSetAccessor:
		return true
	default:
		return false
	}
}

func allowsVoidLikeReturn(typeNode *ast.Node) bool {
	if typeNode == nil {
		return false
	}

	switch typeNode.Kind {
	case ast.KindUndefinedKeyword, ast.KindVoidKeyword, ast.KindNeverKeyword:
		return true
	case ast.KindParenthesizedType:
		return allowsVoidLikeReturn(typeNode.AsParenthesizedTypeNode().Type)
	case ast.KindUnionType:
		for _, subtype := range typeNode.AsUnionTypeNode().Types.Nodes {
			if allowsVoidLikeReturn(subtype) {
				return true
			}
		}
	}

	return false
}

func hasImplicitReturn(ctx rule.RuleContext, fn *ast.Node) bool {
	body := fn.Body()
	if body == nil || !ast.IsBlock(body) {
		return false
	}

	return statementsCanCompleteNormally(ctx, body.AsBlock().Statements.Nodes)
}

func statementsCanCompleteNormally(ctx rule.RuleContext, statements []*ast.Node) bool {
	reachable := true
	for _, statement := range statements {
		if !reachable {
			return false
		}
		reachable = statementCanCompleteNormally(ctx, statement)
	}
	return reachable
}

func statementsMayThrow(statements []*ast.Node) bool {
	for _, statement := range statements {
		if statementMayThrow(statement) {
			return true
		}
	}
	return false
}

func statementCanCompleteNormally(ctx rule.RuleContext, node *ast.Node) bool {
	if node == nil {
		return true
	}

	switch node.Kind {
	case ast.KindBlock:
		return statementsCanCompleteNormally(ctx, node.AsBlock().Statements.Nodes)
	case ast.KindReturnStatement, ast.KindThrowStatement:
		return false
	case ast.KindExpressionStatement:
		expr := ast.SkipParentheses(node.AsExpressionStatement().Expression)
		return expr == nil || !callReturnsNever(ctx, expr)
	case ast.KindIfStatement:
		ifStmt := node.AsIfStatement()
		if ifStmt.ElseStatement == nil {
			return true
		}
		return statementCanCompleteNormally(ctx, ifStmt.ThenStatement) ||
			statementCanCompleteNormally(ctx, ifStmt.ElseStatement)
	case ast.KindSwitchStatement:
		return switchCanCompleteNormally(ctx, node.AsSwitchStatement())
	case ast.KindTryStatement:
		tryStmt := node.AsTryStatement()
		tryCanComplete := statementsCanCompleteNormally(ctx, tryStmt.TryBlock.AsBlock().Statements.Nodes)
		catchCanComplete := false
		if tryStmt.CatchClause != nil {
			catchCanComplete = statementsCanCompleteNormally(ctx, tryStmt.CatchClause.AsCatchClause().Block.AsBlock().Statements.Nodes)
		}
		result := tryCanComplete || (tryStmt.CatchClause != nil && statementsMayThrow(tryStmt.TryBlock.AsBlock().Statements.Nodes) && catchCanComplete)
		if tryStmt.FinallyBlock != nil && !statementsCanCompleteNormally(ctx, tryStmt.FinallyBlock.AsBlock().Statements.Nodes) {
			return false
		}
		return result
	case ast.KindForStatement:
		forStmt := node.AsForStatement()
		if isDefinitelyTrue(forStmt.Condition) {
			return hasBreakStatement(forStmt.Statement)
		}
		return true
	case ast.KindForInStatement, ast.KindForOfStatement:
		forOf := node.AsForInOrOfStatement()
		return hasBreakStatement(forOf.Statement)
	case ast.KindWhileStatement:
		whileStmt := node.AsWhileStatement()
		if isDefinitelyTrue(whileStmt.Expression) {
			return hasBreakStatement(whileStmt.Statement)
		}
		return true
	case ast.KindDoStatement:
		doStmt := node.AsDoStatement()
		if isDefinitelyTrue(doStmt.Expression) {
			return hasBreakStatement(doStmt.Statement)
		}
		return true
	case ast.KindLabeledStatement:
		return statementCanCompleteNormally(ctx, node.AsLabeledStatement().Statement)
	default:
		return true
	}
}

func statementMayThrow(node *ast.Node) bool {
	if node == nil {
		return false
	}

	switch node.Kind {
	case ast.KindThrowStatement:
		return true
	case ast.KindBlock:
		return statementsMayThrow(node.AsBlock().Statements.Nodes)
	case ast.KindIfStatement:
		ifStmt := node.AsIfStatement()
		return statementMayThrow(ifStmt.ThenStatement) || statementMayThrow(ifStmt.ElseStatement)
	case ast.KindSwitchStatement:
		for _, clause := range node.AsSwitchStatement().CaseBlock.AsCaseBlock().Clauses.Nodes {
			if statementsMayThrow(clause.AsCaseOrDefaultClause().Statements.Nodes) {
				return true
			}
		}
		return false
	case ast.KindTryStatement:
		tryStmt := node.AsTryStatement()
		return statementsMayThrow(tryStmt.TryBlock.AsBlock().Statements.Nodes) ||
			(tryStmt.CatchClause != nil && statementsMayThrow(tryStmt.CatchClause.AsCatchClause().Block.AsBlock().Statements.Nodes)) ||
			(tryStmt.FinallyBlock != nil && statementsMayThrow(tryStmt.FinallyBlock.AsBlock().Statements.Nodes))
	case ast.KindLabeledStatement:
		return statementMayThrow(node.AsLabeledStatement().Statement)
	default:
		return false
	}
}

func isDefinitelyTrue(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return node == nil || node.Kind == ast.KindTrueKeyword
}

func hasBreakStatement(root *ast.Node) bool {
	found := false

	var visit func(node *ast.Node)
	visit = func(node *ast.Node) {
		if node == nil || found {
			return
		}

		if node != root && (ast.IsFunctionLikeDeclaration(node) || ast.IsClassLike(node)) {
			return
		}

		switch node.Kind {
		case ast.KindBreakStatement:
			found = true
			return
		case ast.KindForStatement,
			ast.KindForInStatement,
			ast.KindForOfStatement,
			ast.KindWhileStatement,
			ast.KindDoStatement,
			ast.KindSwitchStatement:
			if node != root {
				return
			}
		}

		node.ForEachChild(func(child *ast.Node) bool {
			visit(child)
			return found
		})
	}

	visit(root)
	return found
}

func callReturnsNever(ctx rule.RuleContext, expr *ast.Node) bool {
	if ctx.TypeChecker == nil {
		return false
	}

	if !ast.IsCallExpression(expr) {
		return false
	}

	callType := ctx.TypeChecker.GetTypeAtLocation(expr)
	return utils.IsTypeFlagSet(callType, checker.TypeFlagsNever)
}

func switchCanCompleteNormally(ctx rule.RuleContext, node *ast.SwitchStatement) bool {
	clauses := node.CaseBlock.AsCaseBlock().Clauses.Nodes
	if len(clauses) == 0 {
		return true
	}

	hasDefault := false
	for _, clause := range clauses {
		if clause.Kind == ast.KindDefaultClause {
			hasDefault = true
			break
		}
	}

	if ctx.TypeChecker != nil && !hasDefault && isExhaustiveSwitch(ctx, node) {
		lastClause := clauses[len(clauses)-1].AsCaseOrDefaultClause()
		return statementsCanCompleteNormally(ctx, lastClause.Statements.Nodes)
	}

	if !hasDefault {
		return true
	}

	for _, clause := range clauses {
		if statementsCanCompleteNormally(ctx, clause.AsCaseOrDefaultClause().Statements.Nodes) {
			return true
		}
	}

	return false
}

func isEnumLikeType(t *checker.Type) bool {
	return utils.IsTypeFlagSet(t, checker.TypeFlagsEnumLike|checker.TypeFlagsEnumLiteral) ||
		(t != nil && t.Symbol() != nil && t.Symbol().Flags&ast.SymbolFlagsEnumMember != 0)
}

func isExhaustiveSwitch(ctx rule.RuleContext, node *ast.SwitchStatement) bool {
	clauses := node.CaseBlock.AsCaseBlock().Clauses.Nodes
	if len(clauses) == 0 || ctx.TypeChecker == nil {
		return false
	}

	discriminantType := utils.GetConstrainedTypeAtLocation(ctx.TypeChecker, node.Expression)
	discriminantParts := utils.UnionTypeParts(discriminantType)
	if len(discriminantParts) <= 1 && !isEnumLikeType(discriminantType) {
		return false
	}

	covered := []*checker.Type{}
	for _, clause := range clauses {
		caseClause := clause.AsCaseOrDefaultClause()
		if caseClause.Expression == nil {
			return true
		}

		caseType := utils.GetConstrainedTypeAtLocation(ctx.TypeChecker, caseClause.Expression)
		covered = append(covered, utils.UnionTypeParts(caseType)...)
	}

	for _, target := range discriminantParts {
		matched := false
		for _, current := range covered {
			if checker.Checker_isTypeAssignableTo(ctx.TypeChecker, target, current) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}

	return true
}

func implicitReturnRange(sourceFile *ast.SourceFile, fn *ast.Node) rule.RuleLabeledRange {
	body := fn.Body()
	if body != nil && ast.IsBlock(body) {
		rangeOfBrace := scanner.GetRangeOfTokenAtPosition(sourceFile, body.End()-1)
		return rule.RuleLabeledRange{
			Label: buildImplicitReturnLabel(),
			Range: rangeOfBrace,
		}
	}

	return rule.RuleLabeledRange{
		Label: buildImplicitReturnLabel(),
		Range: utils.GetFunctionHeadLoc(sourceFile, fn),
	}
}

func reportInconsistentReturn(ctx rule.RuleContext, fn *ast.Node, scope returnConsistencyScope, includeImplicit bool) {
	labeledRanges := make([]rule.RuleLabeledRange, 0, len(scope.returnStatements)+1)
	for _, stmtNode := range scope.returnStatements {
		stmt := stmtNode.AsReturnStatement()
		labeledRanges = append(labeledRanges, rule.RuleLabeledRange{
			Label: buildReturnLabel(stmt.Expression != nil),
			Range: utils.TrimNodeTextRange(ctx.SourceFile, stmtNode),
		})
	}
	if includeImplicit {
		labeledRanges = append(labeledRanges, implicitReturnRange(ctx.SourceFile, fn))
	}

	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:         utils.GetFunctionHeadLoc(ctx.SourceFile, fn),
		Message:       buildInconsistentReturnMessage(),
		LabeledRanges: labeledRanges,
		SourceFile:    ctx.SourceFile,
	})
}

var InconsistentReturnRule = rule.Rule{
	Name: "inconsistent-return",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		var scopes []returnConsistencyScope

		enter := func() {
			scopes = append(scopes, returnConsistencyScope{})
		}
		exit := func(node *ast.Node) {
			if len(scopes) == 0 {
				return
			}

			current := scopes[len(scopes)-1]
			scopes = scopes[:len(scopes)-1]

			if allowsVoidLikeReturn(node.Type()) {
				return
			}

			includeImplicit := hasImplicitReturn(ctx, node)
			if current.hasReturnWithValue && (current.hasReturnWithoutVal || includeImplicit) {
				reportInconsistentReturn(ctx, node, current, includeImplicit)
			}
		}

		listeners := rule.RuleListeners{
			ast.KindReturnStatement: func(node *ast.Node) {
				if len(scopes) == 0 {
					return
				}

				current := &scopes[len(scopes)-1]
				current.returnStatements = append(current.returnStatements, node)
				if node.AsReturnStatement().Expression != nil {
					current.hasReturnWithValue = true
				} else {
					current.hasReturnWithoutVal = true
				}
			},
		}

		for _, kind := range []ast.Kind{
			ast.KindFunctionDeclaration,
			ast.KindFunctionExpression,
			ast.KindArrowFunction,
			ast.KindMethodDeclaration,
			ast.KindGetAccessor,
			ast.KindSetAccessor,
		} {
			listeners[kind] = func(node *ast.Node) {
				if isAnalyzedFunction(node) {
					enter()
				}
			}
			listeners[rule.ListenerOnExit(kind)] = func(node *ast.Node) {
				if isAnalyzedFunction(node) {
					exit(node)
				}
			}
		}

		return listeners
	},
}
