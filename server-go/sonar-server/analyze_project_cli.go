package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	pb "github.com/SonarSource/SonarJS/server-go/sonar-server/grpc"
	"google.golang.org/protobuf/encoding/protojson"
)

type normalizedAnalysisOutput struct {
	Warnings []string               `json:"warnings,omitempty"`
	Files    []normalizedFileResult `json:"files"`
}

type normalizedFileResult struct {
	FilePath      string                   `json:"filePath"`
	Error         string                   `json:"error,omitempty"`
	ParsingErrors []normalizedParsingError `json:"parsingErrors,omitempty"`
	Issues        []normalizedIssue        `json:"issues,omitempty"`
}

type normalizedParsingError struct {
	Message  string `json:"message"`
	Code     string `json:"code"`
	Language string `json:"language"`
	Line     *int32 `json:"line,omitempty"`
	Column   *int32 `json:"column,omitempty"`
}

type normalizedIssue struct {
	RuleID             string                    `json:"ruleId"`
	Language           string                    `json:"language"`
	Message            string                    `json:"message"`
	Line               int32                     `json:"line"`
	Column             int32                     `json:"column"`
	EndLine            *int32                    `json:"endLine,omitempty"`
	EndColumn          *int32                    `json:"endColumn,omitempty"`
	SecondaryLocations []normalizedIssueLocation `json:"secondaryLocations,omitempty"`
}

type normalizedIssueLocation struct {
	Line      *int32  `json:"line,omitempty"`
	Column    *int32  `json:"column,omitempty"`
	EndLine   *int32  `json:"endLine,omitempty"`
	EndColumn *int32  `json:"endColumn,omitempty"`
	Message   *string `json:"message,omitempty"`
}

func runAnalyzeProjectCLI(
	projectPath string,
	requestPath string,
	baseDir string,
	outputFormat string,
	pretty bool,
) error {
	request, err := loadAnalyzeProjectCLIRequest(projectPath, requestPath, baseDir)
	if err != nil {
		return err
	}

	service := NewAnalyzerService()
	response, err := service.AnalyzeProjectUnary(context.Background(), request)
	if err != nil {
		return err
	}

	encoded, err := marshalAnalyzeProjectCLIResponse(response, outputFormat, pretty)
	if err != nil {
		return err
	}

	if _, err := os.Stdout.Write(encoded); err != nil {
		return err
	}
	if len(encoded) == 0 || encoded[len(encoded)-1] != '\n' {
		if _, err := os.Stdout.Write([]byte("\n")); err != nil {
			return err
		}
	}

	return nil
}

func loadAnalyzeProjectCLIRequest(
	projectPath string,
	requestPath string,
	baseDir string,
) (*pb.AnalyzeProjectRequest, error) {
	resolvedProjectPath := ""
	if projectPath != "" {
		absProjectPath, err := filepath.Abs(projectPath)
		if err != nil {
			return nil, err
		}
		resolvedProjectPath = filepath.Clean(absProjectPath)
	}

	resolvedRequestPath := requestPath
	if resolvedRequestPath == "" && resolvedProjectPath != "" {
		candidate := filepath.Join(resolvedProjectPath, "request.json")
		if _, err := os.Stat(candidate); err == nil {
			resolvedRequestPath = candidate
		}
	}
	if resolvedRequestPath != "" && !filepath.IsAbs(resolvedRequestPath) {
		if resolvedProjectPath != "" {
			resolvedRequestPath = filepath.Join(resolvedProjectPath, resolvedRequestPath)
		} else {
			absRequestPath, err := filepath.Abs(resolvedRequestPath)
			if err != nil {
				return nil, err
			}
			resolvedRequestPath = absRequestPath
		}
	}

	request := &pb.AnalyzeProjectRequest{}
	if resolvedRequestPath != "" {
		contents, err := os.ReadFile(resolvedRequestPath)
		if err != nil {
			return nil, err
		}
		if err := protojson.Unmarshal(contents, request); err != nil {
			return nil, fmt.Errorf("unmarshal analyze-project request %q: %w", resolvedRequestPath, err)
		}
	}

	effectiveBaseDir := strings.TrimSpace(baseDir)
	if effectiveBaseDir == "" && resolvedProjectPath != "" {
		effectiveBaseDir = resolvedProjectPath
	}
	if effectiveBaseDir == "" {
		requestBaseDir := strings.TrimSpace(request.GetConfiguration().GetBaseDir())
		if requestBaseDir != "" {
			if filepath.IsAbs(requestBaseDir) {
				effectiveBaseDir = requestBaseDir
			} else if resolvedRequestPath != "" {
				effectiveBaseDir = filepath.Join(filepath.Dir(resolvedRequestPath), requestBaseDir)
			} else {
				effectiveBaseDir = requestBaseDir
			}
		}
	}
	if effectiveBaseDir != "" {
		absBaseDir, err := filepath.Abs(effectiveBaseDir)
		if err != nil {
			return nil, err
		}
		effectiveBaseDir = filepath.Clean(absBaseDir)
	}

	if request.Configuration == nil {
		request.Configuration = &pb.ProjectConfiguration{}
	}
	if effectiveBaseDir != "" {
		request.Configuration.BaseDir = effectiveBaseDir
	}
	if strings.TrimSpace(request.GetConfiguration().GetBaseDir()) == "" {
		return nil, fmt.Errorf("analyze-project CLI requires a base directory via --base-dir, --project, or request.configuration.baseDir")
	}

	return request, nil
}

