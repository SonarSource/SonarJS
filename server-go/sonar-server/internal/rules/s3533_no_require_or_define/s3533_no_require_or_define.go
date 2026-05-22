package s3533_no_require_or_define

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const standardImportMessageID = "standardImport"

func buildStandardImportMessage(adhocImport string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          standardImportMessageID,
		Description: fmt.Sprintf("Use a standard \"import\" statement instead of %q.", adhocImport),
	}
}

func isTopLevelCallExpression(node *ast.Node) bool {
	for current := node; current != nil; current = current.Parent {
		switch {
		case ast.IsFunctionLike(current), ast.IsClassLike(current):
			return false
		case ast.IsStatement(current):
			return current.Parent != nil && ast.IsSourceFile(current.Parent)
		}
	}

	return false
}

func isStringArgument(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	if ast.IsStringLiteral(node) || node.Kind == ast.KindNoSubstitutionTemplateLiteral {
		return true
	}
	if ctx.TypeChecker == nil {
		return false
	}

	t := ctx.TypeChecker.GetTypeAtLocation(node)
	return utils.IsTypeFlagSet(t, checker.TypeFlagsStringLike)
}

func isFunctionValue(ctx rule.RuleContext, node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	if node == nil {
		return false
	}

	if ast.IsFunctionLike(node) {
		return true
	}
	if ctx.TypeChecker == nil {
		return false
	}

	return len(utils.GetCallSignatures(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(node))) > 0
}

func isCommonJsImport(ctx rule.RuleContext, callExpr *ast.CallExpression, identifier *ast.Identifier) bool {
	return identifier.Text == "require" &&
		len(callExpr.Arguments.Nodes) == 1 &&
		isStringArgument(ctx, callExpr.Arguments.Nodes[0])
}

func isAmdImport(ctx rule.RuleContext, callExpr *ast.CallExpression, identifier *ast.Identifier) bool {
	if identifier.Text != "require" && identifier.Text != "define" {
		return false
	}
	if len(callExpr.Arguments.Nodes) != 2 && len(callExpr.Arguments.Nodes) != 3 {
		return false
	}

	return isFunctionValue(ctx, callExpr.Arguments.Nodes[len(callExpr.Arguments.Nodes)-1])
}

var NoRequireOrDefineRule = rule.Rule{
	Name: "no-require-or-define",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				callee := ast.SkipParentheses(callExpr.Expression)
				if callee == nil || !ast.IsIdentifier(callee) || !isTopLevelCallExpression(node) {
					return
				}

				identifier := callee.AsIdentifier()
				if isCommonJsImport(ctx, callExpr, identifier) || isAmdImport(ctx, callExpr, identifier) {
					ctx.ReportNode(callee, buildStandardImportMessage(identifier.Text))
				}
			},
		}
	},
}
