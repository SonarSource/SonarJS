package main

import (
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

type DiagnosticFilter func(ctx rule.RuleContext, diagnostic rule.RuleDiagnostic) bool
type NodeDiagnosticFilter func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) bool
type DiagnosticTransformer func(ctx rule.RuleContext, diagnostic rule.RuleDiagnostic) rule.RuleDiagnostic
type NodeDiagnosticTransformer func(ctx rule.RuleContext, node *ast.Node, diagnostic rule.RuleDiagnostic) rule.RuleDiagnostic
type ListenerFactory func(ctx rule.RuleContext) rule.RuleListeners
type DecoratorBinder func(ctx rule.RuleContext, options any) RuleDecorator

type RuleDecorator struct {
	FilterDiagnostic        DiagnosticFilter
	FilterNodeDiagnostic    NodeDiagnosticFilter
	TransformDiagnostic     DiagnosticTransformer
	TransformNodeDiagnostic NodeDiagnosticTransformer
	ExtraListeners          ListenerFactory
	ConvertFixesToSuggests  bool
	Bind                    DecoratorBinder
}

func DecorateRule(base rule.Rule, decorators ...RuleDecorator) rule.Rule {
	if len(decorators) == 0 {
		return base
	}

	return rule.Rule{
		Name: base.Name,
		Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
			decorators = bindDecorators(ctx, options, decorators)
			decoratedCtx := ctx
			decoratedCtx.ReportDiagnostic = func(diagnostic rule.RuleDiagnostic) {
				if shouldReportDiagnostic(ctx, base.Name, decorators, diagnostic) {
					diagnostic = transformDiagnostic(ctx, decorators, diagnostic)
					ctx.ReportDiagnostic(diagnostic)
				}
			}
			decoratedCtx.ReportDiagnosticWithFixes = func(diagnostic rule.RuleDiagnostic, fixesFn func() []rule.RuleFix) {
				if shouldReportDiagnostic(ctx, base.Name, decorators, diagnostic) {
					diagnostic = transformDiagnostic(ctx, decorators, diagnostic)
					reportDiagnosticWithFixes(ctx, decorators, diagnostic, fixesFn)
				}
			}
			decoratedCtx.ReportDiagnosticWithSuggestions = func(diagnostic rule.RuleDiagnostic, suggestionsFn func() []rule.RuleSuggestion) {
				if shouldReportDiagnostic(ctx, base.Name, decorators, diagnostic) {
					diagnostic = transformDiagnostic(ctx, decorators, diagnostic)
					ctx.ReportDiagnosticWithSuggestions(diagnostic, suggestionsFn)
				}
			}
			decoratedCtx.ReportRange = func(textRange core.TextRange, msg rule.RuleMessage) {
				diagnostic := rule.RuleDiagnostic{
					Range:      textRange,
					Message:    msg,
					SourceFile: ctx.SourceFile,
				}
				decoratedCtx.ReportDiagnostic(diagnostic)
			}
			decoratedCtx.ReportRangeWithSuggestions = func(textRange core.TextRange, msg rule.RuleMessage, suggestionsFn func() []rule.RuleSuggestion) {
				diagnostic := rule.RuleDiagnostic{
					Range:      textRange,
					Message:    msg,
					SourceFile: ctx.SourceFile,
				}
				decoratedCtx.ReportDiagnosticWithSuggestions(diagnostic, suggestionsFn)
			}
			decoratedCtx.ReportNode = func(node *ast.Node, msg rule.RuleMessage) {
				diagnostic := rule.RuleDiagnostic{
					Range:      utils.TrimNodeTextRange(ctx.SourceFile, node),
					Message:    msg,
					SourceFile: ctx.SourceFile,
				}
				if shouldReportNodeDiagnostic(ctx, base.Name, decorators, node, diagnostic) {
					diagnostic = transformNodeDiagnostic(ctx, decorators, node, diagnostic)
					ctx.ReportDiagnostic(diagnostic)
				}
			}
			decoratedCtx.ReportNodeWithFixes = func(node *ast.Node, msg rule.RuleMessage, fixesFn func() []rule.RuleFix) {
				diagnostic := rule.RuleDiagnostic{
					Range:      utils.TrimNodeTextRange(ctx.SourceFile, node),
					Message:    msg,
					SourceFile: ctx.SourceFile,
				}
				if shouldReportNodeDiagnostic(ctx, base.Name, decorators, node, diagnostic) {
					diagnostic = transformNodeDiagnostic(ctx, decorators, node, diagnostic)
					reportDiagnosticWithFixes(ctx, decorators, diagnostic, fixesFn)
				}
			}
			decoratedCtx.ReportNodeWithSuggestions = func(node *ast.Node, msg rule.RuleMessage, suggestionsFn func() []rule.RuleSuggestion) {
				diagnostic := rule.RuleDiagnostic{
					Range:      utils.TrimNodeTextRange(ctx.SourceFile, node),
					Message:    msg,
					SourceFile: ctx.SourceFile,
				}
				if shouldReportNodeDiagnostic(ctx, base.Name, decorators, node, diagnostic) {
					diagnostic = transformNodeDiagnostic(ctx, decorators, node, diagnostic)
					ctx.ReportDiagnosticWithSuggestions(diagnostic, suggestionsFn)
				}
			}

			listeners := base.Run(decoratedCtx, options)
			for _, decorator := range decorators {
				if decorator.ExtraListeners != nil {
					listeners = mergeRuleListeners(listeners, decorator.ExtraListeners(decoratedCtx))
				}
			}
			return listeners
		},
	}
}

