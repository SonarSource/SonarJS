package s4324_return_any_type

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const removeOrChangeTypeMessageID = "removeOrChangeType"

func buildRemoveOrChangeTypeMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          removeOrChangeTypeMessageID,
		Description: "Remove this return type or change it to a more specific.",
	}
}

func isPrimitiveType(t *checker.Type) bool {
	if t == nil {
		return false
	}

	flags := checker.Type_flags(t)
	return flags&(checker.TypeFlagsBooleanLike|checker.TypeFlagsNumberLike|checker.TypeFlagsStringLike|checker.TypeFlagsEnumLike) != 0
}

func allReturnTypesEqual(typeChecker *checker.Checker, returns []*ast.Node) bool {
	if len(returns) == 0 {
		return false
	}

	firstReturn := returns[len(returns)-1]
	if firstReturn == nil {
		return false
	}

	firstReturnType := typeChecker.GetTypeAtLocation(firstReturn)
	if !isPrimitiveType(firstReturnType) {
		return false
	}

	firstFlags := checker.Type_flags(firstReturnType)
	for _, nextReturn := range returns[:len(returns)-1] {
		if nextReturn == nil {
			return false
		}

		nextReturnType := typeChecker.GetTypeAtLocation(nextReturn)
		if nextReturnType == nil || checker.Type_flags(nextReturnType) != firstFlags {
			return false
		}
	}

	return true
}

func returnTypeAnnotationRange(sourceFile *ast.SourceFile, node *ast.Node, returnType *ast.Node) core.TextRange {
	typeRange := utils.TrimNodeTextRange(sourceFile, returnType)
	params := node.ParameterList()
	if params == nil {
		return typeRange
	}

	signatureEnd := params.End()
	closingParen := scanner.GetRangeOfTokenAtPosition(sourceFile, signatureEnd)
	if closingParen.Pos() == signatureEnd {
		signatureEnd = closingParen.End()
	}

	start := typeRange.Pos()
	text := sourceFile.Text()
	if signatureEnd < 0 || signatureEnd > start || start > len(text) {
		return typeRange
	}

	if colonOffset := strings.IndexByte(text[signatureEnd:start], ':'); colonOffset >= 0 {
		start = signatureEnd + colonOffset
	}

	return core.NewTextRange(start, typeRange.End())
}

var ReturnAnyTypeRule = rule.Rule{
	Name: "no-return-type-any",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		returnedExpressions := make([][]*ast.Node, 0, 4)

		return rule.RuleListeners{
			ast.KindReturnStatement: func(node *ast.Node) {
				if len(returnedExpressions) == 0 {
					return
				}
				returnedExpressions[len(returnedExpressions)-1] = append(
					returnedExpressions[len(returnedExpressions)-1],
					node.AsReturnStatement().Expression,
				)
			},
			ast.KindFunctionDeclaration: func(node *ast.Node) {
				returnedExpressions = append(returnedExpressions, []*ast.Node{})
			},
			rule.ListenerOnExit(ast.KindFunctionDeclaration): func(node *ast.Node) {
				if len(returnedExpressions) == 0 {
					return
				}

				returns := returnedExpressions[len(returnedExpressions)-1]
				returnedExpressions = returnedExpressions[:len(returnedExpressions)-1]

				returnType := node.Type()
				if returnType == nil || returnType.Kind != ast.KindAnyKeyword {
					return
				}

				if allReturnTypesEqual(ctx.TypeChecker, returns) {
					ctx.ReportRange(returnTypeAnnotationRange(ctx.SourceFile, node, returnType), buildRemoveOrChangeTypeMessage())
				}
			},
		}
	},
}
