package s4782_no_redundant_optional

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

const redundantOptionalMessageID = "redundantOptional"

func buildRedundantOptionalMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          redundantOptionalMessageID,
		Description: "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
	}
}

func questionToken(node *ast.Node) *ast.Node {
	token := node.PostfixToken()
	if token != nil && token.Kind == ast.KindQuestionToken {
		return token
	}
	return nil
}

func getUndefinedTypeNode(node *ast.Node) *ast.Node {
	if node == nil {
		return nil
	}

	switch node.Kind {
	case ast.KindUndefinedKeyword:
		return node
	case ast.KindParenthesizedType:
		return getUndefinedTypeNode(node.AsParenthesizedTypeNode().Type)
	case ast.KindUnionType:
		for _, typeNode := range node.AsUnionTypeNode().Types.Nodes {
			if undefinedType := getUndefinedTypeNode(typeNode); undefinedType != nil {
				return undefinedType
			}
		}
	}

	return nil
}

func checkProperty(ctx rule.RuleContext, node *ast.Node) {
	if node == nil || ctx.SourceFile == nil {
		return
	}

	optionalToken := questionToken(node)
	typeNode := node.Type()
	if optionalToken == nil || typeNode == nil {
		return
	}

	undefinedType := getUndefinedTypeNode(typeNode)
	if undefinedType == nil {
		return
	}

	ctx.ReportDiagnostic(rule.RuleDiagnostic{
		Range:   scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, optionalToken.Pos()),
		Message: buildRedundantOptionalMessage(),
		LabeledRanges: []rule.RuleLabeledRange{{
			Range: utils.TrimNodeTextRange(ctx.SourceFile, undefinedType),
		}},
	})
}

var NoRedundantOptionalRule = rule.Rule{
	Name: "no-redundant-optional",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.Program == nil || ctx.SourceFile == nil {
			return nil
		}
		if ctx.Program.Options().ExactOptionalPropertyTypes.IsTrue() {
			return nil
		}

		return rule.RuleListeners{
			ast.KindPropertyDeclaration: func(node *ast.Node) {
				checkProperty(ctx, node)
			},
			ast.KindPropertySignature: func(node *ast.Node) {
				checkProperty(ctx, node)
			},
		}
	},
}
