package linter

import (
	"fmt"
	"log"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/core"
)

type ruleContextBuilder struct {
	file         *ast.SourceFile
	ruleName     string
	program      *compiler.Program
	checker      *checker.Checker
	fixState     Fixes
	onDiagnostic func(rule.RuleDiagnostic)
}

func (b *ruleContextBuilder) emitDiagnostic(d rule.RuleDiagnostic) {
	d.RuleName = b.ruleName
	d.SourceFile = b.file
	b.onDiagnostic(d)
}

func (b *ruleContextBuilder) reportDiagnosticWithFixes(d rule.RuleDiagnostic, fixesFn func() []rule.RuleFix) {
	var fixes []rule.RuleFix
	if b.fixState.Fix {
		fixes = fixesFn()
	}
	d.FixesPtr = &fixes
	b.emitDiagnostic(d)
}

func (b *ruleContextBuilder) reportDiagnosticWithSuggestions(d rule.RuleDiagnostic, suggestionsFn func() []rule.RuleSuggestion) {
	var suggestions []rule.RuleSuggestion
	if b.fixState.FixSuggestions {
		suggestions = suggestionsFn()
	}
	d.Suggestions = &suggestions
	b.emitDiagnostic(d)
}

func (b *ruleContextBuilder) reportRange(textRange core.TextRange, msg rule.RuleMessage) {
	b.emitDiagnostic(rule.RuleDiagnostic{
		Range:   textRange,
		Message: msg,
	})
}

func (b *ruleContextBuilder) reportRangeWithSuggestions(textRange core.TextRange, msg rule.RuleMessage, suggestionsFn func() []rule.RuleSuggestion) {
	var suggestions []rule.RuleSuggestion
	if b.fixState.FixSuggestions {
		suggestions = suggestionsFn()
	}
	b.emitDiagnostic(rule.RuleDiagnostic{
		Range:       textRange,
		Message:     msg,
		Suggestions: &suggestions,
	})
}

func (b *ruleContextBuilder) reportNode(node *ast.Node, msg rule.RuleMessage) {
	b.emitDiagnostic(rule.RuleDiagnostic{
		Range:   utils.TrimNodeTextRange(b.file, node),
		Message: msg,
	})
}

func (b *ruleContextBuilder) reportNodeWithFixes(node *ast.Node, msg rule.RuleMessage, fixesFn func() []rule.RuleFix) {
	var fixes []rule.RuleFix
	if b.fixState.Fix {
		fixes = fixesFn()
	}
	b.emitDiagnostic(rule.RuleDiagnostic{
		Range:    utils.TrimNodeTextRange(b.file, node),
		Message:  msg,
		FixesPtr: &fixes,
	})
}

func (b *ruleContextBuilder) reportNodeWithSuggestions(node *ast.Node, msg rule.RuleMessage, suggestionsFn func() []rule.RuleSuggestion) {
	suggestions := suggestionsFn()
	b.emitDiagnostic(rule.RuleDiagnostic{
		Range:       utils.TrimNodeTextRange(b.file, node),
		Message:     msg,
		Suggestions: &suggestions,
	})
}

