package s4335_no_useless_intersection

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const (
	removeIntersectionMessageID   = "removeIntersection"
	simplifyIntersectionMessageID = "simplifyIntersection"
)

func buildRemoveIntersectionMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          removeIntersectionMessageID,
		Description: "Remove this type without members or change this type intersection.",
	}
}

func buildSimplifyIntersectionMessage(typeName string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          simplifyIntersectionMessageID,
		Description: fmt.Sprintf("Simplify this intersection as it always has type %q.", typeName),
	}
}

func isNullLikeType(t *checker.Type) bool {
	return utils.IsTypeNullType(t) || utils.IsTypeUndefinedType(t) || utils.IsTypeVoidType(t)
}

func isEmptyInterface(typeChecker *checker.Checker, t *checker.Type) bool {
	return len(checker.Checker_getPropertiesOfType(typeChecker, t)) == 0 && len(typeChecker.GetIndexInfosOfType(t)) == 0
}

func isStandaloneInterface(symbol *ast.Symbol) bool {
	if symbol == nil {
		return false
	}

	declarations := symbol.Declarations
	if len(declarations) == 0 {
		return true
	}

	for _, declaration := range declarations {
		if declaration == nil || !ast.IsInterfaceDeclaration(declaration) {
			return false
		}
		if heritageClauses := utils.GetHeritageClauses(declaration); heritageClauses != nil && len(heritageClauses.Nodes) != 0 {
			return false
		}
	}

	return true
}

func isTypeWithoutMembers(typeChecker *checker.Checker, t *checker.Type) bool {
	return isNullLikeType(t) || (isEmptyInterface(typeChecker, t) && isStandaloneInterface(checker.Type_symbol(t)))
}

func isEmptyTypeLiteral(node *ast.Node) bool {
	return ast.IsTypeLiteralNode(node) && len(node.AsTypeLiteralNode().Members.Nodes) == 0
}

func isLiteralUnionPattern(node *ast.IntersectionTypeNode) bool {
	if node == nil || len(node.Types.Nodes) != 2 {
		return false
	}

	parent := node.Parent
	for parent != nil && ast.IsParenthesizedTypeNode(parent) {
		parent = parent.Parent
	}
	if parent == nil || !ast.IsUnionTypeNode(parent) {
		return false
	}

	var otherType *ast.Node
	for _, typeNode := range node.Types.Nodes {
		if !isEmptyTypeLiteral(typeNode) {
			otherType = typeNode
			break
		}
	}
	if otherType == nil {
		return false
	}

	switch otherType.Kind {
	case ast.KindStringKeyword, ast.KindNumberKeyword, ast.KindTypeReference:
		return true
	default:
		return false
	}
}

func isGenericTypePattern(typeChecker *checker.Checker, intersection *ast.IntersectionTypeNode, emptyTypeNode *ast.Node) bool {
	for _, sibling := range intersection.Types.Nodes {
		if sibling == emptyTypeNode {
			continue
		}

		switch sibling.Kind {
		case ast.KindMappedType:
			return true
		case ast.KindTypeReference:
			typeReference := sibling.AsTypeReferenceNode()
			if typeReference.TypeArguments != nil && len(typeReference.TypeArguments.Nodes) != 0 {
				return true
			}
			if utils.IsTypeParameter(typeChecker.GetTypeAtLocation(sibling)) {
				return true
			}
		}
	}

	return false
}

var NoUselessIntersectionRule = rule.Rule{
	Name: "no-useless-intersection",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindIntersectionType: func(node *ast.Node) {
				intersection := node.AsIntersectionTypeNode()

				for _, typeNode := range intersection.Types.Nodes {
					switch typeNode.Kind {
					case ast.KindAnyKeyword:
						ctx.ReportNode(node, buildSimplifyIntersectionMessage("any"))
						return
					case ast.KindNeverKeyword:
						ctx.ReportNode(node, buildSimplifyIntersectionMessage("never"))
						return
					}
				}

				for _, typeNode := range intersection.Types.Nodes {
					if !isTypeWithoutMembers(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(typeNode)) {
						continue
					}
					if isLiteralUnionPattern(intersection) {
						continue
					}
					if isGenericTypePattern(ctx.TypeChecker, intersection, typeNode) {
						continue
					}

					ctx.ReportNode(typeNode, buildRemoveIntersectionMessage())
				}
			},
		}
	},
}
