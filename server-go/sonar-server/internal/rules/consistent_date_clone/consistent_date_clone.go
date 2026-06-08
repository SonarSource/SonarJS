package consistent_date_clone

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
)

func buildConsistentDateCloneMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "consistent-date-clone/error",
		Description: "Unnecessary `.getTime()` call.",
	}
}

func isDateConstructor(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return ast.IsIdentifier(node) && node.AsIdentifier().Text == "Date"
}

func getSingleArgument(arguments *ast.NodeList) *ast.Node {
	if arguments == nil || len(arguments.Nodes) != 1 {
		return nil
	}

	return arguments.Nodes[0]
}

func isGetTimeCall(node *ast.Node) (*ast.CallExpression, *ast.PropertyAccessExpression, bool) {
	node = ast.SkipParentheses(node)
	if !ast.IsCallExpression(node) {
		return nil, nil, false
	}

	callExpr := node.AsCallExpression()
	if callExpr.QuestionDotToken != nil || callExpr.Arguments == nil || len(callExpr.Arguments.Nodes) != 0 {
		return nil, nil, false
	}
	if !ast.IsPropertyAccessExpression(callExpr.Expression) {
		return nil, nil, false
	}

	propertyAccess := callExpr.Expression.AsPropertyAccessExpression()
	if propertyAccess.QuestionDotToken != nil {
		return nil, nil, false
	}

	name := propertyAccess.Name()
	if name == nil || name.Text() != "getTime" {
		return nil, nil, false
	}

	return callExpr, propertyAccess, true
}

func getTimeCallRange(sourceFile *ast.SourceFile, callExpr *ast.CallExpression, propertyAccess *ast.PropertyAccessExpression) core.TextRange {
	return utils.TrimNodeTextRange(sourceFile, propertyAccess.Name()).WithEnd(callExpr.End())
}

func removeGetTimeCallFix(callExpr *ast.CallExpression, propertyAccess *ast.PropertyAccessExpression) rule.RuleFix {
	return rule.RuleFixRemoveRange(core.NewTextRange(propertyAccess.Expression.End(), callExpr.End()))
}

var ConsistentDateCloneRule = rule.Rule{
	Name: "consistent-date-clone",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindNewExpression: func(node *ast.Node) {
				newExpr := node.AsNewExpression()
				if !isDateConstructor(newExpr.Expression) {
					return
				}

				argument := getSingleArgument(newExpr.Arguments)
				if argument == nil {
					return
				}

				callExpr, propertyAccess, ok := isGetTimeCall(argument)
				if !ok {
					return
				}

				diagnostic := rule.RuleDiagnostic{
					Range:   getTimeCallRange(ctx.SourceFile, callExpr, propertyAccess),
					Message: buildConsistentDateCloneMessage(),
				}
				ctx.ReportDiagnosticWithFixes(diagnostic, func() []rule.RuleFix {
					return []rule.RuleFix{removeGetTimeCallFix(callExpr, propertyAccess)}
				})
			},
		}
	},
}
