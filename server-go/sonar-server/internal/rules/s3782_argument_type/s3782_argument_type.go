package s3782_argument_type

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const argumentTypeMessageID = "argumentType"

func buildArgumentTypeMessage(declaredType string, actualType string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          argumentTypeMessageID,
		Description: fmt.Sprintf("Verify that argument is of correct type: expected '%s' instead of '%s'.", declaredType, actualType),
	}
}

type declarationMismatch struct {
	actualType   *checker.Type
	declaredType *checker.Type
	node         *ast.Node
}

func isBuiltInInterfaceName(name string) bool {
	switch name {
	case "String", "Math", "Array", "Number", "Date":
		return true
	default:
		return false
	}
}

func isVarArg(param *ast.Node) bool {
	return ast.IsParameterDeclaration(param) && param.AsParameterDeclaration().DotDotDotToken != nil
}

func typeToString(typeChecker *checker.Checker, t *checker.Type) string {
	baseType := checker.Checker_getBaseTypeOfLiteralType(typeChecker, t)
	if baseType == nil {
		baseType = t
	}
	return typeChecker.TypeToString(baseType)
}

var ArgumentTypeRule = rule.Rule{
	Name: "argument-type",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		getCallSymbol := func(callee *ast.Node) *ast.Symbol {
			callee = ast.SkipParentheses(callee)
			if callee == nil {
				return nil
			}

			if symbol := ctx.TypeChecker.GetSymbolAtLocation(callee); symbol != nil {
				return symbol
			}

			if ast.IsPropertyAccessExpression(callee) {
				return ctx.TypeChecker.GetSymbolAtLocation(callee.AsPropertyAccessExpression().Name())
			}

			return nil
		}

		isBuiltInMethod := func(symbol *ast.Symbol) bool {
			decl := symbol.ValueDeclaration
			if decl == nil && len(symbol.Declarations) > 0 {
				decl = symbol.Declarations[0]
			}
			if decl == nil || decl.Parent == nil || !ast.IsInterfaceDeclaration(decl.Parent) {
				return false
			}

			sourceFile := ast.GetSourceFileOfNode(decl)
			if !utils.IsSourceFileDefaultLibrary(ctx.Program, sourceFile) {
				return false
			}

			name := decl.Parent.AsInterfaceDeclaration().Name()
			return name != nil && isBuiltInInterfaceName(name.Text())
		}

		findDeclarationMismatch := func(declaration *ast.Node, callExpr *ast.CallExpression) *declarationMismatch {
			parameters := declaration.Parameters()
			args := callExpr.Arguments.Nodes
			for i := 0; i < len(parameters) && i < len(args); i++ {
				param := parameters[i]
				if !ast.IsParameterDeclaration(param) {
					return nil
				}

				paramType := param.AsParameterDeclaration().Type
				if paramType == nil {
					return nil
				}

				declaredType := checker.Checker_getTypeFromTypeNode(ctx.TypeChecker, paramType)
				actualType := ctx.TypeChecker.GetTypeAtLocation(args[i])
				if !checker.Checker_isTypeAssignableTo(ctx.TypeChecker, actualType, declaredType) &&
					!utils.IsTypeParameter(declaredType) &&
					!ast.IsFunctionTypeNode(paramType) &&
					!isVarArg(param) {
					return &declarationMismatch{
						actualType:   actualType,
						declaredType: declaredType,
						node:         args[i],
					}
				}
			}

			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				symbol := getCallSymbol(callExpr.Expression)
				if symbol == nil || len(symbol.Declarations) == 0 || !isBuiltInMethod(symbol) {
					return
				}

				var mismatch *declarationMismatch
				for _, declaration := range symbol.Declarations {
					mismatch = findDeclarationMismatch(declaration, callExpr)
					if mismatch == nil {
						return
					}
				}

				ctx.ReportNode(
					mismatch.node,
					buildArgumentTypeMessage(
						typeToString(ctx.TypeChecker, mismatch.declaredType),
						typeToString(ctx.TypeChecker, mismatch.actualType),
					),
				)
			},
		}
	},
}
