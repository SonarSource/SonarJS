package s1488_prefer_immediate_return

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const doImmediateActionMessageID = "doImmediateAction"

type declaredVariable struct {
	declaration *ast.Node
	name        *ast.Node
	init        *ast.Node
}

func buildDoImmediateActionMessage(action string, variable string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          doImmediateActionMessageID,
		Description: "Immediately " + action + ` this expression instead of assigning it to the temporary variable "` + variable + `".`,
	}
}

func getOnlyReturnedVariable(statement *ast.Node) *ast.Node {
	switch {
	case ast.IsReturnStatement(statement):
		expression := statement.AsReturnStatement().Expression
		if expression != nil && ast.IsIdentifier(expression) {
			return expression
		}
	case ast.IsThrowStatement(statement):
		expression := statement.AsThrowStatement().Expression
		if expression != nil && ast.IsIdentifier(expression) {
			return expression
		}
	default:
		return nil
	}
	return nil
}

func getOnlyDeclaredVariable(statement *ast.Node) *declaredVariable {
	if !ast.IsVariableStatement(statement) {
		return nil
	}

	list := statement.AsVariableStatement().DeclarationList.AsVariableDeclarationList()
	if len(list.Declarations.Nodes) != 1 {
		return nil
	}

	declaration := list.Declarations.Nodes[0]
	decl := declaration.AsVariableDeclaration()
	name := decl.Name()
	if !ast.IsIdentifier(name) || decl.Initializer == nil || decl.Type != nil {
		return nil
	}

	return &declaredVariable{
		declaration: declaration,
		name:        name,
		init:        decl.Initializer,
	}
}

func hasJSDocTypeAnnotation(statement *ast.Node, declaration *ast.Node) bool {
	return len(statement.JSDoc(nil)) > 0 || len(declaration.JSDoc(nil)) > 0
}

func isFunctionTyped(ctx rule.RuleContext, node *ast.Node) bool {
	if ctx.TypeChecker == nil || node == nil {
		return false
	}

	t := checker.Checker_getApparentType(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(node))
	return len(utils.GetCallSignatures(ctx.TypeChecker, t)) > 0
}

func enclosingVarScope(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLikeDeclaration(current) || current.Kind == ast.KindSourceFile {
			return current
		}
	}
	return nil
}

func scopeRoot(statementListOwner *ast.Node, declaration *ast.Node) *ast.Node {
	if declaration == nil || declaration.Parent == nil {
		return statementListOwner
	}

	if declaration.Parent.Flags&ast.NodeFlagsBlockScoped != 0 {
		return statementListOwner
	}

	if hoisted := enclosingVarScope(statementListOwner); hoisted != nil {
		return hoisted
	}

	return statementListOwner
}

func isReadReference(identifier *ast.Node) bool {
	parent := identifier.Parent
	if parent == nil {
		return false
	}

	switch {
	case ast.IsVariableDeclaration(parent) && parent.Name() == identifier:
		return false
	case ast.IsParameterDeclaration(parent) && parent.Name() == identifier:
		return false
	case ast.IsBindingElement(parent) && parent.AsBindingElement().Name() == identifier:
		return false
	case ast.IsPropertyAssignment(parent) && parent.AsPropertyAssignment().Name() == identifier:
		return false
	case ast.IsPropertyAccessExpression(parent) && parent.AsPropertyAccessExpression().Name() == identifier:
		return false
	case ast.IsBinaryExpression(parent) && ast.IsAssignmentExpression(parent, true) && parent.AsBinaryExpression().Left == identifier:
		return parent.AsBinaryExpression().OperatorToken.Kind != ast.KindEqualsToken
	case ast.IsPrefixUnaryExpression(parent) && parent.AsPrefixUnaryExpression().Operand == identifier:
		operator := parent.AsPrefixUnaryExpression().Operator
		return operator == ast.KindPlusPlusToken || operator == ast.KindMinusMinusToken
	case ast.IsPostfixUnaryExpression(parent) && parent.AsPostfixUnaryExpression().Operand == identifier:
		operator := parent.AsPostfixUnaryExpression().Operator
		return operator == ast.KindPlusPlusToken || operator == ast.KindMinusMinusToken
	default:
		return true
	}
}

func countReadReferences(ctx rule.RuleContext, root *ast.Node, symbol *ast.Symbol) int {
	if root == nil || symbol == nil {
		return 0
	}

	count := 0
	var visit func(node *ast.Node)
	visit = func(node *ast.Node) {
		if node == nil {
			return
		}

		if node != root && ast.IsFunctionLikeDeclaration(node) {
			node.ForEachChild(func(child *ast.Node) bool {
				visit(child)
				return false
			})
			return
		}

		if ast.IsIdentifier(node) {
			if currentSymbol := ctx.TypeChecker.GetSymbolAtLocation(node); currentSymbol == symbol && isReadReference(node) {
				count++
			}
		}

		node.ForEachChild(func(child *ast.Node) bool {
			visit(child)
			return false
		})
	}

	visit(root)
	return count
}

func processStatements(ctx rule.RuleContext, owner *ast.Node, statements []*ast.Node) {
	if len(statements) < 2 || ctx.TypeChecker == nil {
		return
	}

	lastStatement := statements[len(statements)-1]
	returnedIdentifier := getOnlyReturnedVariable(lastStatement)
	if returnedIdentifier == nil {
		return
	}

	declared := getOnlyDeclaredVariable(statements[len(statements)-2])
	if declared == nil {
		return
	}

	declaredSymbol := ctx.TypeChecker.GetSymbolAtLocation(declared.name)
	returnedSymbol := ctx.TypeChecker.GetSymbolAtLocation(returnedIdentifier)
	if declaredSymbol == nil || declaredSymbol != returnedSymbol {
		return
	}

	if hasJSDocTypeAnnotation(statements[len(statements)-2], declared.declaration) || isFunctionTyped(ctx, declared.name) {
		return
	}

	if countReadReferences(ctx, scopeRoot(owner, declared.declaration), declaredSymbol) != 1 {
		return
	}

	action := "return"
	if ast.IsThrowStatement(lastStatement) {
		action = "throw"
	}

	ctx.ReportNode(declared.init, buildDoImmediateActionMessage(action, returnedIdentifier.AsIdentifier().Text))
}

var PreferImmediateReturnRule = rule.Rule{
	Name: "prefer-immediate-return",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindBlock: func(node *ast.Node) {
				processStatements(ctx, node, node.AsBlock().Statements.Nodes)
			},
			ast.KindCaseClause: func(node *ast.Node) {
				processStatements(ctx, node, node.AsCaseOrDefaultClause().Statements.Nodes)
			},
			ast.KindDefaultClause: func(node *ast.Node) {
				processStatements(ctx, node, node.AsCaseOrDefaultClause().Statements.Nodes)
			},
		}
	},
}
