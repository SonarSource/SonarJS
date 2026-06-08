package main

import (
	"strings"

	"github.com/SonarSource/SonarJS/server-go/sonar-server/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/scanner"
	"github.com/microsoft/typescript-go/shim/tspath"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
)

// ConvertDiagnostic converts a jsts-go diagnostic to the shared analyze-project Issue.
func ConvertDiagnostic(d rule.RuleDiagnostic) *pb.Issue {
	startLine, startCol, endLine, endCol := convertRangeClamped(d.SourceFile, d.Range)
	filePath := ""
	if d.SourceFile != nil {
		filePath = tspath.NormalizeSlashes(d.SourceFile.FileName())
	}

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
		lrStartLine, lrStartCol, lrEndLine, lrEndCol, ok := convertRange(d.SourceFile, lr.Range)
		if !ok {
			continue
		}

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

func convertRangeClamped(
	sourceFile *ast.SourceFile,
	textRange core.TextRange,
) (startLine int, startCol core.UTF16Offset, endLine int, endCol core.UTF16Offset) {
	if sourceFile == nil {
		return 0, 0, 0, 0
	}

	textLen := len(sourceFile.Text())
	startPos := clampPosition(textRange.Pos(), textLen)
	endPos := clampPosition(textRange.End(), textLen)
	if endPos < startPos {
		endPos = startPos
	}

	startLine, startCol = scanner.GetECMALineAndUTF16CharacterOfPosition(sourceFile, startPos)
	endLine, endCol = scanner.GetECMALineAndUTF16CharacterOfPosition(sourceFile, endPos)
	return startLine, startCol, endLine, endCol
}

func convertRange(
	sourceFile *ast.SourceFile,
	textRange core.TextRange,
) (startLine int, startCol core.UTF16Offset, endLine int, endCol core.UTF16Offset, ok bool) {
	if sourceFile == nil {
		return 0, 0, 0, 0, false
	}

	textLen := len(sourceFile.Text())
	startPos := textRange.Pos()
	endPos := textRange.End()
	if startPos < 0 || endPos < startPos || endPos > textLen {
		return 0, 0, 0, 0, false
	}

	startLine, startCol = scanner.GetECMALineAndUTF16CharacterOfPosition(sourceFile, startPos)
	endLine, endCol = scanner.GetECMALineAndUTF16CharacterOfPosition(sourceFile, endPos)
	return startLine, startCol, endLine, endCol, true
}

func clampPosition(pos int, textLen int) int {
	if pos < 0 {
		return 0
	}
	if pos > textLen {
		return textLen
	}
	return pos
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
