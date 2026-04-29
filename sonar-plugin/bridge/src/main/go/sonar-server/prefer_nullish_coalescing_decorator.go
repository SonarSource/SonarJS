package main

import (
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

const allowNoStrictNullChecksOption = "allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing"

var PreferNullishCoalescingDecorator = RuleDecorator{
	Bind: func(ctx rule.RuleContext, options any) RuleDecorator {
		allowNoStrictNullChecks := boolOptionValue(options, allowNoStrictNullChecksOption, true)
		return RuleDecorator{
			FilterDiagnostic: func(ctx rule.RuleContext, diagnostic rule.RuleDiagnostic) bool {
				return diagnostic.Message.Id != "noStrictNullCheck" || !allowNoStrictNullChecks
			},
			FilterNodeDiagnostic: func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
				if diagnostic.Message.Id != "preferNullishOverOr" || ctx.TypeChecker == nil || node == nil {
					return true
				}

				expression := enclosingLogicalExpression(node)
				if expression == nil {
					return true
				}

				leftOperandType := ctx.TypeChecker.GetTypeAtLocation(expression.Left)
				return !shouldSuppressPreferNullishOverOr(leftOperandType)
			},
		}
	},
}

func enclosingLogicalExpression(node *ast.Node) *ast.BinaryExpression {
	if ast.IsBinaryExpression(node) && ast.IsLogicalExpression(node) {
		return node.AsBinaryExpression()
	}

	parent := node.Parent
	if parent != nil && ast.IsBinaryExpression(parent) && ast.IsLogicalExpression(parent) && parent.AsBinaryExpression().OperatorToken == node {
		return parent.AsBinaryExpression()
	}
	return nil
}

func shouldSuppressPreferNullishOverOr(t *checker.Type) bool {
	if utils.IsTypeAnyType(t) || utils.IsTypeUnknownType(t) {
		return true
	}

	hasNullish := false
	hasObject := false
	for _, constituent := range utils.UnionTypeParts(t) {
		hasNullish = hasNullish || utils.IsTypeNullType(constituent) || utils.IsTypeUndefinedType(constituent)
		hasObject = hasObject || utils.IsObjectType(constituent)
	}
	return hasNullish && hasObject
}