func marshalAnalyzeProjectCLIResponse(
	response *pb.AnalyzeProjectUnaryResponse,
	outputFormat string,
	pretty bool,
) ([]byte, error) {
	switch outputFormat {
	case "normalized-json":
		normalized := normalizeAnalyzeProjectResponse(response)
		if pretty {
			return json.MarshalIndent(normalized, "", "  ")
		}
		return json.Marshal(normalized)
	case "protojson":
		return protojson.MarshalOptions{
			Multiline:       pretty,
			Indent:          "  ",
			EmitUnpopulated: false,
		}.Marshal(response)
	default:
		return nil, fmt.Errorf("unsupported analyze-project CLI format %q", outputFormat)
	}
}

func normalizeAnalyzeProjectResponse(response *pb.AnalyzeProjectUnaryResponse) normalizedAnalysisOutput {
	result := normalizedAnalysisOutput{
		Warnings: slices.Clone(response.GetMeta().GetWarnings()),
		Files:    make([]normalizedFileResult, 0, len(response.GetFiles())),
	}

	for filePath, fileResult := range response.GetFiles() {
		normalized := normalizedFileResult{
			FilePath: filePath,
			Error:    fileResult.GetError(),
		}

		for _, parsingError := range fileResult.GetParsingErrors() {
			if parsingError == nil {
				continue
			}
			normalized.ParsingErrors = append(normalized.ParsingErrors, normalizedParsingError{
				Message:  parsingError.GetMessage(),
				Code:     normalizeParsingErrorCode(parsingError.GetCode()),
				Language: normalizeAnalysisLanguage(parsingError.GetLanguage()),
				Line:     parsingError.Line,
				Column:   parsingError.Column,
			})
		}

		for _, issue := range fileResult.GetIssues() {
			if issue == nil {
				continue
			}
			normalizedIssue := normalizedIssue{
				RuleID:    issue.GetRuleId(),
				Language:  normalizeAnalysisLanguage(issue.GetLanguage()),
				Message:   issue.GetMessage(),
				Line:      issue.GetLine(),
				Column:    issue.GetColumn(),
				EndLine:   issue.EndLine,
				EndColumn: issue.EndColumn,
			}
			for _, location := range issue.GetSecondaryLocations() {
				if location == nil {
					continue
				}
				normalizedIssue.SecondaryLocations = append(
					normalizedIssue.SecondaryLocations,
					normalizedIssueLocation{
						Line:      location.Line,
						Column:    location.Column,
						EndLine:   location.EndLine,
						EndColumn: location.EndColumn,
						Message:   location.Message,
					},
				)
			}
			normalized.Issues = append(normalized.Issues, normalizedIssue)
		}

		slices.SortFunc(normalized.ParsingErrors, compareNormalizedParsingErrors)
		slices.SortFunc(normalized.Issues, compareNormalizedIssues)
		result.Files = append(result.Files, normalized)
	}

	slices.SortFunc(result.Files, func(a normalizedFileResult, b normalizedFileResult) int {
		return strings.Compare(a.FilePath, b.FilePath)
	})

	return result
}

func compareNormalizedParsingErrors(a normalizedParsingError, b normalizedParsingError) int {
	if cmp := strings.Compare(a.Code, b.Code); cmp != 0 {
		return cmp
	}
	if cmp := compareOptionalInt32(a.Line, b.Line); cmp != 0 {
		return cmp
	}
	if cmp := compareOptionalInt32(a.Column, b.Column); cmp != 0 {
		return cmp
	}
	if cmp := strings.Compare(a.Language, b.Language); cmp != 0 {
		return cmp
	}
	return strings.Compare(a.Message, b.Message)
}

func compareNormalizedIssues(a normalizedIssue, b normalizedIssue) int {
	if cmp := strings.Compare(a.RuleID, b.RuleID); cmp != 0 {
		return cmp
	}
	if cmp := compareInt32(a.Line, b.Line); cmp != 0 {
		return cmp
	}
	if cmp := compareInt32(a.Column, b.Column); cmp != 0 {
		return cmp
	}
	if cmp := compareOptionalInt32(a.EndLine, b.EndLine); cmp != 0 {
		return cmp
	}
	if cmp := compareOptionalInt32(a.EndColumn, b.EndColumn); cmp != 0 {
		return cmp
	}
	if cmp := strings.Compare(a.Language, b.Language); cmp != 0 {
		return cmp
	}
	return strings.Compare(a.Message, b.Message)
}

func compareInt32(a int32, b int32) int {
	switch {
	case a < b:
		return -1
	case a > b:
		return 1
	default:
		return 0
	}
}

func compareOptionalInt32(a *int32, b *int32) int {
	switch {
	case a == nil && b == nil:
		return 0
	case a == nil:
		return -1
	case b == nil:
		return 1
	default:
		return compareInt32(*a, *b)
	}
}

func normalizeAnalysisLanguage(language pb.AnalysisLanguage) string {
	switch language {
	case pb.AnalysisLanguage_ANALYSIS_LANGUAGE_JS:
		return "js"
	case pb.AnalysisLanguage_ANALYSIS_LANGUAGE_TS:
		return "ts"
	case pb.AnalysisLanguage_ANALYSIS_LANGUAGE_CSS:
		return "css"
	default:
		return strings.TrimPrefix(language.String(), "ANALYSIS_LANGUAGE_")
	}
}

func normalizeParsingErrorCode(code pb.ParsingErrorCode) string {
	return strings.TrimPrefix(code.String(), "PARSING_ERROR_CODE_")
}