func bindDecorators(ctx rule.RuleContext, options any, decorators []RuleDecorator) []RuleDecorator {
	boundDecorators := make([]RuleDecorator, 0, len(decorators))
	for _, decorator := range decorators {
		if decorator.Bind != nil {
			decorator = decorator.Bind(ctx, options)
			decorator.Bind = nil
		}
		boundDecorators = append(boundDecorators, decorator)
	}
	return boundDecorators
}

func reportDiagnosticWithFixes(ctx rule.RuleContext, decorators []RuleDecorator, diagnostic rule.RuleDiagnostic, fixesFn func() []rule.RuleFix) {
	if shouldConvertFixesToSuggestions(decorators) {
		ctx.ReportDiagnosticWithSuggestions(diagnostic, func() []rule.RuleSuggestion {
			return []rule.RuleSuggestion{{
				Message:  diagnostic.Message,
				FixesArr: fixesFn(),
			}}
		})
		return
	}
	ctx.ReportDiagnosticWithFixes(diagnostic, fixesFn)
}

func shouldReportDiagnostic(ctx rule.RuleContext, ruleName string, decorators []RuleDecorator, diagnostic rule.RuleDiagnostic) bool {
	diagnostic.RuleName = ruleName
	diagnostic.SourceFile = ctx.SourceFile
	for _, decorator := range decorators {
		if decorator.FilterDiagnostic != nil && !decorator.FilterDiagnostic(ctx, diagnostic) {
			return false
		}
	}
	return true
}

func shouldReportNodeDiagnostic(ctx rule.RuleContext, ruleName string, decorators []RuleDecorator, node *ast.Node, diagnostic rule.RuleDiagnostic) bool {
	diagnostic.RuleName = ruleName
	diagnostic.SourceFile = ctx.SourceFile
	if !shouldReportDiagnostic(ctx, ruleName, decorators, diagnostic) {
		return false
	}
	for _, decorator := range decorators {
		if decorator.FilterNodeDiagnostic != nil && !decorator.FilterNodeDiagnostic(ctx, node, diagnostic) {
			return false
		}
	}
	return true
}

func transformDiagnostic(ctx rule.RuleContext, decorators []RuleDecorator, diagnostic rule.RuleDiagnostic) rule.RuleDiagnostic {
	for _, decorator := range decorators {
		if decorator.TransformDiagnostic != nil {
			diagnostic = decorator.TransformDiagnostic(ctx, diagnostic)
		}
	}
	return diagnostic
}

func transformNodeDiagnostic(ctx rule.RuleContext, decorators []RuleDecorator, node *ast.Node, diagnostic rule.RuleDiagnostic) rule.RuleDiagnostic {
	diagnostic = transformDiagnostic(ctx, decorators, diagnostic)
	for _, decorator := range decorators {
		if decorator.TransformNodeDiagnostic != nil {
			diagnostic = decorator.TransformNodeDiagnostic(ctx, node, diagnostic)
		}
	}
	return diagnostic
}

func shouldConvertFixesToSuggestions(decorators []RuleDecorator) bool {
	for _, decorator := range decorators {
		if decorator.ConvertFixesToSuggests {
			return true
		}
	}
	return false
}

func mergeRuleListeners(base rule.RuleListeners, extra rule.RuleListeners) rule.RuleListeners {
	if len(base) == 0 {
		return extra
	}
	if len(extra) == 0 {
		return base
	}
	merged := make(rule.RuleListeners, len(base)+len(extra))
	for kind, listener := range base {
		merged[kind] = listener
	}
	for kind, extraListener := range extra {
		if baseListener, ok := merged[kind]; ok {
			baseListener := baseListener
			extraListener := extraListener
			merged[kind] = func(node *ast.Node) {
				baseListener(node)
				extraListener(node)
			}
		} else {
			merged[kind] = extraListener
		}
	}
	return merged
}
