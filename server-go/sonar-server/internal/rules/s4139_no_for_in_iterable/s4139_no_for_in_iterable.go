package s4139_no_for_in_iterable

import (
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
)

func buildUseForOfMessage(iterable string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "useForOf",
		Description: "Use \"for...of\" to iterate over this \"" + iterable + "\".",
	}
}

func isCollection(t *checker.Type) bool {
	symbol := checker.Type_symbol(t)
	if symbol == nil {
		return false
	}

	switch symbol.Name {
	case "Array",
		"Int8Array",
		"Uint8Array",
		"Uint8ClampedArray",
		"Int16Array",
		"Uint16Array",
		"Int32Array",
		"Uint32Array",
		"Float32Array",
		"Float64Array",
		"BigInt64Array",
		"BigUint64Array",
		"Set",
		"Map":
		return true
	default:
		return false
	}
}

func isStringType(t *checker.Type) bool {
	if utils.IsTypeFlagSet(t, checker.TypeFlagsStringLike) {
		return true
	}

	symbol := checker.Type_symbol(t)
	return symbol != nil && symbol.Name == "String"
}

func isArrayLikeType(typeChecker *checker.Checker, t *checker.Type) bool {
	if constraint := checker.Checker_getBaseConstraintOfType(typeChecker, t); constraint != nil {
		t = constraint
	}

	return utils.Every(utils.UnionTypeParts(t), func(part *checker.Type) bool {
		return checker.Checker_isArrayType(typeChecker, part)
	})
}

func isIterableType(typeChecker *checker.Checker, t *checker.Type) bool {
	return isCollection(t) || isStringType(t) || isArrayLikeType(typeChecker, t)
}

func iterableName(t *checker.Type) string {
	symbol := checker.Type_symbol(t)
	if symbol != nil {
		return symbol.Name
	}
	return "String"
}

var NoForInIterableRule = rule.Rule{
	Name: "no-for-in-iterable",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindForInStatement: func(node *ast.Node) {
				stmt := node.AsForInOrOfStatement()
				t := ctx.TypeChecker.GetTypeAtLocation(stmt.Expression)
				if !isIterableType(ctx.TypeChecker, t) {
					return
				}

				ctx.ReportRange(
					scanner.GetRangeOfTokenAtPosition(ctx.SourceFile, node.Pos()),
					buildUseForOfMessage(iterableName(t)),
				)
			},
		}
	},
}
