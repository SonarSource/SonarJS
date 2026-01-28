# Phase 1: Protocol Buffer Definition

## Objective

Design and implement the `bridge.proto` schema that captures all current HTTP endpoint request/response shapes, enabling type-safe gRPC communication between the Java plugin and Node.js bridge.

## Prerequisites

- Understanding of current HTTP API contracts (completed via code analysis)
- Agreement on message structure approach
- No code changes required before starting

## Duration

**Estimated: 1.5 days**

---

## Tasks

### P1-T01: Create bridge.proto file

**Description**: Create `packages/grpc/src/proto/bridge.proto` with all message types and service definitions.

**File**: `packages/grpc/src/proto/bridge.proto`

**Estimated Effort**: 1 day

#### Technical Specification

```protobuf
syntax = "proto3";

package bridge;

option java_multiple_files = true;
option java_package = "org.sonar.plugins.javascript.bridge.grpc";
option java_outer_classname = "BridgeProto";

// ============================================================================
// Bridge Service - for Java plugin <-> Node.js communication
// ============================================================================
service BridgeService {
  // Initialize the linter with rules and configuration
  rpc InitLinter(InitLinterRequest) returns (InitLinterResponse);

  // Analyze a single JavaScript/TypeScript file
  rpc AnalyzeJsTs(AnalyzeJsTsRequest) returns (AnalyzeJsTsResponse);

  // Analyze a single CSS file
  rpc AnalyzeCss(AnalyzeCssRequest) returns (AnalyzeCssResponse);

  // Analyze a YAML file containing embedded JS
  rpc AnalyzeYaml(AnalyzeYamlRequest) returns (AnalyzeYamlResponse);

  // Analyze an HTML file containing embedded JS
  rpc AnalyzeHtml(AnalyzeHtmlRequest) returns (AnalyzeHtmlResponse);

  // Analyze entire project with streaming results (replaces WebSocket)
  rpc AnalyzeProject(AnalyzeProjectRequest) returns (stream AnalyzeProjectResponse);

  // Cancel ongoing analysis
  rpc CancelAnalysis(CancelAnalysisRequest) returns (CancelAnalysisResponse);

  // Graceful shutdown
  rpc Close(CloseRequest) returns (CloseResponse);
}

// ============================================================================
// InitLinter Messages
// ============================================================================
message InitLinterRequest {
  repeated EslintRule rules = 1;
  repeated string environments = 2;
  repeated string globals = 3;
  string base_dir = 4;
  bool sonarlint = 5;
  repeated string bundles = 6;
  string rules_workdir = 7;
}

message EslintRule {
  string key = 1;
  repeated string file_type_targets = 2;  // "MAIN", "TEST"
  repeated string configurations = 3;      // JSON-encoded configurations
  repeated string analysis_modes = 4;      // "DEFAULT", "SKIP_UNCHANGED"
  repeated string blacklisted_extensions = 5;
  string language = 6;                     // "js" or "ts"
}

message InitLinterResponse {
  bool success = 1;
  string error = 2;
}

// ============================================================================
// JS/TS Analysis Messages
// ============================================================================
message AnalyzeJsTsRequest {
  string file_path = 1;
  string file_type = 2;                    // "MAIN" or "TEST"
  optional string file_content = 3;
  bool ignore_header_comments = 4;
  repeated string ts_configs = 5;
  optional string program_id = 6;
  string file_status = 7;                  // "SAME", "CHANGED", "ADDED"
  string analysis_mode = 8;                // "DEFAULT", "SKIP_UNCHANGED"
  bool skip_ast = 9;
  bool should_clear_dependencies_cache = 10;
  bool sonarlint = 11;
  bool allow_ts_parser_js_files = 12;
  optional ProjectAnalysisConfiguration configuration = 13;
}

message AnalyzeJsTsResponse {
  optional ParsingError parsing_error = 1;
  repeated Issue issues = 2;
  repeated Highlight highlights = 3;
  repeated HighlightedSymbol highlighted_symbols = 4;
  Metrics metrics = 5;
  repeated CpdToken cpd_tokens = 6;
  optional bytes ast = 7;                  // Protobuf-encoded AST
}

// ============================================================================
// CSS Analysis Messages
// ============================================================================
message AnalyzeCssRequest {
  string file_path = 1;
  optional string file_content = 2;
  repeated StylelintRule rules = 3;
  optional ProjectAnalysisConfiguration configuration = 4;
}

message StylelintRule {
  string key = 1;
  repeated string configurations = 2;      // JSON-encoded configurations
}

message AnalyzeCssResponse {
  optional ParsingError parsing_error = 1;
  repeated CssIssue issues = 2;
}

message CssIssue {
  int32 line = 1;
  int32 column = 2;
  optional int32 end_line = 3;
  optional int32 end_column = 4;
  string message = 5;
  string rule_id = 6;
}

// ============================================================================
// YAML/HTML Analysis Messages (Embedded JS)
// ============================================================================
message AnalyzeYamlRequest {
  string file_path = 1;
  optional string file_content = 2;
  optional ProjectAnalysisConfiguration configuration = 3;
}

message AnalyzeYamlResponse {
  optional ParsingError parsing_error = 1;
  repeated Issue issues = 2;
  EmbeddedMetrics metrics = 3;
}

message AnalyzeHtmlRequest {
  string file_path = 1;
  optional string file_content = 2;
  optional ProjectAnalysisConfiguration configuration = 3;
}

message AnalyzeHtmlResponse {
  optional ParsingError parsing_error = 1;
  repeated Issue issues = 2;
  EmbeddedMetrics metrics = 3;
}

message EmbeddedMetrics {
  repeated int32 ncloc = 1;
}

// ============================================================================
// Project Analysis Messages (Streaming)
// ============================================================================
message AnalyzeProjectRequest {
  map<string, JsTsFile> files = 1;
  repeated EslintRule rules = 2;
  ProjectAnalysisConfiguration configuration = 3;
  repeated string bundles = 4;
  string rules_workdir = 5;
}

message JsTsFile {
  string file_path = 1;
  string file_type = 2;                    // "MAIN" or "TEST"
  string file_status = 3;                  // "SAME", "CHANGED", "ADDED"
  optional string file_content = 4;
}

message ProjectAnalysisConfiguration {
  string base_dir = 1;
  bool sonarlint = 2;
  map<string, string> fs_events = 3;
  bool allow_ts_parser_js_files = 4;
  string analysis_mode = 5;
  bool skip_ast = 6;
  bool ignore_header_comments = 7;
  int64 max_file_size = 8;
  repeated string environments = 9;
  repeated string globals = 10;
  repeated string ts_suffixes = 11;
  repeated string js_suffixes = 12;
  repeated string css_suffixes = 13;
  repeated string ts_config_paths = 14;
  repeated string js_ts_exclusions = 15;
  repeated string sources = 16;
  repeated string inclusions = 17;
  repeated string exclusions = 18;
  repeated string tests = 19;
  repeated string test_inclusions = 20;
  repeated string test_exclusions = 21;
  bool detect_bundles = 22;
  bool can_access_file_system = 23;
}

// Streaming response - can be one of several message types
message AnalyzeProjectResponse {
  oneof result {
    FileAnalysisResult file_result = 1;
    ProjectMeta meta = 2;
    AnalysisCancelled cancelled = 3;
    AnalysisError error = 4;
  }
}

message FileAnalysisResult {
  string filename = 1;
  AnalyzeJsTsResponse analysis = 2;
}

message ProjectMeta {
  repeated string warnings = 1;
}

message AnalysisCancelled {}

message AnalysisError {
  string code = 1;
  string message = 2;
  optional string stack = 3;
}

// ============================================================================
// Cancel Analysis Messages
// ============================================================================
message CancelAnalysisRequest {}

message CancelAnalysisResponse {
  bool success = 1;
}

// ============================================================================
// Close Messages
// ============================================================================
message CloseRequest {}

message CloseResponse {
  bool success = 1;
}

// ============================================================================
// Shared Types
// ============================================================================
message ParsingError {
  string message = 1;
  optional int32 line = 2;
  string code = 3;                         // "PARSING", "FAILING_TYPESCRIPT", "GENERAL_ERROR"
}

message Issue {
  int32 line = 1;
  int32 column = 2;
  optional int32 end_line = 3;
  optional int32 end_column = 4;
  string message = 5;
  string rule_id = 6;
  string language = 7;                     // "js" or "ts"
  repeated IssueLocation secondary_locations = 8;
  optional double cost = 9;
  repeated QuickFix quick_fixes = 10;
  repeated string rule_eslint_keys = 11;
  string file_path = 12;
}

message IssueLocation {
  int32 line = 1;
  int32 column = 2;
  int32 end_line = 3;
  int32 end_column = 4;
  optional string message = 5;
}

message QuickFix {
  string message = 1;
  repeated QuickFixEdit edits = 2;
}

message QuickFixEdit {
  string text = 1;
  IssueLocation loc = 2;
}

message Highlight {
  Location location = 1;
  string text_type = 2;
}

message HighlightedSymbol {
  Location declaration = 1;
  repeated Location references = 2;
}

message Location {
  int32 start_line = 1;
  int32 start_col = 2;
  int32 end_line = 3;
  int32 end_col = 4;
}

message Metrics {
  repeated int32 ncloc = 1;
  repeated int32 comment_lines = 2;
  repeated int32 nosonar_lines = 3;
  repeated int32 executable_lines = 4;
  int32 functions = 5;
  int32 statements = 6;
  int32 classes = 7;
  int32 complexity = 8;
  int32 cognitive_complexity = 9;
}

message CpdToken {
  Location location = 1;
  string image = 2;
}
```

