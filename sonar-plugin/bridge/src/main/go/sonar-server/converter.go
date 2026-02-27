package main

import (
	pb "github.com/typescript-eslint/tsgolint/cmd/sonar-server/grpc"
)

// RuleDiagnostic represents a diagnostic from tsgolint's linter.
// TODO: Replace with actual type from internal/linter package.
type RuleDiagnostic struct {
	RuleName  string
	Message   string
	StartLine int32 // 1-indexed
	StartCol  int32 // 0-indexed
	EndLine   int32 // 1-indexed
	EndCol    int32 // 0-indexed
	Secondary []SecondaryDiagnostic
}

// SecondaryDiagnostic represents a secondary location for a diagnostic.
type SecondaryDiagnostic struct {
	Message   string
	StartLine int32
	StartCol  int32
	EndLine   int32
	EndCol    int32
}

// ConvertDiagnostic converts a tsgolint RuleDiagnostic to a proto Issue.
func ConvertDiagnostic(diag RuleDiagnostic) *pb.Issue {
	issue := &pb.Issue{
		RuleName: diag.RuleName,
		Message:  diag.Message,
		Range: &pb.TextRange{
			StartLine:   diag.StartLine,
			StartColumn: diag.StartCol,
			EndLine:     diag.EndLine,
			EndColumn:   diag.EndCol,
		},
	}

	for _, sec := range diag.Secondary {
		issue.SecondaryLocations = append(issue.SecondaryLocations, &pb.SecondaryLocation{
			Message: sec.Message,
			Range: &pb.TextRange{
				StartLine:   sec.StartLine,
				StartColumn: sec.StartCol,
				EndLine:     sec.EndLine,
				EndColumn:   sec.EndCol,
			},
		})
	}

	return issue
}
