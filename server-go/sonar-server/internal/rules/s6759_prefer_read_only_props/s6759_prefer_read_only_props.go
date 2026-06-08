package s6759_prefer_read_only_props

import (
	"fmt"
	"strings"
	"unicode"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

const (
	readOnlyPropsMessageID    = "readOnlyProps"
	readOnlyPropsFixMessageID = "readOnlyPropsFix"
)

type functionInfo struct {
	node    *ast.Node
	returns []*ast.ReturnStatement
}

func buildReadOnlyPropsMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          readOnlyPropsMessageID,
		Description: "Mark the props of the component as read-only.",
	}
}

func buildReadOnlyPropsFixMessage() rule.RuleMessage {
	return rule.RuleMessage{
		Id:          readOnlyPropsFixMessageID,
		Description: "Mark the props as read-only",
	}
}

func isJSXValue(node *ast.Node) bool {
	switch {
	case node == nil:
		return false
	case ast.IsParenthesizedExpression(node):
		return isJSXValue(node.AsParenthesizedExpression().Expression)
	default:
		return node.Kind == ast.KindJsxElement ||
			node.Kind == ast.KindJsxSelfClosingElement ||
			node.Kind == ast.KindJsxFragment
	}
}

func isFunctionalComponent(node *ast.Node, info functionInfo) bool {
	if !ast.IsFunctionDeclaration(node) || node.Name() == nil {
		return false
	}

	name := []rune(node.Name().Text())
	if len(name) == 0 || !unicode.IsUpper(name[0]) {
		return false
	}

	parameters := node.Parameters()
	if len(parameters) > 1 {
		return false
	}

	for _, ret := range info.returns {
		if ret != nil && isJSXValue(ret.Expression) {
			return true
		}
	}

	return false
}

func isReadOnlyType(typeChecker *checker.Checker, t *checker.Type) bool {
	if t == nil {
		return true
	}

	if alias := checker.Type_alias(t); alias != nil && alias.Symbol() != nil && alias.Symbol().Name == "Readonly" {
		return true
	}

	if !utils.IsObjectType(t) {
		return true
	}

	properties := checker.Checker_getPropertiesOfType(typeChecker, t)
	if len(properties) == 0 {
		return true
	}

	seen := map[*checker.Type]struct{}{}
	for _, property := range properties {
		if !isPropertyReadonlyIncludingBaseTypes(typeChecker, t, property, seen) {
			return false
		}
	}
	return true
}

func isPropertyReadonlyIncludingBaseTypes(
	typeChecker *checker.Checker,
	t *checker.Type,
	property *ast.Symbol,
	seen map[*checker.Type]struct{},
) bool {
	if property == nil {
		return false
	}
	if checker.Checker_isReadonlySymbol(typeChecker, property) {
		return true
	}

	if property.Flags&ast.SymbolFlagsTransient == 0 || !utils.IsObjectType(t) {
		return false
	}

	target := t
	if checker.Type_objectFlags(t)&checker.ObjectFlagsReference != 0 {
		target = t.Target()
	}
	if target == nil || checker.Type_objectFlags(target)&checker.ObjectFlagsClassOrInterface == 0 {
		return false
	}
	if _, ok := seen[target]; ok {
		return false
	}
	seen[target] = struct{}{}
	defer delete(seen, target)

	for _, baseType := range checker.Checker_getBaseTypes(typeChecker, target) {
		baseProperty := checker.Checker_getPropertyOfType(typeChecker, baseType, property.Name)
		if baseProperty != nil && isPropertyReadonlyIncludingBaseTypes(typeChecker, baseType, baseProperty, seen) {
			return true
		}
	}

	return false
}

var PreferReadOnlyPropsRule = rule.Rule{
	Name: "prefer-read-only-props",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil || ctx.Program == nil {
			return nil
		}

		functions := make([]functionInfo, 0, 8)

		enter := func(node *ast.Node) {
			functions = append(functions, functionInfo{node: node, returns: []*ast.ReturnStatement{}})
		}

		exit := func(node *ast.Node) {
			if len(functions) == 0 {
				return
			}

			info := functions[len(functions)-1]
			functions = functions[:len(functions)-1]
			if info.node != node || !isFunctionalComponent(node, info) {
				return
			}

			parameters := node.Parameters()
			if len(parameters) == 0 {
				return
			}

			props := parameters[0]
			if props == nil || props.AsParameterDeclaration().Type == nil {
				return
			}

			typeNode := props.AsParameterDeclaration().Type
			propsType := checker.Checker_getTypeFromTypeNode(ctx.TypeChecker, typeNode)
			if isReadOnlyType(ctx.TypeChecker, propsType) {
				return
			}

			oldText := strings.TrimSpace(ctx.SourceFile.Text()[typeNode.Pos():typeNode.End()])
			ctx.ReportNodeWithSuggestions(props, buildReadOnlyPropsMessage(), func() []rule.RuleSuggestion {
				return []rule.RuleSuggestion{{
					Message: buildReadOnlyPropsFixMessage(),
					FixesArr: []rule.RuleFix{
						rule.RuleFixReplace(ctx.SourceFile, typeNode, fmt.Sprintf("Readonly<%s>", oldText)),
					},
				}}
			})
		}

		return rule.RuleListeners{
			ast.KindFunctionDeclaration:                      func(node *ast.Node) { enter(node) },
			rule.ListenerOnExit(ast.KindFunctionDeclaration): func(node *ast.Node) { exit(node) },
			ast.KindFunctionExpression:                       func(node *ast.Node) { enter(node) },
			rule.ListenerOnExit(ast.KindFunctionExpression):  func(node *ast.Node) { exit(node) },
			ast.KindArrowFunction:                            func(node *ast.Node) { enter(node) },
			rule.ListenerOnExit(ast.KindArrowFunction):       func(node *ast.Node) { exit(node) },
			ast.KindMethodDeclaration:                        func(node *ast.Node) { enter(node) },
			rule.ListenerOnExit(ast.KindMethodDeclaration):   func(node *ast.Node) { exit(node) },
			ast.KindGetAccessor:                              func(node *ast.Node) { enter(node) },
			rule.ListenerOnExit(ast.KindGetAccessor):         func(node *ast.Node) { exit(node) },
			ast.KindSetAccessor:                              func(node *ast.Node) { enter(node) },
			rule.ListenerOnExit(ast.KindSetAccessor):         func(node *ast.Node) { exit(node) },
			ast.KindConstructor:                              func(node *ast.Node) { enter(node) },
			rule.ListenerOnExit(ast.KindConstructor):         func(node *ast.Node) { exit(node) },
			ast.KindReturnStatement: func(node *ast.Node) {
				if len(functions) == 0 {
					return
				}
				functions[len(functions)-1].returns = append(functions[len(functions)-1].returns, node.AsReturnStatement())
			},
		}
	},
}
