/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.bridge;

import static java.util.Objects.requireNonNullElseGet;
import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.IOException;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.api.Startable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public interface BridgeServer extends Startable {
  void startServerLazily(SensorContext context) throws IOException;

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

  record JsAnalysisRequest(

    String filePath,
    String fileType,
    String language,
    @Nullable String fileContent,
    boolean ignoreHeaderComments,
    List<String> tsConfigs,
    @Nullable String programId,
    String linterId
   ) {

  }

  record CssAnalysisRequest(

    String filePath,
    @Nullable String fileContent,
    List<StylelintRule> rules) {
    }

  record AnalysisResponse(ParsingError parsingError,
                                 List<Issue> issues,
                                 Highlight[] highlights,
                                 HighlightedSymbol[] highlightedSymbols,
                                 @Nullable Metrics metrics,
                                 CpdToken[] cpdTokens,
                                 List<String> ucfgPaths) {
    public AnalysisResponse() {
      this(null, List.of(), new Highlight[0], new HighlightedSymbol[0], null, null, null);
    }

    public AnalysisResponse(ParsingError parsingError,
      List<Issue> issues,
      Highlight[] highlights,
      HighlightedSymbol[] highlightedSymbols,
      @Nullable Metrics metrics,
      CpdToken[] cpdTokens,
      List<String> ucfgPaths) {
      this.parsingError = parsingError;
      this.issues = requireNonNullElseGet(issues, List::of);
      this.highlights = requireNonNullElseGet(highlights, () -> new Highlight[0]);
      this.highlightedSymbols = requireNonNullElseGet(highlightedSymbols, () -> new HighlightedSymbol[0]);
      this.metrics = requireNonNullElseGet(metrics, Metrics::new);
      this.cpdTokens = requireNonNullElseGet(cpdTokens, () -> new CpdToken[0]);
      this.ucfgPaths = ucfgPaths;
    }
  }

  record ParsingError(

    String message,
    Integer line,
    ParsingErrorCode code
  ){}

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
    List<QuickFix> quickFixes) {
  }

  record QuickFix(
    String message,
    List<QuickFixEdit> edits) {
  }

  record QuickFixEdit(
    String text,
    IssueLocation loc
  ) {}

  record IssueLocation(

    Integer line,
    Integer column,
    Integer endLine,
    Integer endColumn,
    String message
  ) {}

  record Highlight(

    Location location,
    String textType
    ) {}

  record HighlightedSymbol(

    Location declaration,
    Location[] references
  ) {}

  record Location(

    int startLine,
    int startCol,
    int endLine,
    int endCol
  ) {

    public TextRange toTextRange(InputFile inputFile) {
      return inputFile.newRange(this.startLine, this.startCol, this.endLine, this.endCol);
    }

    @Override
    public String toString() {
      return String.format("%d:%d-%d:%d", startLine, startCol, endLine, endCol);
    }
  }

  record Metrics(

    int[] ncloc,
    int[] commentLines,
    int[] nosonarLines,
    int[] executableLines,
    int functions,
    int statements,
    int classes,
    int complexity,
    int cognitiveComplexity
    ) {
    public Metrics() {
      this(new int[0], new int[0], new int[0], new int[0], 0, 0, 0, 0, 0);
    }
  }

  record CpdToken(

    Location location,
    String image) {
  }

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

  record TsProgramRequest(

    String tsConfig
  ) {}
}
