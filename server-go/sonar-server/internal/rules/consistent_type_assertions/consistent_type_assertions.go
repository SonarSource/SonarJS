package consistent_type_assertions

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildIncorrectAssertionTypeMessage(assertionStyle string, cast string) rule.RuleMessage {
	switch assertionStyle {
	case "angle-bracket":
		return rule.RuleMessage{
			Id:          "angle-bracket",
			Description: fmt.Sprintf("Use '<%s>' instead of 'as %s'.", cast, cast),
		}
	case "never":
		return rule.RuleMessage{
			Id:          "never",
			Description: "Do not use any type assertions.",
		}
	default:
		return rule.RuleMessage{
			Id:          "as",
			Description: fmt.Sprintf("Use 'as %s' instead of '<%s>'.", cast, cast),
		}
	}
}

func buildUnexpectedArrayTypeAssertionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpectedArrayTypeAssertion",
		Description: "Always prefer const x: T[] = [ ... ].",
	}
}

func buildUnexpectedObjectTypeAssertionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unexpectedObjectTypeAssertion",
		Description: "Always prefer const x: T = { ... }.",
	}
}

func isConstTypeAssertion(typeNode *ast.Node) bool {
	if !ast.IsTypeReferenceNode(typeNode) {
		return false
	}

	typeName := typeNode.AsTypeReferenceNode().TypeName
	return ast.IsIdentifier(typeName) && typeName.AsIdentifier().Text == "const"
}

func shouldCheckLiteralAssertionType(typeNode *ast.Node) bool {
	switch typeNode.Kind {
	case ast.KindAnyKeyword, ast.KindUnknownKeyword:
		return false
	case ast.KindTypeReference:
		typeName := typeNode.AsTypeReferenceNode().TypeName
		return !isConstTypeAssertion(typeNode) || ast.IsQualifiedName(typeName)
	default:
		return true
	}
}

func isAllowedAsParameter(node *ast.Node) bool {
	parent := node.Parent
	if parent == nil {
		return false
	}

	switch parent.Kind {
	case ast.KindCallExpression, ast.KindJsxExpression, ast.KindNewExpression, ast.KindThrowStatement:
		return true
	case ast.KindParameter:
		return ast.IsParameterDeclaration(parent) && parent.AsParameterDeclaration().Initializer == node
	case ast.KindTemplateSpan:
		return parent.Parent != nil &&
			parent.Parent.Parent != nil &&
			parent.Parent.Parent.Kind == ast.KindTaggedTemplateExpression
	default:
		return false
	}
}

func reportIncorrectAssertionType(ctx rule.RuleContext, node *ast.Node, assertionStyle string) {
	typeNode := node.Type()
	if assertionStyle == "never" && isConstTypeAssertion(typeNode) {
		return
	}

	cast := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, typeNode, false)
	ctx.ReportNode(node, buildIncorrectAssertionTypeMessage(assertionStyle, cast))
}

func checkExpressionForObjectAssertion(ctx rule.RuleContext, node *ast.Node, opts ConsistentTypeAssertionsOptions) {
	if opts.AssertionStyle == "never" ||
		opts.ObjectLiteralTypeAssertions == "allow" ||
		node.Expression().Kind != ast.KindObjectLiteralExpression {
		return
	}
	if opts.ObjectLiteralTypeAssertions == "allow-as-parameter" && isAllowedAsParameter(node) {
		return
	}
	if shouldCheckLiteralAssertionType(node.Type()) {
		ctx.ReportNode(node, buildUnexpectedObjectTypeAssertionMessage())
	}
}

func checkExpressionForArrayAssertion(ctx rule.RuleContext, node *ast.Node, opts ConsistentTypeAssertionsOptions) {
	if opts.AssertionStyle == "never" ||
		opts.ArrayLiteralTypeAssertions == "allow" ||
		node.Expression().Kind != ast.KindArrayLiteralExpression {
		return
	}
	if opts.ArrayLiteralTypeAssertions == "allow-as-parameter" && isAllowedAsParameter(node) {
		return
	}
	if shouldCheckLiteralAssertionType(node.Type()) {
		ctx.ReportNode(node, buildUnexpectedArrayTypeAssertionMessage())
	}
}

func checkAssertion(ctx rule.RuleContext, node *ast.Node, expectedStyle string, opts ConsistentTypeAssertionsOptions) {
	if opts.AssertionStyle != expectedStyle {
		reportIncorrectAssertionType(ctx, node, opts.AssertionStyle)
		return
	}

	checkExpressionForObjectAssertion(ctx, node, opts)
	checkExpressionForArrayAssertion(ctx, node, opts)
}

var ConsistentTypeAssertionsRule = rule.Rule{
	Name: "consistent-type-assertions",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		opts := utils.UnmarshalOptions[ConsistentTypeAssertionsOptions](options, "consistent-type-assertions")

		return rule.RuleListeners{
			ast.KindAsExpression: func(node *ast.Node) {
				checkAssertion(ctx, node, "as", opts)
			},
			ast.KindTypeAssertionExpression: func(node *ast.Node) {
				checkAssertion(ctx, node, "angle-bracket", opts)
			},
		}
	},
}
