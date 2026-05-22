package no_unnecessary_type_constraint

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildUnnecessaryConstraintMessage(name string, constraint string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unnecessaryConstraint",
		Description: fmt.Sprintf("Constraining the generic type `%s` to `%s` does nothing and is unnecessary.", name, constraint),
	}
}

var NoUnnecessaryTypeConstraintRule = rule.Rule{
	Name: "no-unnecessary-type-constraint",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindTypeParameter: func(node *ast.Node) {
				constraintNode := node.AsTypeParameterDeclaration().Constraint
				if constraintNode == nil {
					return
				}

				var constraint string
				switch constraintNode.Kind {
				case ast.KindAnyKeyword:
					constraint = "any"
				case ast.KindUnknownKeyword:
					constraint = "unknown"
				default:
					return
				}

				name := node.Name()
				if name == nil {
					return
				}

				ctx.ReportNode(node, buildUnnecessaryConstraintMessage(name.Text(), constraint))
			},
		}
	},
}
