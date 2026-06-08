package s4822_no_try_promise

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const (
	wrongCatchMessageID   = "wrongCatch"
	uselessCatchMessageID = "uselessCatch"
)

func buildWrongCatchMessage(count int) rule.RuleMessage {
	ending := ""
	if count > 1 {
		ending = "s"
	}

	return rule.RuleMessage{
		Id:          wrongCatchMessageID,
		Description: fmt.Sprintf("Consider using 'await' for the promise%s inside this 'try' or replace it with 'Promise.prototype.catch(...)' usage%s.", ending, ending),
	}
}

func buildUselessCatchMessage(count int) rule.RuleMessage {
	ending := ""
	if count > 1 {
		ending = "s"
	}

	return rule.RuleMessage{
		Id:          uselessCatchMessageID,
		Description: fmt.Sprintf("Consider removing this 'try' statement as promise%s rejection is already captured by '.catch()' method.", ending),
	}
}

func isCallLikeExpression(node *ast.Node) bool {
	return node != nil && (ast.IsAwaitExpression(node) || ast.IsCallExpression(node) || ast.IsNewExpression(node))
}

func collectCallLikeExpressions(root *ast.Node) []*ast.Node {
	if root == nil {
		return nil
	}

	var callLikeExpressions []*ast.Node
	var visit func(node *ast.Node)
	visit = func(node *ast.Node) {
		if node == nil {
			return
		}
		if node != root && ast.IsFunctionLike(node) {
			return
		}
		if isCallLikeExpression(node) {
			callLikeExpressions = append(callLikeExpressions, node)
		}
		node.ForEachChild(func(child *ast.Node) bool {
			visit(child)
			return false
		})
	}
	visit(root)
	return callLikeExpressions
}

func isAwaitLike(node *ast.Node) bool {
	parent := node.Parent
	return parent != nil && (ast.IsAwaitExpression(parent) || ast.IsYieldExpression(parent))
}

func propertyAccessName(node *ast.Node) string {
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return ""
	}
	name := node.AsPropertyAccessExpression().Name()
	if name == nil {
		return ""
	}
	return name.Text()
}

func isThened(node *ast.Node) bool {
	return propertyAccessName(node.Parent) == "then"
}

func isCaught(node *ast.Node) bool {
	return propertyAccessName(node.Parent) == "catch"
}

func isCatch(node *ast.Node) bool {
	if node == nil || !ast.IsCallExpression(node) {
		return false
	}
	return propertyAccessName(node.Expression()) == "catch"
}

func trimmedRange(sourceFile *ast.SourceFile, node *ast.Node, label string) rule.RuleLabeledRange {
	return rule.RuleLabeledRange{
		Label: label,
		Range: utils.TrimNodeTextRange(sourceFile, node),
	}
}

func reportTryStatement(ctx rule.RuleContext, node *ast.Node, message rule.RuleMessage, secondaries []rule.RuleLabeledRange) {
	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:         scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, node.Pos()),
		Message:       message,
		LabeledRanges: secondaries,
	})
}

func visitTryStatement(ctx rule.RuleContext, node *ast.Node) {
	tryStatement := node.AsTryStatement()
	if tryStatement.CatchClause == nil {
		return
	}

	var openPromises []*ast.Node
	var capturedPromises []*ast.Node
	hasPotentiallyThrowingCalls := false

	for _, callLikeExpression := range collectCallLikeExpressions(tryStatement.TryBlock) {
		if ast.IsAwaitExpression(callLikeExpression) || !utils.IsThenableType(ctx.TypeChecker, callLikeExpression, nil) {
			hasPotentiallyThrowingCalls = true
			continue
		}

		if isAwaitLike(callLikeExpression) || isThened(callLikeExpression) || isCatch(callLikeExpression) {
			continue
		}

		if isCaught(callLikeExpression) {
			capturedPromises = append(capturedPromises, callLikeExpression)
		} else {
			openPromises = append(openPromises, callLikeExpression)
		}
	}

	if hasPotentiallyThrowingCalls {
		return
	}

	if len(openPromises) > 0 {
		secondaries := make([]rule.RuleLabeledRange, 0, len(openPromises))
		for _, promise := range openPromises {
			secondaries = append(secondaries, trimmedRange(ctx.SourceFile, promise, "Promise"))
		}
		reportTryStatement(ctx, node, buildWrongCatchMessage(len(openPromises)), secondaries)
		return
	}

	if len(capturedPromises) > 0 {
		secondaries := make([]rule.RuleLabeledRange, 0, len(capturedPromises))
		for _, promise := range capturedPromises {
			secondaries = append(secondaries, trimmedRange(ctx.SourceFile, promise, "Caught promise"))
		}
		reportTryStatement(ctx, node, buildUselessCatchMessage(len(capturedPromises)), secondaries)
	}
}

var NoTryPromiseRule = rule.Rule{
	Name: "no-try-promise",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil || ctx.SourceFile == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindTryStatement: func(node *ast.Node) {
				visitTryStatement(ctx, node)
			},
		}
	},
}
