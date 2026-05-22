package s3800_function_return_type

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const functionReturnTypeMessageID = "functionReturnType"

type functionReturnScope struct {
	returnStatements []*ast.Node
}

func buildFunctionReturnTypeMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          functionReturnTypeMessageID,
		Description: "Refactor this function to always return the same type.",
	}
}

func buildReturnSecondaryLabel(category string) string {
	return "Returns " + category
}

func isAnalyzedFunctionLike(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindFunctionDeclaration,
		ast.KindFunctionExpression,
		ast.KindArrowFunction,
		ast.KindMethodDeclaration,
		ast.KindGetAccessor,
		ast.KindSetAccessor:
		return true
	default:
		return false
	}
}

func isNullLikeType(t *checker.Type) bool {
	return t != nil && checker.Type_flags(t)&(checker.TypeFlagsNull|checker.TypeFlagsVoid|checker.TypeFlagsUndefined) != 0
}

func isStringType(t *checker.Type) bool {
	return t != nil && checker.Type_flags(t)&checker.TypeFlagsStringLike != 0
}

func isTrueBooleanLiteral(t *checker.Type) bool {
	return utils.IsTrueLiteralType(t)
}

func isSanitizationFunction(typeChecker *checker.Checker, signature *checker.Signature) bool {
	if signature == nil {
		return false
	}

	returnType := checker.Checker_getReturnTypeOfSignature(typeChecker, signature)
	if !utils.IsUnionType(returnType) {
		return false
	}

	parts := returnType.Types()
	return len(parts) == 2 &&
		((isTrueBooleanLiteral(parts[0]) && isStringType(parts[1])) || (isTrueBooleanLiteral(parts[1]) && isStringType(parts[0])))
}

func distinctStrings(values []string) []string {
	var result []string
	for _, value := range values {
		if !slicesContainsString(result, value) {
			result = append(result, value)
		}
	}
	return result
}

func slicesContainsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func typeCategory(typeChecker *checker.Checker, t *checker.Type) string {
	if t == nil {
		return ""
	}

	if utils.IsUnionType(t) || utils.IsIntersectionType(t) {
		delimiter := " | "
		if utils.IsIntersectionType(t) {
			delimiter = " & "
		}

		parts := make([]string, 0, len(t.Types()))
		for _, part := range t.Types() {
			parts = append(parts, typeCategory(typeChecker, part))
		}
		return strings.Join(distinctStrings(parts), delimiter)
	}

	baseType := checker.Checker_getBaseTypeOfLiteralType(typeChecker, t)
	if baseType != nil {
		t = baseType
	}

	if len(utils.GetCallSignatures(typeChecker, t)) > 0 {
		return "function"
	}
	if checker.Checker_isArrayOrTupleType(typeChecker, t) || isTypedArrayType(typeChecker, t) {
		return "array"
	}
	if utils.IsObjectType(t) {
		return "object"
	}

	return typeChecker.TypeToString(t)
}

func isTypedArrayType(typeChecker *checker.Checker, t *checker.Type) bool {
	if t == nil {
		return false
	}

	typeText := typeChecker.TypeToString(t)
	return strings.HasSuffix(typeText, "Array") || strings.Contains(typeText, "Array<")
}

func isMixingTypes(typeChecker *checker.Checker, t *checker.Type) bool {
	if !utils.IsUnionType(t) {
		return false
	}

	var categories []string
	for _, part := range t.Types() {
		if isNullLikeType(part) {
			continue
		}
		categories = append(categories, typeCategory(typeChecker, part))
	}

	return len(distinctStrings(categories)) > 1
}

func hasReturnTypeJSDoc(sourceFile *ast.SourceFile, node *ast.Node) bool {
	if sourceFile == nil || node == nil {
		return false
	}

	nodeFactory := ast.NewNodeFactory(ast.NodeFactoryHooks{})
	for commentRange := range scanner.GetLeadingCommentRanges(nodeFactory, sourceFile.Text(), node.Pos()) {
		commentText := sourceFile.Text()[commentRange.Pos():commentRange.End()]
		if strings.Contains(commentText, "@return") || strings.Contains(commentText, "@returns") {
			return true
		}
	}

	return false
}

func functionSignature(typeChecker *checker.Checker, node *ast.Node) *checker.Signature {
	if typeChecker == nil || node == nil {
		return nil
	}

	functionType := typeChecker.GetTypeAtLocation(node)
	signatures := utils.GetCallSignatures(typeChecker, functionType)
	if len(signatures) == 0 {
		return nil
	}

	return signatures[0]
}

func hasMultipleReturnTypes(ctx rule.RuleContext, node *ast.Node, signature *checker.Signature) bool {
	if signature == nil {
		return false
	}

	returnType := checker.Checker_getReturnTypeOfSignature(ctx.TypeChecker, signature)
	baseType := checker.Checker_getBaseTypeOfLiteralType(ctx.TypeChecker, returnType)
	if baseType != nil {
		returnType = baseType
	}

	return isMixingTypes(ctx.TypeChecker, returnType) && !hasReturnTypeJSDoc(ctx.SourceFile, node)
}

func diagnosticForFunction(ctx rule.RuleContext, node *ast.Node, labeledRanges []rule.RuleLabeledRange) rule.RuleDiagnostic {
	return rule.RuleDiagnostic{
		Range:         functionMainTokenRange(ctx.SourceFile, node),
		Message:       buildFunctionReturnTypeMessage(),
		LabeledRanges: labeledRanges,
	}
}

