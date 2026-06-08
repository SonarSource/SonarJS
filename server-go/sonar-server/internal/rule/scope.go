package rule

import "github.com/microsoft/typescript-go/shim/ast"

type ValueNameResolution struct {
	LocalSymbol            *ast.Symbol
	NonGlobalSymbol        *ast.Symbol
	AnySymbol              *ast.Symbol
	ConfiguredGlobalOnly   bool
	ConfiguredGlobalExists bool
}

func ResolveValueName(ctx RuleContext, location *ast.Node, name string) ValueNameResolution {
	resolution := ValueNameResolution{
		LocalSymbol:            LookupLocalValueSymbol(location, name),
		ConfiguredGlobalExists: IsConfiguredGlobal(ctx, name),
	}

	if ctx.TypeChecker == nil || location == nil || name == "" {
		resolution.ConfiguredGlobalOnly = resolution.ConfiguredGlobalExists
		return resolution
	}

	resolution.NonGlobalSymbol = ctx.TypeChecker.ResolveName(name, location, ast.SymbolFlagsValue, true)
	resolution.AnySymbol = ctx.TypeChecker.ResolveName(name, location, ast.SymbolFlagsValue, false)
	resolution.ConfiguredGlobalOnly = resolution.ConfiguredGlobalExists && resolution.AnySymbol == nil

	return resolution
}

func LookupLocalValueSymbol(location *ast.Node, name string) *ast.Symbol {
	if location == nil || name == "" {
		return nil
	}

	for container := ast.GetEnclosingBlockScopeContainer(location); container != nil; container = ast.GetEnclosingBlockScopeContainer(container) {
		locals := ast.GetLocals(container)
		if locals == nil {
			continue
		}
		symbol := locals[name]
		if symbol != nil && symbol.Flags&ast.SymbolFlagsValue != 0 {
			return symbol
		}
	}

	return nil
}

func IsValueNameShadowedLocally(ctx RuleContext, location *ast.Node, name string) bool {
	return ResolveValueName(ctx, location, name).LocalSymbol != nil
}

func ResolvesToGlobalValue(ctx RuleContext, location *ast.Node, name string) bool {
	resolution := ResolveValueName(ctx, location, name)
	return resolution.LocalSymbol == nil && resolution.AnySymbol != nil && resolution.NonGlobalSymbol == nil
}

func IsConfiguredGlobal(ctx RuleContext, name string) bool {
	if ctx.KnownGlobals == nil || name == "" {
		return false
	}
	return ctx.KnownGlobals[name]
}