#### Files Affected

| Action | File                                   |
| ------ | -------------------------------------- |
| CREATE | `packages/grpc/src/proto/bridge.proto` |

#### Acceptance Criteria

- [ ] Proto file compiles without errors using `protoc`
- [ ] All HTTP endpoint request/response shapes are represented
- [ ] Streaming RPC for project analysis is defined with `oneof` for different message types
- [ ] Java package options are correctly set for code generation (`org.sonar.plugins.javascript.bridge.grpc`)
- [ ] Field numbers are assigned logically and allow for future additions
- [ ] All optional fields use proto3 `optional` keyword

---

### P1-T02: Generate TypeScript types from bridge.proto

**Description**: Add build step to generate TypeScript types from the proto file using protobufjs, following the existing pattern used for `language_analyzer.proto`.

**Estimated Effort**: 0.5 days

#### Technical Specification

Extend the existing protobuf build pipeline to include `bridge.proto`:

1. Update the proto generation script (check `packages/grpc/package.json` for existing scripts)
2. Generate both static JavaScript and TypeScript declaration files
3. Follow the same patterns used for `language_analyzer.proto`

#### Files Affected

| Action | File                                                    |
| ------ | ------------------------------------------------------- |
| MODIFY | `packages/grpc/package.json` (if script changes needed) |
| CREATE | `packages/grpc/src/proto/bridge.js` (generated)         |
| CREATE | `packages/grpc/src/proto/bridge.d.ts` (generated)       |

