package main

import (
	"context"
	"fmt"
	"log"
	"runtime"
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
	pb.UnimplementedAnalyzerServiceServer
}

func NewAnalyzerService() *analyzerService {
	return &analyzerService{}
}

func (s *analyzerService) AnalyzeProject(
	req *pb.AnalyzeProjectRequest,
	stream pb.AnalyzerService_AnalyzeProjectServer,
) error {
	log.Printf("AnalyzeProject: baseDir=%s, files=%d, rules=%v",
		req.BaseDir, len(req.FilePaths), req.Rules)

	baseFS := bundled.WrapFS(cachedvfs.From(osvfs.FS()))
	tsConfigResolver := utils.NewTsConfigResolver(baseFS, req.BaseDir)

	// Normalize file paths
	normalizedFiles := make([]string, len(req.FilePaths))
	for i, fp := range req.FilePaths {
		normalizedFiles[i] = tspath.NormalizeSlashes(fp)
	}

	// Resolve tsconfigs for files
	workload := linter.Workload{
		Programs:       make(map[string][]string),
		UnmatchedFiles: []string{},
	}

	result := tsConfigResolver.FindTsConfigParallel(normalizedFiles)
	for file, tsconfig := range result {
		if tsconfig == "" {
			workload.UnmatchedFiles = append(workload.UnmatchedFiles, file)
		} else {
			workload.Programs[tsconfig] = append(workload.Programs[tsconfig], file)
		}
	}

	log.Printf("Resolved %d programs, %d unmatched files",
		len(workload.Programs), len(workload.UnmatchedFiles))

	// Build rule set from request
	requestedRules := make(map[string]struct{}, len(req.Rules))
	for _, r := range req.Rules {
		requestedRules[r] = struct{}{}
	}

	// Collect diagnostics grouped by file
	var mu sync.Mutex
	diagnosticsByFile := make(map[string][]*pb.Issue)

	err := linter.RunLinter(
		utils.GetLogLevel(),
		req.BaseDir,
		workload,
		runtime.GOMAXPROCS(0),
		baseFS,
		func(sourceFile *ast.SourceFile) []linter.ConfiguredRule {
			var rules []linter.ConfiguredRule
			for _, r := range allRules {
				if _, ok := requestedRules[r.Name]; ok {
					capturedRule := r
					rules = append(rules, linter.ConfiguredRule{
						Name: capturedRule.Name,
						Run: func(ctx rule.RuleContext) rule.RuleListeners {
							return capturedRule.Run(ctx, nil)
						},
					})
				}
			}
			return rules
		},
		func(d rule.RuleDiagnostic) {
			issue := ConvertDiagnostic(d)
			filePath := d.SourceFile.FileName()
			mu.Lock()
			diagnosticsByFile[filePath] = append(diagnosticsByFile[filePath], issue)
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

	if err != nil {
		log.Printf("Linter error: %v", err)
		return stream.Send(&pb.AnalyzeProjectResponse{
			Payload: &pb.AnalyzeProjectResponse_Complete{
				Complete: &pb.AnalysisComplete{
					Warnings: []string{fmt.Sprintf("tsgolint linter error: %v", err)},
				},
			},
		})
	}

	// Stream results per file
	for filePath, issues := range diagnosticsByFile {
		if err := stream.Send(&pb.AnalyzeProjectResponse{
			Payload: &pb.AnalyzeProjectResponse_FileResult{
				FileResult: &pb.FileResult{
					FilePath: filePath,
					Issues:   issues,
				},
			},
		}); err != nil {
			return err
		}
	}

	// Send completion
	return stream.Send(&pb.AnalyzeProjectResponse{
		Payload: &pb.AnalyzeProjectResponse_Complete{
			Complete: &pb.AnalysisComplete{},
		},
	})
}

func (s *analyzerService) IsAlive(
	ctx context.Context,
	req *pb.AliveRequest,
) (*pb.AliveResponse, error) {
	return &pb.AliveResponse{Status: "ok"}, nil
}
