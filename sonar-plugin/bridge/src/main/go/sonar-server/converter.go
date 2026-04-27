package main

import (
	"strings"

	"github.com/microsoft/typescript-go/shim/scanner"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/typescript-eslint/tsgolint/internal/rule"

	pb "github.com/typescript-eslint/tsgolint/cmd/sonar-server/grpc"
)

// ConvertDiagnostic converts a tsgolint diagnostic to the shared analyze-project Issue.
func ConvertDiagnostic(d rule.RuleDiagnostic) *pb.Issue {
	startLine, startCol := scanner.GetECMALineAndCharacterOfPosition(d.SourceFile, d.Range.Pos())
	endLine, endCol := scanner.GetECMALineAndCharacterOfPosition(d.SourceFile, d.Range.End())
	filePath := tspath.NormalizeSlashes(d.SourceFile.FileName())

	issue := &pb.Issue{
		Line:      int32(startLine + 1), // 0-indexed -> 1-indexed
		Column:    int32(startCol),      // already 0-indexed
		EndLine:   int32Ptr(int32(endLine + 1)),
		EndColumn: int32Ptr(int32(endCol)),
		Message:   d.Message.Description,
		RuleId:    sonarRuleKeyFor(d.RuleName),
		Language:  issueLanguage(filePath),
		FilePath:  filePath,
	}

	for _, lr := range d.LabeledRanges {
		lrStartLine, lrStartCol := scanner.GetECMALineAndCharacterOfPosition(d.SourceFile, lr.Range.Pos())
		lrEndLine, lrEndCol := scanner.GetECMALineAndCharacterOfPosition(d.SourceFile, lr.Range.End())

		issue.SecondaryLocations = append(issue.SecondaryLocations, &pb.IssueLocation{
			Line:      int32Ptr(int32(lrStartLine + 1)),
			Column:    int32Ptr(int32(lrStartCol)),
			EndLine:   int32Ptr(int32(lrEndLine + 1)),
			EndColumn: int32Ptr(int32(lrEndCol)),
			Message:   stringPtrIfNotEmpty(lr.Label),
		})
	}

	return issue
}

func issueLanguage(filePath string) pb.AnalysisLanguage {
	lowerCasePath := strings.ToLower(filePath)
	if strings.HasSuffix(lowerCasePath, ".js") ||
		strings.HasSuffix(lowerCasePath, ".jsx") ||
		strings.HasSuffix(lowerCasePath, ".cjs") ||
		strings.HasSuffix(lowerCasePath, ".mjs") {
		return pb.AnalysisLanguage_ANALYSIS_LANGUAGE_JS
	}
	return pb.AnalysisLanguage_ANALYSIS_LANGUAGE_TS
}

func int32Ptr(value int32) *int32 {
	return &value
}

func stringPtrIfNotEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