#### Commands

```bash
# From packages/grpc directory
npm run generate-proto  # or equivalent command
```

#### Acceptance Criteria

- [ ] TypeScript types are generated and importable
- [ ] Types match proto definitions exactly
- [ ] Generated files follow the same pattern as existing `language_analyzer.proto` generated files
- [ ] Build script is idempotent (running multiple times produces same output)
- [ ] Generated files are not manually edited (documented in comments)

---

## Deliverables

1. `packages/grpc/src/proto/bridge.proto` - Complete protocol buffer definition
2. `packages/grpc/src/proto/bridge.js` - Generated JavaScript code
3. `packages/grpc/src/proto/bridge.d.ts` - Generated TypeScript declarations

## Exit Criteria

- [ ] Proto file compiles successfully
- [ ] TypeScript types are generated and importable
- [ ] Proto definition reviewed and approved
- [ ] All message types align with existing HTTP API contracts

## Dependencies

- None (Phase 1 can start immediately)

## Risks and Mitigations

| Risk                                              | Impact | Likelihood | Mitigation                                                 |
| ------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------- |
| Proto schema doesn't capture all HTTP API nuances | High   | Medium     | Review against actual Java/Node.js types before finalizing |
| Generated code conflicts with existing types      | Medium | Low        | Use separate namespace (`bridge` package)                  |
| Missing fields discovered later                   | Medium | Medium     | Proto3 allows adding fields without breaking compatibility |
