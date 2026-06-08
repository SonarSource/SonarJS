package consistent_empty_array_spread

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const messageID = "consistent-empty-array-spread"

type problem struct {
	node        *ast.Node
	message     rule.RuleMessage
	replacement string
}

func buildConsistentEmptyArraySpreadMessage(replacementDescription string, anotherNodePosition string, anotherNodeDescription string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          messageID,
		Description: "Prefer using empty " + replacementDescription + " since the " + anotherNodePosition + " is " + anotherNodeDescription + ".",
	}
}

func isEmptyArrayExpression(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return ast.IsArrayLiteralExpression(node) && len(node.AsArrayLiteralExpression().Elements.Nodes) == 0
}

func isEmptyStringLiteral(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return ast.IsStringLiteral(node) && node.Text() == ""
}

func constInitializer(ctx rule.RuleContext, node *ast.Node) (*ast.Node, bool) {
	node = ast.SkipParentheses(node)
	if node == nil || !ast.IsIdentifier(node) {
		return nil, false
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil || symbol.ValueDeclaration == nil || !ast.IsVariableDeclaration(symbol.ValueDeclaration) {
		return nil, false
	}

	declaration := symbol.ValueDeclaration.AsVariableDeclaration()
	if declaration.Initializer == nil || declaration.Parent == nil || !ast.IsVariableDeclarationList(declaration.Parent) {
		return nil, false
	}

	if declaration.Parent.Flags&ast.NodeFlagsConst == 0 {
		return nil, false
	}

	return ast.SkipParentheses(declaration.Initializer), true
}

func isStaticArray(ctx rule.RuleContext, node *ast.Node, seen map[*ast.Symbol]struct{}) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	if ast.IsArrayLiteralExpression(node) {
		return true
	}

	if !ast.IsIdentifier(node) {
		return false
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil {
		return false
	}
	if _, ok := seen[symbol]; ok {
		return false
	}

	seen[symbol] = struct{}{}
	defer delete(seen, symbol)

	initializer, ok := constInitializer(ctx, node)
	if !ok {
		return false
	}

	return isStaticArray(ctx, initializer, seen)
}

func isStaticString(ctx rule.RuleContext, node *ast.Node, seen map[*ast.Symbol]struct{}) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	if ast.IsStringLiteral(node) || node.Kind == ast.KindNoSubstitutionTemplateLiteral {
		return true
	}

	if !ast.IsIdentifier(node) {
		return false
	}

	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil {
		return false
	}
	if _, ok := seen[symbol]; ok {
		return false
	}

	seen[symbol] = struct{}{}
	defer delete(seen, symbol)

	initializer, ok := constInitializer(ctx, node)
	if !ok {
		return false
	}

	return isStaticString(ctx, initializer, seen)
}

func createProblem(problemNode *ast.Node, anotherNodePosition string, anotherNodeDescription string, replacementDescription string, replacement string) problem {
	return problem{
		node: problemNode,
		message: buildConsistentEmptyArraySpreadMessage(
			replacementDescription,
			anotherNodePosition,
			anotherNodeDescription,
		),
		replacement: replacement,
	}
}

func getProblem(ctx rule.RuleContext, conditionalExpression *ast.ConditionalExpression) *problem {
	consequent := conditionalExpression.WhenTrue
	alternate := conditionalExpression.WhenFalse

	switch {
	case isEmptyStringLiteral(consequent) && isStaticArray(ctx, alternate, map[*ast.Symbol]struct{}{}):
		p := createProblem(consequent, "alternate", "an array", "array", "[]")
		return &p
	case isEmptyStringLiteral(alternate) && isStaticArray(ctx, consequent, map[*ast.Symbol]struct{}{}):
		p := createProblem(alternate, "consequent", "an array", "array", "[]")
		return &p
	case isEmptyArrayExpression(consequent) && isStaticString(ctx, alternate, map[*ast.Symbol]struct{}{}):
		p := createProblem(consequent, "alternate", "a string", "string", "''")
		return &p
	case isEmptyArrayExpression(alternate) && isStaticString(ctx, consequent, map[*ast.Symbol]struct{}{}):
		p := createProblem(alternate, "consequent", "a string", "string", "''")
		return &p
	default:
		return nil
	}
}

var ConsistentEmptyArraySpreadRule = rule.Rule{
	Name: "consistent-empty-array-spread",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindArrayLiteralExpression: func(node *ast.Node) {
				for _, element := range node.AsArrayLiteralExpression().Elements.Nodes {
					if !ast.IsSpreadElement(element) {
						continue
					}

					argument := ast.SkipParentheses(element.AsSpreadElement().Expression)
					if !ast.IsConditionalExpression(argument) {
						continue
					}

					problem := getProblem(ctx, argument.AsConditionalExpression())
					if problem == nil {
						continue
					}

					ctx.ReportNodeWithFixes(problem.node, problem.message, func() []rule.RuleFix {
						return []rule.RuleFix{rule.RuleFixReplace(ctx.SourceFile, problem.node, problem.replacement)}
					})
				}
			},
		}
	},
}
