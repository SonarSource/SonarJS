package s3796_array_callback_without_return

import (
	"regexp"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const arrayCallbackWithoutReturnMessageID = "arrayCallbackWithoutReturn"

var (
	arrayCallbackMethods = map[string]struct{}{
		"every":         {},
		"filter":        {},
		"find":          {},
		"findLast":      {},
		"findIndex":     {},
		"findLastIndex": {},
		"map":           {},
		"flatMap":       {},
		"reduce":        {},
		"reduceRight":   {},
		"some":          {},
		"sort":          {},
		"toSorted":      {},
	}
	typedArrayPattern = regexp.MustCompile(`^(?:Int|Uint|Float|BigInt|BigUint)\d*Array(?:<[^>]*>)?$|^Uint8ClampedArray(?:<[^>]*>)?$`)
)

func buildArrayCallbackWithoutReturnMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          arrayCallbackWithoutReturnMessageID,
		Description: `Add a "return" statement to this callback.`,
	}
}

func staticMemberName(node *ast.Node) (string, bool) {
	node = ast.SkipParentheses(node)
	switch {
	case node == nil:
		return "", false
	case ast.IsPropertyAccessExpression(node):
		name := node.AsPropertyAccessExpression().Name()
		if name == nil {
			return "", false
		}
		return name.Text(), true
	case ast.IsElementAccessExpression(node):
		argument := ast.SkipParentheses(node.AsElementAccessExpression().ArgumentExpression)
		if ast.IsStringLiteral(argument) || argument.Kind == ast.KindNoSubstitutionTemplateLiteral {
			return argument.Text(), true
		}
	}
	return "", false
}

func accessReceiver(node *ast.Node) *ast.Node {
	switch {
	case ast.IsPropertyAccessExpression(node):
		return node.AsPropertyAccessExpression().Expression
	case ast.IsElementAccessExpression(node):
		return node.AsElementAccessExpression().Expression
	default:
		return nil
	}
}

func isArrayLikeReceiver(typeChecker *checker.Checker, node *ast.Node) bool {
	if node == nil {
		return false
	}

	t := checker.Checker_getApparentType(typeChecker, typeChecker.GetTypeAtLocation(ast.SkipParentheses(node)))
	if t == nil {
		return false
	}

	if checker.Checker_isArrayOrTupleType(typeChecker, t) {
		return true
	}

	symbol := checker.Type_symbol(t)
	if symbol != nil && typedArrayPattern.MatchString(symbol.Name) {
		return true
	}

	return typedArrayPattern.MatchString(typeChecker.TypeToString(t))
}

func callbackWithoutReturn(typeChecker *checker.Checker, node *ast.Node) bool {
	if node == nil {
		return false
	}

	t := typeChecker.GetTypeAtLocation(ast.SkipParentheses(node))
	signatures := utils.GetCallSignatures(typeChecker, t)
	if len(signatures) == 0 {
		return false
	}

	for _, signature := range signatures {
		if typeChecker.TypeToString(checker.Checker_getReturnTypeOfSignature(typeChecker, signature)) != "void" {
			return false
		}
	}

	return true
}

func diagnosticRangeForCallback(ctx rule.RuleContext, callback *ast.Node) rule.RuleDiagnostic {
	if callback != nil && ast.IsFunctionLike(callback) {
		return rule.RuleDiagnostic{
			Range:   utils.GetFunctionHeadLoc(ctx.SourceFile, callback),
			Message: buildArrayCallbackWithoutReturnMessage(),
		}
	}

	return rule.RuleDiagnostic{
		Range:   utils.TrimNodeTextRange(ctx.SourceFile, callback),
		Message: buildArrayCallbackWithoutReturnMessage(),
	}
}

func isStaticArrayFromCall(callExpr *ast.CallExpression) bool {
	expr := ast.SkipParentheses(callExpr.Expression)
	if !ast.IsPropertyAccessExpression(expr) {
		return false
	}

	propertyAccess := expr.AsPropertyAccessExpression()
	object := ast.SkipParentheses(propertyAccess.Expression)
	name := propertyAccess.Name()
	return object != nil &&
		name != nil &&
		ast.IsIdentifier(object) &&
		object.AsIdentifier().Text == "Array" &&
		name.Text() == "from"
}

var ArrayCallbackWithoutReturnRule = rule.Rule{
	Name: "array-callback-without-return",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				args := callExpr.Arguments.Nodes

				if isStaticArrayFromCall(callExpr) {
					if len(args) > 1 && callbackWithoutReturn(ctx.TypeChecker, args[1]) {
						ctx.ReportDiagnostic(diagnosticRangeForCallback(ctx, args[1]))
					}
					return
				}

				methodName, ok := staticMemberName(callExpr.Expression)
				if !ok {
					return
				}
				if _, ok := arrayCallbackMethods[methodName]; !ok || len(args) == 0 {
					return
				}

				receiver := accessReceiver(callExpr.Expression)
				if !isArrayLikeReceiver(ctx.TypeChecker, receiver) || !callbackWithoutReturn(ctx.TypeChecker, args[0]) {
					return
				}

				ctx.ReportDiagnostic(diagnosticRangeForCallback(ctx, args[0]))
			},
		}
	},
}
