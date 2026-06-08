package linter

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/diagnostic"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs"
)

type ConfiguredRule struct {
	Name string
	Run  func(ctx rule.RuleContext) rule.RuleListeners
}

type Workload struct {
	Programs       map[string][]string
	UnmatchedFiles []string
}

type Fixes struct {
	Fix            bool
	FixSuggestions bool
}

type TypeErrors struct {
	ReportSyntactic bool
	ReportSemantic  bool
}

// RunLinter preserves the higher-level jsts-go-style API in the local bridge package.
func RunLinter(
	logLevel utils.LogLevel,
	currentDirectory string,
	workload Workload,
	workers int,
	fs vfs.FS,
	getRulesForFile func(sourceFile *ast.SourceFile) []ConfiguredRule,
	onRuleDiagnostic func(diagnostic rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
	fixState Fixes,
	typeErrors TypeErrors,
	suppressProgramDiagnostics bool,
) error {
	idx := 0
	for configFileName, filePaths := range workload.Programs {
		if logLevel == utils.LogLevelDebug {
			log.Printf("[%d/%d] Running linter on program: %s", idx+1, len(workload.Programs), configFileName)
		}

		currentDirectory := tspath.GetDirectoryPath(configFileName)
		host := utils.NewCachedFSCompilerHost(currentDirectory, fs, bundled.LibPath(), nil, nil)
		program, diagnostics, err := utils.CreateProgram(false, fs, currentDirectory, configFileName, host, suppressProgramDiagnostics)
		if err != nil {
			return err
		}
		if program == nil {
			for _, diag := range diagnostics {
				onInternalDiagnostic(diag)
			}
			idx++
			continue
		}

		if logLevel == utils.LogLevelDebug {
			log.Printf("Program created with %d source files", len(program.GetSourceFiles()))
		}

		fileSet := make(map[string]struct{}, len(filePaths))
		for _, filePath := range filePaths {
			fileSet[filePath] = struct{}{}
		}

		sourceFiles := make([]*ast.SourceFile, 0, len(filePaths))
		for _, sourceFile := range program.SourceFiles() {
			if _, ok := fileSet[sourceFile.FileName()]; ok {
				sourceFiles = append(sourceFiles, sourceFile)
				delete(fileSet, sourceFile.FileName())
			}
		}

		if len(fileSet) > 0 {
			var unmatched []string
			for filePath := range fileSet {
				unmatched = append(unmatched, filePath)
			}
			unmatchedText := strings.Join(unmatched, ", ")
			log.Println("Unmatched files found:", unmatchedText)

			var programFiles []string
			for _, sourceFile := range program.SourceFiles() {
				programFiles = append(programFiles, sourceFile.FileName())
			}
			log.Printf("Program source files (%d): %s", len(programFiles), strings.Join(programFiles, ", "))

			panic(fmt.Sprintf("expected file %q to be in program %q", unmatchedText, configFileName))
		}

		if err := RunLinterOnProgram(logLevel, program, sourceFiles, workers, getRulesForFile, onRuleDiagnostic, onInternalDiagnostic, fixState, typeErrors); err != nil {
			return err
		}
		idx++
	}

	host := utils.NewCachedFSCompilerHost(currentDirectory, fs, bundled.LibPath(), nil, nil)
	program, diagnostics, err := utils.CreateInferredProjectProgram(false, fs, currentDirectory, host, workload.UnmatchedFiles)
	if err != nil {
		return err
	}
	for _, diag := range diagnostics {
		onInternalDiagnostic(diag)
	}

	files := make([]*ast.SourceFile, 0, len(workload.UnmatchedFiles))
	for _, filePath := range workload.UnmatchedFiles {
		sourceFile := program.GetSourceFile(filePath)
		if sourceFile == nil {
			panic(fmt.Sprintf("expected file %q to be in inferred program", filePath))
		}
		files = append(files, sourceFile)
	}

	return RunLinterOnProgram(logLevel, program, files, workers, getRulesForFile, onRuleDiagnostic, onInternalDiagnostic, fixState, typeErrors)
}

func RunLinterOnProgram(
	logLevel utils.LogLevel,
	program *compiler.Program,
	files []*ast.SourceFile,
	workers int,
	getRulesForFile func(sourceFile *ast.SourceFile) []ConfiguredRule,
	onDiagnostic func(diagnostic rule.RuleDiagnostic),
	onInternalDiagnostic func(d diagnostic.Internal),
	fixState Fixes,
	typeErrors TypeErrors,
) error {
	type checkerWorkload struct {
		checker *checker.Checker
		program *compiler.Program
		queue   chan *ast.SourceFile
	}

	flatQueue := []checkerWorkload{}
	queue := make(chan *ast.SourceFile, len(files))
	for _, file := range files {
		queue <- file
	}
	close(queue)

	ctx := core.WithRequestID(context.Background(), "__single_run__")
	if typeErrors.ReportSyntactic {
		for _, file := range files {
			fileName := file.FileName()
			for _, diag := range program.GetSyntacticDiagnostics(ctx, file) {
				if diag.File() != nil && diag.File().FileName() == fileName {
					onInternalDiagnostic(diagnostic.Internal{
						Range:       diag.Loc(),
						Id:          "TS" + strconv.Itoa(int(diag.Code())),
						Description: utils.GetDiagnosticMessage(diag),
						FilePath:    &fileName,
					})
				}
			}
		}
	}

	if typeErrors.ReportSemantic {
		semanticDiagnosticsByFile := program.GetSemanticDiagnosticsWithoutNoEmitFiltering(ctx, files)
		programOptions := program.Options()
		for _, file := range files {
			fileName := file.FileName()
			finalDiagnostics := compiler.FilterNoEmitSemanticDiagnostics(semanticDiagnosticsByFile[file], programOptions)
			includeProcessorDiagnostics := program.GetIncludeProcessorDiagnostics(file)
			if len(finalDiagnostics) == 0 && len(includeProcessorDiagnostics) == 0 {
				continue
			}
			finalDiagnostics = append(append(make([]*ast.Diagnostic, 0, len(finalDiagnostics)+len(includeProcessorDiagnostics)), finalDiagnostics...), includeProcessorDiagnostics...)
			if len(finalDiagnostics) > 1 {
				finalDiagnostics = compiler.SortAndDeduplicateDiagnostics(finalDiagnostics)
			}
			for _, diag := range finalDiagnostics {
				if diag.File() != nil && diag.File().FileName() == fileName {
					onInternalDiagnostic(diagnostic.Internal{
						Range:       diag.Loc(),
						Id:          "TS" + strconv.Itoa(int(diag.Code())),
						Description: utils.GetDiagnosticMessage(diag),
						FilePath:    &fileName,
					})
				}
			}
		}
	}

	var flatQueueMu sync.Mutex
	program.ForEachCheckerParallel(func(idx int, ch *checker.Checker) {
		flatQueueMu.Lock()
		flatQueue = append(flatQueue, checkerWorkload{checker: ch, program: program, queue: queue})
		flatQueueMu.Unlock()
	})

	workloadQueue := make(chan checkerWorkload, len(flatQueue))
	for _, workload := range flatQueue {
		workloadQueue <- workload
	}
	close(workloadQueue)

	wg := core.NewWorkGroup(workers == 1)
	for range workers {
		wg.Queue(func() {
			type taggedListener struct {
				ruleName string
				fn       func(node *ast.Node)
			}

			registeredListeners := make(map[ast.Kind][]taggedListener, 20)
			ctxBuilder := &ruleContextBuilder{
				fixState:     fixState,
				onDiagnostic: onDiagnostic,
			}
			ctx := rule.RuleContext{
				ReportDiagnostic:                ctxBuilder.emitDiagnostic,
				ReportDiagnosticWithFixes:       ctxBuilder.reportDiagnosticWithFixes,
				ReportDiagnosticWithSuggestions: ctxBuilder.reportDiagnosticWithSuggestions,
				ReportRange:                     ctxBuilder.reportRange,
				ReportRangeWithSuggestions:      ctxBuilder.reportRangeWithSuggestions,
				ReportNode:                      ctxBuilder.reportNode,
				ReportNodeWithFixes:             ctxBuilder.reportNodeWithFixes,
				ReportNodeWithSuggestions:       ctxBuilder.reportNodeWithSuggestions,
			}

			for workload := range workloadQueue {
				ctxBuilder.program = workload.program
				ctxBuilder.checker = workload.checker
				ctx.Program = workload.program
				ctx.TypeChecker = workload.checker

				for file := range workload.queue {
					if logLevel == utils.LogLevelDebug {
						log.Print(file.FileName())
					}
					ctxBuilder.file = file
					ctx.SourceFile = file

					rules := getRulesForFile(file)
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
					for kind := range registeredListeners {
						registeredListeners[kind] = registeredListeners[kind][:0]
					}
				}
			}
		})
	}
	wg.RunAndWait()
	return nil
}
