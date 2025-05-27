/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.bridge;

import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.sonar.api.Startable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public interface BridgeServer extends Startable {
  void startServerLazily(BridgeServerConfig context) throws IOException, InterruptedException;

  void initLinter(
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    String baseDir,
    boolean sonarlint
  ) throws IOException;

  AnalysisResponse analyzeJsTs(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeCss(CssAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeYaml(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeHtml(JsAnalysisRequest request) throws IOException;

  void clean() throws InterruptedException;

  String getCommandInfo();

  boolean isAlive();

  boolean newTsConfig();

  TsConfigFile loadTsConfig(String tsConfigAbsolutePath);

  TsProgram createProgram(TsProgramRequest tsProgramRequest) throws IOException;

  boolean deleteProgram(TsProgram tsProgram) throws IOException;

  TsConfigFile createTsConfigFile(String content) throws IOException;

  TelemetryData getTelemetry();

  JSWebSocketClient getWebSocketClient();

  record InitLinterRequest(
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    String baseDir,
    boolean sonarlint,
    List<String> bundles,
    String rulesWorkdir
  ) {}

  CompletableFuture<List<Issue>> analyzeProject(AnalyzeProjectHandler handler) throws IOException;

  record ProjectAnalysisOutput(
    Map<String, AnalysisResponse> files,
    ProjectAnalysisMetaResponse meta
  ) {
    static ProjectAnalysisOutput fromDTO(ProjectAnalysisOutputDTO projectAnalysisOutputDTO) {
      return new ProjectAnalysisOutput(
        projectAnalysisOutputDTO.files
          .entrySet()
          .stream()
          .collect(
            Collectors.toMap(Map.Entry::getKey, entry -> AnalysisResponse.fromDTO(entry.getValue()))
          ),
        projectAnalysisOutputDTO.meta
      );
    }
  }

  record ProjectAnalysisOutputDTO(
    Map<String, AnalysisResponseDTO> files,
    ProjectAnalysisMetaResponse meta
  ) {
    public ProjectAnalysisOutputDTO() {
      this(Map.of(), new ProjectAnalysisMetaResponse());
    }
  }

  record JsAnalysisRequest(
    String filePath,
    String fileType,
    @Nullable String fileContent,
    boolean ignoreHeaderComments,
    @Nullable List<String> tsConfigs,
    @Nullable String programId,
    InputFile.Status fileStatus,
    AnalysisMode analysisMode,
    boolean skipAst,
    boolean shouldClearDependenciesCache,
    boolean sonarlint,
    boolean allowTsParserJsFiles
  ) {}

  record JsTsFile(
    String filePath,
    String fileType,
    InputFile.Status fileStatus,
    @Nullable String fileContent
  ) {}

  class ProjectAnalysisRequest {

    private Map<String, JsTsFile> files;
    private List<EslintRule> rules;
    public ProjectAnalysisConfiguration configuration;
    private String baseDir;
    private List<String> bundles;
    private String rulesWorkdir;

    public ProjectAnalysisRequest(
      Map<String, JsTsFile> files,
      List<EslintRule> rules,
      ProjectAnalysisConfiguration configuration,
      String baseDir
    ) {
      this.files = files;
      this.rules = rules;
      this.configuration = configuration;
      this.baseDir = baseDir;
    }

    public void setBundles(List<String> bundles) {
      this.bundles = bundles;
    }

    public void setRulesWorkdir(String rulesWorkdir) {
      this.rulesWorkdir = rulesWorkdir;
    }
  }

  record ProjectAnalysisConfiguration(
    boolean isSonarlint,
    List<Map.Entry<String, String>> fsEvents,
    boolean allowTsParserJsFiles,
    AnalysisMode analysisMode,
    Boolean skipAst,
    boolean ignoreHeaderComments,
    long maxFileSize,
    int maxFilesForTypeChecking,
    List<String> environments,
    List<String> globals,
    List<String> tsSuffixes,
    List<String> jsSuffixes,
    Set<String> tsConfigPaths,
    List<String> jsTsExclusions
  ) {
    public static ProjectAnalysisConfiguration withDefaults() {
      return new ProjectAnalysisConfiguration(
        false,
        List.of(),
        true,
        AnalysisMode.DEFAULT,
        false,
        true,
        1_000_000_000,
        1_000_000,
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        Set.of(),
        List.of()
      );
    }
  }

  record ProjectAnalysisMetaResponse(
    boolean withProgram,
    boolean withWatchProgram,
    List<String> filesWithoutTypeChecking,
    List<String> programsCreated,
    List<String> warnings
  ) {
    public ProjectAnalysisMetaResponse() {
      this(false, false, List.of(), List.of(), List.of());
    }
  }

  record CssAnalysisRequest(
    String filePath,
    @Nullable String fileContent,
    List<StylelintRule> rules
  ) {}

  record BridgeResponse(InputStreamReader reader) {}

  record AnalysisResponseDTO(
    @Nullable ParsingError parsingError,
    List<Issue> issues,
    List<Highlight> highlights,
    List<HighlightedSymbol> highlightedSymbols,
    Metrics metrics,
    List<CpdToken> cpdTokens,
    List<String> ucfgPaths,
    @Nullable String astFilePath
  ) {}

  record AnalysisResponse(
    @Nullable ParsingError parsingError,
    List<Issue> issues,
    List<Highlight> highlights,
    List<HighlightedSymbol> highlightedSymbols,
    Metrics metrics,
    List<CpdToken> cpdTokens,
    List<String> ucfgPaths,
    @Nullable Node ast
  ) {
    public AnalysisResponse() {
      this(null, List.of(), List.of(), List.of(), new Metrics(), List.of(), List.of(), null);
    }

    public AnalysisResponse(
      @Nullable ParsingError parsingError,
      @Nullable List<Issue> issues,
      @Nullable List<Highlight> highlights,
      @Nullable List<HighlightedSymbol> highlightedSymbols,
      @Nullable Metrics metrics,
      @Nullable List<CpdToken> cpdTokens,
      List<String> ucfgPaths,
      @Nullable Node ast
    ) {
      this.parsingError = parsingError;
      this.issues = issues != null ? issues : List.of();
      this.highlights = highlights != null ? highlights : List.of();
      this.highlightedSymbols = highlightedSymbols != null ? highlightedSymbols : List.of();
      this.metrics = metrics != null ? metrics : new Metrics();
      this.cpdTokens = cpdTokens != null ? cpdTokens : List.of();
      this.ucfgPaths = ucfgPaths;
      this.ast = ast;
    }

    public static AnalysisResponse fromDTO(AnalysisResponseDTO analysisResponseDTO) {
      Node ast = null;
      if (analysisResponseDTO.astFilePath != null) {
        try {
          ast = AstProtoUtils.readProtobuf(analysisResponseDTO.astFilePath);
        } catch (IOException e) {
          throw new IllegalStateException("Failed to parse protobuf", e);
        }
      }
      return new AnalysisResponse(
        analysisResponseDTO.parsingError,
        analysisResponseDTO.issues,
        analysisResponseDTO.highlights,
        analysisResponseDTO.highlightedSymbols,
        analysisResponseDTO.metrics,
        analysisResponseDTO.cpdTokens,
        analysisResponseDTO.ucfgPaths,
        ast
      );
    }
  }

  record ParsingError(String message, Integer line, ParsingErrorCode code) {}

  enum ParsingErrorCode {
    PARSING,
    FAILING_TYPESCRIPT,
    GENERAL_ERROR,
  }

  record Issue(
    Integer line,
    Integer column,
    Integer endLine,
    Integer endColumn,
    String message,
    String ruleId,
    String language,
    List<IssueLocation> secondaryLocations,
    Double cost,
    List<QuickFix> quickFixes,
    List<String> ruleESLintKeys,
    String filePath
  ) {}

  record QuickFix(String message, List<QuickFixEdit> edits) {}

  record QuickFixEdit(String text, IssueLocation loc) {}

  record IssueLocation(
    Integer line,
    Integer column,
    Integer endLine,
    Integer endColumn,
    String message
  ) {}

  record Highlight(Location location, String textType) {}

  record HighlightedSymbol(Location declaration, List<Location> references) {}

  record Location(int startLine, int startCol, int endLine, int endCol) {
    public TextRange toTextRange(InputFile inputFile) {
      return inputFile.newRange(this.startLine, this.startCol, this.endLine, this.endCol);
    }

    @Override
    public String toString() {
      return String.format("%d:%d-%d:%d", startLine, startCol, endLine, endCol);
    }
  }

  record Metrics(
    List<Integer> ncloc,
    List<Integer> commentLines,
    List<Integer> nosonarLines,
    List<Integer> executableLines,
    int functions,
    int statements,
    int classes,
    int complexity,
    int cognitiveComplexity
  ) {
    public Metrics() {
      this(List.of(), List.of(), List.of(), List.of(), 0, 0, 0, 0, 0);
    }
  }

  record CpdToken(Location location, String image) {}

  class TsConfigResponse {

    final List<String> files;
    final List<String> projectReferences;
    final String error;
    final ParsingErrorCode errorCode;

    TsConfigResponse(
      List<String> files,
      List<String> projectReferences,
      @Nullable String error,
      @Nullable ParsingErrorCode errorCode
    ) {
      this.files = files;
      this.projectReferences = projectReferences;
      this.error = error;
      this.errorCode = errorCode;
    }
  }

  record TsProgram(
    @Nullable String programId,
    @Nullable List<String> files,
    @Nullable List<String> projectReferences,
    boolean missingTsConfig,
    @Nullable String error
  ) {
    public TsProgram(
      String programId,
      @Nullable List<String> files,
      @Nullable List<String> projectReferences
    ) {
      this(programId, files, projectReferences, false, null);
    }

    public TsProgram(
      String programId,
      List<String> files,
      List<String> projectReferences,
      boolean missingTsConfig
    ) {
      this(programId, files, projectReferences, missingTsConfig, null);
    }

    public TsProgram(String error) {
      this(null, null, null, false, error);
    }

    @Override
    public String toString() {
      if (error == null) {
        return (
          "TsProgram{" +
          "programId='" +
          programId +
          '\'' +
          ", files=" +
          files +
          ", projectReferences=" +
          projectReferences +
          '}'
        );
      } else {
        return "TsProgram{ error='" + error + "'}";
      }
    }
  }

  record TsProgramRequest(String tsConfig) {}

  record TelemetryEslintBridgeResponse(List<Dependency> dependencies) {}

  record TelemetryData(
    List<Dependency> dependencies,
    @Nullable RuntimeTelemetry runtimeTelemetry
  ) {}

  record Dependency(String name, String version) {}

  record RuntimeTelemetry(Version version, String nodeExecutableOrigin) {}
}
