package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"runtime"
	"sort"
	"sync"

	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
	"github.com/typescript-eslint/tsgolint/internal/diagnostic"
	"github.com/typescript-eslint/tsgolint/internal/linter"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"

	pb "github.com/typescript-eslint/tsgolint/cmd/sonar-server/grpc"
)

type analyzerService struct {
	pb.UnimplementedAnalyzeProjectServiceServer
}

func NewAnalyzerService() *analyzerService {
	return &analyzerService{}
}

func (s *analyzerService) AnalyzeProject(
	req *pb.AnalyzeProjectRequest,
	stream pb.AnalyzeProjectService_AnalyzeProjectServer,
) error {
	results, meta := analyzeProject(req)
	for _, filePath := range orderedFilePaths(req.GetFiles()) {
		if err := stream.Send(&pb.AnalyzeProjectStreamResponse{
			Message: &pb.AnalyzeProjectStreamResponse_FileResult{
				FileResult: &pb.FileResultMessage{
					FilePath: filePath,
					Result:   results[filePath],
				},
			},
		}); err != nil {
			return err
		}
	}
	return stream.Send(&pb.AnalyzeProjectStreamResponse{
		Message: &pb.AnalyzeProjectStreamResponse_Meta{
			Meta: meta,
		},
	})
}

func (s *analyzerService) AnalyzeProjectUnary(
	ctx context.Context,
	req *pb.AnalyzeProjectRequest,
) (*pb.AnalyzeProjectUnaryResponse, error) {
	results, meta := analyzeProject(req)
	return &pb.AnalyzeProjectUnaryResponse{
		Files: results,
		Meta:  meta,
	}, nil
}

func (s *analyzerService) CancelAnalysis(
	ctx context.Context,
	req *pb.CancelAnalysisRequest,
) (*pb.CancelAnalysisResponse, error) {
	return &pb.CancelAnalysisResponse{Cancelled: false}, nil
}

func (s *analyzerService) Lease(stream pb.AnalyzeProjectService_LeaseServer) error {
	for {
		_, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
	}
}

func analyzeProject(
	req *pb.AnalyzeProjectRequest,
) (map[string]*pb.ProjectAnalysisFileResult, *pb.ProjectAnalysisMeta) {
	filePaths := orderedFilePaths(req.GetFiles())
	results := make(map[string]*pb.ProjectAnalysisFileResult, len(filePaths))
	for _, filePath := range filePaths {
		results[filePath] = &pb.ProjectAnalysisFileResult{}
	}

	requestedRules := requestedRuleConfigs(req.GetRules())
	if len(filePaths) == 0 || len(requestedRules) == 0 {
		return results, &pb.ProjectAnalysisMeta{}
	}

	baseDir := requestBaseDir(req)
	log.Printf("AnalyzeProject: baseDir=%s, files=%d, rules=%d", baseDir, len(filePaths), len(requestedRules))

	baseFS := bundled.WrapFS(cachedvfs.From(osvfs.FS()))
	tsConfigResolver := utils.NewTsConfigResolver(baseFS, baseDir)

	workload := linter.Workload{
		Programs:       make(map[string][]string),
		UnmatchedFiles: []string{},
	}

	resolution := tsConfigResolver.FindTsConfigParallel(filePaths)
	for file, tsconfig := range resolution {
		if tsconfig == "" {
			workload.UnmatchedFiles = append(workload.UnmatchedFiles, file)
		} else {
			workload.Programs[tsconfig] = append(workload.Programs[tsconfig], file)
		}
	}

	log.Printf("Resolved %d programs, %d unmatched files", len(workload.Programs), len(workload.UnmatchedFiles))

	configuredRules := configuredRulesFor(requestedRules)
	var mu sync.Mutex
	diagnosticsByFile := make(map[string][]*pb.Issue, len(filePaths))

	err := linter.RunLinter(
		utils.GetLogLevel(),
		baseDir,
		workload,
		runtime.GOMAXPROCS(0),
		baseFS,
		func(sourceFile *ast.SourceFile) []linter.ConfiguredRule {
			return configuredRules
		},
		func(d rule.RuleDiagnostic) {
			issue := ConvertDiagnostic(d)
			mu.Lock()
			diagnosticsByFile[issue.GetFilePath()] = append(diagnosticsByFile[issue.GetFilePath()], issue)
			mu.Unlock()
		},
		func(d diagnostic.Internal) {
			if d.FilePath != nil {
				log.Printf("Internal diagnostic in %s: %s", *d.FilePath, d.Description)
			} else {
				log.Printf("Internal diagnostic: %s", d.Description)
			}
		},
		linter.Fixes{},
		linter.TypeErrors{},
		false, // suppressProgramDiagnostics
	)

	warnings := []string{}
	if err != nil {
		log.Printf("Linter error: %v", err)
		warnings = append(warnings, fmt.Sprintf("tsgolint linter error: %v", err))
	}

	for _, filePath := range filePaths {
		results[filePath] = &pb.ProjectAnalysisFileResult{
			Issues: diagnosticsByFile[filePath],
		}
	}

	return results, &pb.ProjectAnalysisMeta{Warnings: warnings}
}

func configuredRulesFor(requestedRules map[string]requestedRuleConfig) []linter.ConfiguredRule {
	rules := make([]linter.ConfiguredRule, 0, len(requestedRules))
	for _, availableRule := range allRules {
		requestedRuleConfig, ok := requestedRules[availableRule.Name]
		if !ok {
			continue
		}
		capturedRule := availableRule
		ruleOptions := requestedRuleConfig.Options
		rules = append(rules, linter.ConfiguredRule{
			Name: capturedRule.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return capturedRule.Run(ctx, ruleOptions)
			},
		})
	}
	return rules
}

func orderedFilePaths(files map[string]*pb.ProjectFileInput) []string {
	ordered := make([]string, 0, len(files))
	seen := make(map[string]struct{}, len(files))
	for filePath := range files {
		normalizedPath := tspath.NormalizeSlashes(filePath)
		if _, ok := seen[normalizedPath]; ok {
			continue
		}
		seen[normalizedPath] = struct{}{}
		ordered = append(ordered, normalizedPath)
	}
	sort.Strings(ordered)
	return ordered
}

func requestBaseDir(req *pb.AnalyzeProjectRequest) string {
	if configuration := req.GetConfiguration(); configuration != nil && configuration.GetBaseDir() != "" {
		return configuration.GetBaseDir()
	}
	return "."
}
