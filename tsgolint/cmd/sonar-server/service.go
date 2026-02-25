package main

import (
	"context"
	"log"

	pb "github.com/nicolo-ribaudo/tsgolint/cmd/sonar-server/grpc"
)

type analyzerService struct {
	pb.UnimplementedAnalyzerServiceServer
}

// NewAnalyzerService creates a new AnalyzerServiceServer.
func NewAnalyzerService() *analyzerService {
	return &analyzerService{}
}

// AnalyzeProject handles a project analysis request. It iterates over
// the requested files, runs tsgolint rules, and streams FileResult
// messages back to the client, followed by an AnalysisComplete.
func (s *analyzerService) AnalyzeProject(
	req *pb.AnalyzeProjectRequest,
	stream pb.AnalyzerService_AnalyzeProjectServer,
) error {
	log.Printf("AnalyzeProject: baseDir=%s, files=%d, rules=%v",
		req.BaseDir, len(req.FilePaths), req.Rules)

	// TODO: Build linter.Workload from request:
	// 1. Use req.TsconfigPaths with utils.NewTsConfigResolver
	// 2. Build workload with file_paths and rules
	// 3. Call linter.RunLinter()

	for _, filePath := range req.FilePaths {
		issues, err := analyzeFile(filePath, req.Rules, req.BaseDir, req.TsconfigPaths)
		if err != nil {
			log.Printf("Error analyzing %s: %v", filePath, err)
			continue
		}

		fileResult := &pb.FileResult{
			FilePath: filePath,
			Issues:   issues,
		}

		if err := stream.Send(&pb.AnalyzeProjectResponse{
			Payload: &pb.AnalyzeProjectResponse_FileResult{
				FileResult: fileResult,
			},
		}); err != nil {
			return err
		}
	}

	// Send completion message
	if err := stream.Send(&pb.AnalyzeProjectResponse{
		Payload: &pb.AnalyzeProjectResponse_Complete{
			Complete: &pb.AnalysisComplete{},
		},
	}); err != nil {
		return err
	}

	return nil
}

// IsAlive returns "ok" to indicate the server is running.
func (s *analyzerService) IsAlive(
	ctx context.Context,
	req *pb.AliveRequest,
) (*pb.AliveResponse, error) {
	return &pb.AliveResponse{Status: "ok"}, nil
}

// analyzeFile runs tsgolint rules on a single file.
// TODO: Replace with actual linter.RunLinter integration that calls into
// tsgolint's internal linter package and collects diagnostics.
// Each RuleDiagnostic is converted to a proto Issue via converter.go.
func analyzeFile(filePath string, rules []string, baseDir string, tsconfigPaths []string) ([]*pb.Issue, error) {
	return nil, nil
}
