package no_confusing_non_null_assertion

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func operatorText(kind ast.Kind) string {
	switch kind {
	case ast.KindEqualsToken:
		return "="
	case ast.KindEqualsEqualsToken:
		return "=="
	case ast.KindEqualsEqualsEqualsToken:
		return "==="
	case ast.KindInKeyword:
		return "in"
	case ast.KindInstanceOfKeyword:
		return "instanceof"
	default:
		return ""
	}
}

func buildConfusingMessage(kind ast.Kind) rule.RuleMessage {
	switch kind {
	case ast.KindEqualsToken:
		return rule.RuleMessage{
			Id:          "confusingAssign",
			Description: "Confusing combination of non-null assertion and assignment like `a! = b`, which looks very similar to `a != b`.",
		}
	case ast.KindEqualsEqualsToken, ast.KindEqualsEqualsEqualsToken:
		return rule.RuleMessage{
			Id:          "confusingEqual",
			Description: "Confusing combination of non-null assertion and equality test like `a! == b`, which looks very similar to `a !== b`.",
		}
	case ast.KindInKeyword, ast.KindInstanceOfKeyword:
		operator := operatorText(kind)
		return rule.RuleMessage{
			Id:          "confusingOperator",
			Description: fmt.Sprintf("Confusing combination of non-null assertion and `%s` operator like `a! %s b`, which might be misinterpreted as `!(a %s b)`.", operator, operator, operator),
		}
	default:
		panic("unexpected operator")
	}
}

func endsWithNonNullAssertion(sourceFile *ast.SourceFile, node *ast.Node) bool {
	trimmed := utils.TrimNodeTextRange(sourceFile, node)
	if trimmed.End() <= trimmed.Pos() {
		return false
	}

	lastToken := scanner.GetRangeOfTokenAtPosition(sourceFile, trimmed.End()-1)
	return sourceFile.Text()[lastToken.Pos():lastToken.End()] == "!"
}

func nextTokenIsCloseParen(sourceFile *ast.SourceFile, node *ast.Node) bool {
	trimmed := utils.TrimNodeTextRange(sourceFile, node)
	if trimmed.End() >= len(sourceFile.Text()) {
		return false
	}

	return scanner.GetScannerForSourceFile(sourceFile, trimmed.End()).Token() == ast.KindCloseParenToken
}

var NoConfusingNonNullAssertionRule = rule.Rule{
	Name: "no-confusing-non-null-assertion",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				expr := node.AsBinaryExpression()
				switch expr.OperatorToken.Kind {
				case ast.KindEqualsToken, ast.KindEqualsEqualsToken, ast.KindEqualsEqualsEqualsToken, ast.KindInKeyword, ast.KindInstanceOfKeyword:
				default:
					return
				}

				if !endsWithNonNullAssertion(ctx.SourceFile, expr.Left) {
					return
				}
				if nextTokenIsCloseParen(ctx.SourceFile, expr.Left) {
					return
				}

				ctx.ReportNode(node, buildConfusingMessage(expr.OperatorToken.Kind))
			},
		}
	},
}
