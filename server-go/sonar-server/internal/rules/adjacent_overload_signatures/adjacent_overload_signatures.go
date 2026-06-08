package adjacent_overload_signatures

import (
	"fmt"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

type methodInfo struct {
	name          string
	nameType      utils.MemberNameType
	isStatic      bool
	callSignature bool
}

func buildAdjacentSignatureMessage(name string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "adjacentSignature",
		Description: fmt.Sprintf("All %s signatures should be adjacent.", name),
	}
}

func functionName(member *ast.Node) string {
	name := member.Name()
	if name == nil || !ast.IsIdentifier(name) {
		return ""
	}
	return name.AsIdentifier().Text
}

func getMethodInfo(sourceFile *ast.SourceFile, member *ast.Node) *methodInfo {
	switch member.Kind {
	case ast.KindFunctionDeclaration:
		name := functionName(member)
		if name == "" {
			return nil
		}
		return &methodInfo{
			name:     name,
			nameType: utils.MemberNameTypeNormal,
		}
	case ast.KindMethodSignature, ast.KindMethodDeclaration:
		name, nameType := utils.GetNameFromMember(sourceFile, member.Name())
		return &methodInfo{
			name:          name,
			nameType:      nameType,
			isStatic:      member.ModifierFlags()&ast.ModifierFlagsStatic != 0,
			callSignature: false,
		}
	case ast.KindCallSignature:
		return &methodInfo{
			name:          "call",
			nameType:      utils.MemberNameTypeNormal,
			callSignature: true,
		}
	case ast.KindConstructSignature:
		return &methodInfo{
			name:          "new",
			nameType:      utils.MemberNameTypeNormal,
			callSignature: false,
		}
	default:
		return nil
	}
}

func sameMethod(left, right *methodInfo) bool {
	if left == nil || right == nil {
		return false
	}

	return left.name == right.name &&
		left.nameType == right.nameType &&
		left.isStatic == right.isStatic &&
		left.callSignature == right.callSignature
}

func bodyMembers(node *ast.Node) []*ast.Node {
	switch node.Kind {
	case ast.KindSourceFile, ast.KindBlock, ast.KindModuleBlock:
		return node.Statements()
	case ast.KindClassDeclaration, ast.KindClassExpression, ast.KindInterfaceDeclaration, ast.KindTypeLiteral:
		return node.Members()
	default:
		return nil
	}
}

func displayName(info *methodInfo) string {
	if info.isStatic {
		return "static " + info.name
	}
	return info.name
}

func checkMembers(ctx rule.RuleContext, node *ast.Node) {
	members := bodyMembers(node)
	if len(members) == 0 {
		return
	}

	var lastMethod *methodInfo
	seenMethods := make([]*methodInfo, 0, len(members))
	for _, member := range members {
		method := getMethodInfo(ctx.SourceFile, member)
		if method == nil {
			lastMethod = nil
			continue
		}

		seenIndex := -1
		for index, seenMethod := range seenMethods {
			if sameMethod(method, seenMethod) {
				seenIndex = index
				break
			}
		}

		if seenIndex >= 0 && !sameMethod(method, lastMethod) {
			ctx.ReportNode(member, buildAdjacentSignatureMessage(displayName(method)))
		} else if seenIndex < 0 {
			seenMethods = append(seenMethods, method)
		}

		lastMethod = method
	}
}

var AdjacentOverloadSignaturesRule = rule.Rule{
	Name: "adjacent-overload-signatures",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindSourceFile:           func(node *ast.Node) { checkMembers(ctx, node) },
			ast.KindBlock:                func(node *ast.Node) { checkMembers(ctx, node) },
			ast.KindModuleBlock:          func(node *ast.Node) { checkMembers(ctx, node) },
			ast.KindClassDeclaration:     func(node *ast.Node) { checkMembers(ctx, node) },
			ast.KindClassExpression:      func(node *ast.Node) { checkMembers(ctx, node) },
			ast.KindInterfaceDeclaration: func(node *ast.Node) { checkMembers(ctx, node) },
			ast.KindTypeLiteral:          func(node *ast.Node) { checkMembers(ctx, node) },
		}
	},
}
