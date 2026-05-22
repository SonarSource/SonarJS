package s4623_no_undefined_argument

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const removeUndefinedMessageID = "removeUndefined"

func buildRemoveUndefinedMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          removeUndefinedMessageID,
		Description: "Remove this redundant \"undefined\".",
	}
}

func isOptionalParameter(typeChecker *checker.Checker, paramIndex int, node *ast.CallExpression) bool {
	signature := checker.Checker_getResolvedSignature(typeChecker, &node.Node, nil, checker.CheckModeNormal)
	if signature == nil {
		return false
	}

	declaration := checker.Signature_declaration(signature)
	if declaration == nil || !ast.IsFunctionLikeDeclaration(declaration) {
		return false
	}

	parameters := declaration.Parameters()
	if paramIndex < 0 || paramIndex >= len(parameters) {
		return false
	}

	parameter := parameters[paramIndex].AsParameterDeclaration()
	return parameter.Initializer != nil || parameter.QuestionToken != nil
}

var NoUndefinedArgumentRule = rule.Rule{
	Name: "no-undefined-argument",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpression := node.AsCallExpression()
				args := callExpression.Arguments.Nodes
				if len(args) == 0 {
					return
				}

				lastArgument := ast.SkipParentheses(args[len(args)-1])
				if !utils.IsUndefinedIdentifier(lastArgument) {
					return
				}

				if !isOptionalParameter(ctx.TypeChecker, len(args)-1, callExpression) {
					return
				}

				ctx.ReportNode(lastArgument, buildRemoveUndefinedMessage())
			},
		}
	},
}
