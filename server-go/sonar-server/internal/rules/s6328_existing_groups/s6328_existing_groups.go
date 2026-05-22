package s6328_existing_groups

import (
	"strconv"
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rules/regexutil"
	"github.com/microsoft/typescript-go/shim/ast"
)

func buildExistingGroupsMessage(invalid []string) rule.RuleMessage {
	message := "Referencing non-existing group"
	if len(invalid) > 1 {
		message += "s"
	}
	message += ": " + strings.Join(invalid, ", ") + "."

	return rule.RuleMessage{
		Id:          "issue",
		Description: message,
	}
}

func invalidReferences(pattern string, replacement string) []string {
	groups := regexutil.CollectCapturingGroups(pattern)
	maxIndex := len(groups)
	namedGroups := map[string]struct{}{}
	for _, group := range groups {
		if group.Name != "" {
			namedGroups[group.Name] = struct{}{}
		}
	}

	invalid := make([]string, 0, 2)
	seen := map[string]struct{}{}
	for _, ref := range regexutil.ExtractReplacementReferences(replacement) {
		switch {
		case ref.IsNamed:
			if _, ok := namedGroups[ref.Name]; ok {
				continue
			}
		case ref.Index > 0 && ref.Index <= maxIndex:
			continue
		}

		raw := ref.Raw
		if raw == "" {
			if ref.IsNamed {
				raw = "$<" + ref.Name + ">"
			} else {
				raw = "$" + strconv.Itoa(ref.Index)
			}
		}
		if _, ok := seen[raw]; ok {
			continue
		}
		seen[raw] = struct{}{}
		invalid = append(invalid, raw)
	}

	return invalid
}

var ExistingGroupsRule = rule.Rule{
	Name: "existing-groups",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		if ctx.TypeChecker == nil {
			return nil
		}

		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				callExpr := node.AsCallExpression()
				if !regexutil.IsStringReplaceCall(ctx, callExpr) || len(callExpr.Arguments.Nodes) < 2 {
					return
				}

				patternInfo, ok := regexutil.ResolvePatternFlags(ctx, callExpr.Arguments.Nodes[0])
				if !ok || !patternInfo.FlagsKnown {
					return
				}
				if errors := regexutil.ValidatePatternWithFlags(patternInfo.Pattern, patternInfo.Flags); len(errors) > 0 {
					return
				}

				replacementNode := regexutil.UnwrapExpression(callExpr.Arguments.Nodes[1])
				if replacementNode == nil {
					return
				}
				if !(ast.IsStringLiteral(replacementNode) || replacementNode.Kind == ast.KindNoSubstitutionTemplateLiteral) {
					return
				}

				invalid := invalidReferences(patternInfo.Pattern, replacementNode.Text())
				if len(invalid) == 0 {
					return
				}

				ctx.ReportNode(replacementNode, buildExistingGroupsMessage(invalid))
			},
		}
	},
}
