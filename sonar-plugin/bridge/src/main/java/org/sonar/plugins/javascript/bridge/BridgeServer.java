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
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.api.Startable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public interface BridgeServer extends Startable {
  void startServerLazily(BridgeServerConfig context) throws IOException;

  void initLinter(
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    AnalysisMode analysisMode,
    String baseDir,
    List<String> exclusions
  ) throws IOException;

  AnalysisResponse analyzeJavaScript(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeTypeScript(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeCss(CssAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeYaml(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeHtml(JsAnalysisRequest request) throws IOException;

  void clean();

  String getCommandInfo();

  boolean isAlive();

  boolean newTsConfig();

  TsConfigFile loadTsConfig(String tsConfigAbsolutePath);

  TsProgram createProgram(TsProgramRequest tsProgramRequest) throws IOException;

  boolean deleteProgram(TsProgram tsProgram) throws IOException;

  TsConfigFile createTsConfigFile(String content) throws IOException;

  TelemetryData getTelemetry();

  record JsAnalysisRequest(
    String filePath,
    String fileType,
    String language,
    @Nullable String fileContent,
    boolean ignoreHeaderComments,
    @Nullable List<String> tsConfigs,
    @Nullable String programId,
    String linterId,
    boolean skipAst,
    boolean shouldClearDependenciesCache
  ) {}

  record CssAnalysisRequest(
    String filePath,
    @Nullable String fileContent,
    List<StylelintRule> rules
  ) {}

  record BridgeResponse(String json, @Nullable Node ast) {
    public BridgeResponse(String json) {
      this(json, null);
    }
  }

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
    public AnalysisResponse(AnalysisResponse response, @Nullable Node ast) {
      this(
        response.parsingError,
        response.issues,
        response.highlights,
        response.highlightedSymbols,
        response.metrics,
        response.cpdTokens,
        response.ucfgPaths,
        ast
      );
    }

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

  record TelemetryData(List<Dependency> dependencies, RuntimeTelemetry runtimeTelemetry) {}

  record Dependency(String name, String version) {}

  record RuntimeTelemetry(Version version, String nodeExecutableOrigin) {}
}
