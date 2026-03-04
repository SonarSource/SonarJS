package main

import (
	"github.com/microsoft/typescript-go/shim/scanner"
	"github.com/typescript-eslint/tsgolint/internal/rule"

	pb "github.com/typescript-eslint/tsgolint/cmd/sonar-server/grpc"
)

// ConvertDiagnostic converts a tsgolint rule.RuleDiagnostic to a proto Issue.
// tsgolint uses byte offsets (core.TextRange), proto expects 1-indexed lines
// and 0-indexed columns.
func ConvertDiagnostic(d rule.RuleDiagnostic) *pb.Issue {
	startLine, startCol := scanner.GetECMALineAndCharacterOfPosition(d.SourceFile, d.Range.Pos())
	endLine, endCol := scanner.GetECMALineAndCharacterOfPosition(d.SourceFile, d.Range.End())

	issue := &pb.Issue{
		RuleName: d.RuleName,
		Message:  d.Message.Description,
		Range: &pb.TextRange{
			StartLine:   int32(startLine + 1), // 0-indexed -> 1-indexed
			StartColumn: int32(startCol),       // already 0-indexed
			EndLine:     int32(endLine + 1),
			EndColumn:   int32(endCol),
		},
	}

	for _, lr := range d.LabeledRanges {
		lrStartLine, lrStartCol := scanner.GetECMALineAndCharacterOfPosition(d.SourceFile, lr.Range.Pos())
		lrEndLine, lrEndCol := scanner.GetECMALineAndCharacterOfPosition(d.SourceFile, lr.Range.End())

		issue.SecondaryLocations = append(issue.SecondaryLocations, &pb.SecondaryLocation{
			Message: lr.Label,
			Range: &pb.TextRange{
				StartLine:   int32(lrStartLine + 1),
				StartColumn: int32(lrStartCol),
				EndLine:     int32(lrEndLine + 1),
				EndColumn:   int32(lrEndCol),
			},
		})
	}

	return issue
}