// RunLinterOnFile lets callers own program creation and per-file rule selection.
func RunLinterOnFile(
	logLevel utils.LogLevel,
	program *compiler.Program,
	file *ast.SourceFile,
	rules []ConfiguredRule,
	onDiagnostic func(diagnostic rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
	fixState Fixes,
	typeErrors TypeErrors,
) error {
	if file == nil {
		return fmt.Errorf("source file is nil")
	}

	if program == nil {
		if typeErrors.ReportSyntactic || typeErrors.ReportSemantic {
			return fmt.Errorf("type errors require a program")
		}
		return runLinterOnSourceFile(logLevel, file, rules, onDiagnostic, fixState)
	}
	if program.GetSourceFile(file.FileName()) == nil {
		return fmt.Errorf("expected file %q to be in program", file.FileName())
	}

	return RunLinterOnProgram(
		logLevel,
		program,
		[]*ast.SourceFile{file},
		1,
		func(*ast.SourceFile) []ConfiguredRule {
			return rules
		},
		onDiagnostic,
		onInternalDiagnostic,
		fixState,
		typeErrors,
	)
}

func runLinterOnSourceFile(
	logLevel utils.LogLevel,
	file *ast.SourceFile,
	rules []ConfiguredRule,
	onDiagnostic func(diagnostic rule.RuleDiagnostic),
	fixState Fixes,
) error {
	type taggedListener struct {
		ruleName string
		fn       func(node *ast.Node)
	}

	registeredListeners := make(map[ast.Kind][]taggedListener, 20)
	ctxBuilder := &ruleContextBuilder{
		file:         file,
		fixState:     fixState,
		onDiagnostic: onDiagnostic,
	}

	ctx := rule.RuleContext{
		SourceFile:                      file,
		ReportDiagnostic:                ctxBuilder.emitDiagnostic,
		ReportDiagnosticWithFixes:       ctxBuilder.reportDiagnosticWithFixes,
		ReportDiagnosticWithSuggestions: ctxBuilder.reportDiagnosticWithSuggestions,
		ReportRange:                     ctxBuilder.reportRange,
		ReportRangeWithSuggestions:      ctxBuilder.reportRangeWithSuggestions,
		ReportNode:                      ctxBuilder.reportNode,
		ReportNodeWithFixes:             ctxBuilder.reportNodeWithFixes,
		ReportNodeWithSuggestions:       ctxBuilder.reportNodeWithSuggestions,
	}

	if logLevel == utils.LogLevelDebug {
		log.Print(file.FileName())
	}

	for _, configuredRule := range rules {
		ctxBuilder.ruleName = configuredRule.Name
		for kind, listener := range configuredRule.Run(ctx) {
			listeners := registeredListeners[kind]
			registeredListeners[kind] = append(listeners, taggedListener{
				ruleName: configuredRule.Name,
				fn:       listener,
			})
		}
	}

	runListeners := func(kind ast.Kind, node *ast.Node) {
		if listeners, ok := registeredListeners[kind]; ok {
			for _, listener := range listeners {
				ctxBuilder.ruleName = listener.ruleName
				listener.fn(node)
			}
		}
	}

	var childVisitor ast.Visitor
	var patternVisitor func(node *ast.Node)
	patternVisitor = func(node *ast.Node) {
		runListeners(node.Kind, node)
		kind := rule.ListenerOnAllowPattern(node.Kind)
		runListeners(kind, node)

		switch node.Kind {
		case ast.KindArrayLiteralExpression:
			for _, element := range node.AsArrayLiteralExpression().Elements.Nodes {
				patternVisitor(element)
			}
		case ast.KindObjectLiteralExpression:
			for _, property := range node.AsObjectLiteralExpression().Properties.Nodes {
				patternVisitor(property)
			}
		case ast.KindSpreadElement, ast.KindSpreadAssignment:
			patternVisitor(node.Expression())
		case ast.KindPropertyAssignment:
			patternVisitor(node.Initializer())
		default:
			node.ForEachChild(childVisitor)
		}

		runListeners(rule.ListenerOnExit(kind), node)
		runListeners(rule.ListenerOnExit(node.Kind), node)
	}

	childVisitor = func(node *ast.Node) bool {
		runListeners(node.Kind, node)

		switch node.Kind {
		case ast.KindArrayLiteralExpression, ast.KindObjectLiteralExpression:
			kind := rule.ListenerOnNotAllowPattern(node.Kind)
			runListeners(kind, node)
			node.ForEachChild(childVisitor)
			runListeners(rule.ListenerOnExit(kind), node)
		default:
			if ast.IsAssignmentExpression(node, true) {
				expr := node.AsBinaryExpression()
				patternVisitor(expr.Left)
				childVisitor(expr.OperatorToken)
				childVisitor(expr.Right)
			} else {
				node.ForEachChild(childVisitor)
			}
		}

		runListeners(rule.ListenerOnExit(node.Kind), node)
		return false
	}

	file.Node.ForEachChild(childVisitor)
	return nil
}