func returnRange(sourceFile *ast.SourceFile, stmt *ast.Node) core.TextRange {
	return utils.TrimNodeTextRange(sourceFile, stmt)
}

func functionMainTokenRange(sourceFile *ast.SourceFile, node *ast.Node) core.TextRange {
	switch {
	case ast.IsArrowFunction(node):
		if arrow := node.AsArrowFunction().EqualsGreaterThanToken; arrow != nil {
			return scanner.GetRangeOfTokenAtPosition(sourceFile, arrow.Pos())
		}
	case ast.IsFunctionDeclaration(node):
		if name := node.AsFunctionDeclaration().Name(); name != nil {
			return utils.TrimNodeTextRange(sourceFile, name)
		}
	case ast.IsMethodDeclaration(node), node.Kind == ast.KindGetAccessor, node.Kind == ast.KindSetAccessor:
		if name := node.Name(); name != nil {
			return utils.TrimNodeTextRange(sourceFile, name)
		}
	case ast.IsFunctionExpression(node):
		parent := node.Parent
		if parent != nil {
			switch {
			case ast.IsMethodDeclaration(parent), ast.IsPropertyAssignment(parent):
				if name := parent.Name(); name != nil {
					return utils.TrimNodeTextRange(sourceFile, name)
				}
			}
		}
	}

	start := scanner.GetTokenPosOfNode(node, sourceFile, false)
	if params := node.ParameterList(); params != nil {
		prefix := sourceFile.Text()[start:params.Loc.Pos()]
		if functionIdx := strings.LastIndex(prefix, "function"); functionIdx >= 0 {
			pos := start + functionIdx
			return core.NewTextRange(pos, pos+len("function"))
		}
	}
	return scanner.GetRangeOfTokenAtPosition(sourceFile, start)
}

var FunctionReturnTypeRule = rule.Rule{
	Name: "function-return-type",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		var scopes []functionReturnScope

		enter := func() {
			scopes = append(scopes, functionReturnScope{})
		}
		exit := func(node *ast.Node) {
			if len(scopes) == 0 {
				return
			}

			currentScope := scopes[len(scopes)-1]
			scopes = scopes[:len(scopes)-1]

			for _, stmtNode := range currentScope.returnStatements {
				stmt := stmtNode.AsReturnStatement()
				if stmt.Expression != nil && stmt.Expression.Kind == ast.KindThisKeyword {
					return
				}
			}

			signature := functionSignature(ctx.TypeChecker, node)
			if signature == nil || !hasMultipleReturnTypes(ctx, node, signature) || isSanitizationFunction(ctx.TypeChecker, signature) {
				return
			}

			var (
				categories    []string
				labeledRanges []rule.RuleLabeledRange
			)
			for _, stmtNode := range currentScope.returnStatements {
				stmt := stmtNode.AsReturnStatement()
				if stmt.Expression == nil {
					continue
				}

				returnType := ctx.TypeChecker.GetTypeAtLocation(stmt.Expression)
				if isNullLikeType(returnType) || utils.IsTypeAnyType(returnType) {
					continue
				}

				category := typeCategory(ctx.TypeChecker, returnType)
				categories = append(categories, category)
				labeledRanges = append(labeledRanges, rule.RuleLabeledRange{
					Label: buildReturnSecondaryLabel(category),
					Range: returnRange(ctx.SourceFile, stmtNode),
				})
			}

			if len(distinctStrings(categories)) <= 1 {
				return
			}

			ctx.ReportDiagnostic(diagnosticForFunction(ctx, node, labeledRanges))
		}

		listeners := rule.RuleListeners{
			ast.KindReturnStatement: func(node *ast.Node) {
				if len(scopes) == 0 {
					return
				}

				stmt := node.AsReturnStatement()
				if stmt.Expression == nil {
					return
				}

				scopes[len(scopes)-1].returnStatements = append(scopes[len(scopes)-1].returnStatements, node)
			},
			ast.KindFunctionDeclaration:                      func(_ *ast.Node) { enter() },
			rule.ListenerOnExit(ast.KindFunctionDeclaration): func(node *ast.Node) { exit(node) },
			ast.KindFunctionExpression:                       func(_ *ast.Node) { enter() },
			rule.ListenerOnExit(ast.KindFunctionExpression):  func(node *ast.Node) { exit(node) },
			ast.KindArrowFunction:                            func(_ *ast.Node) { enter() },
			rule.ListenerOnExit(ast.KindArrowFunction):       func(node *ast.Node) { exit(node) },
			ast.KindMethodDeclaration:                        func(_ *ast.Node) { enter() },
			rule.ListenerOnExit(ast.KindMethodDeclaration):   func(node *ast.Node) { exit(node) },
			ast.KindGetAccessor:                              func(_ *ast.Node) { enter() },
			rule.ListenerOnExit(ast.KindGetAccessor):         func(node *ast.Node) { exit(node) },
			ast.KindSetAccessor:                              func(_ *ast.Node) { enter() },
			rule.ListenerOnExit(ast.KindSetAccessor):         func(node *ast.Node) { exit(node) },
		}

		_ = isAnalyzedFunctionLike
		return listeners
	},
}
