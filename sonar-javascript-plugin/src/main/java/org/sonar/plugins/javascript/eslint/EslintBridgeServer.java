/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import java.io.IOException;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.api.Startable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

import static org.sonarsource.api.sonarlint.SonarLintSide.MULTIPLE_ANALYSES;

@ScannerSide
@SonarLintSide(lifespan = MULTIPLE_ANALYSES)
public interface EslintBridgeServer extends Startable {

  void startServerLazily(SensorContext context) throws IOException;

  void initLinter(SensorContext context, List<EslintRule> rules, List<String> environments, List<String> globals) throws IOException;

  AnalysisResponse analyzeJavaScript(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeTypeScript(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeWithProgram(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeCss(CssAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeYaml(JsAnalysisRequest request) throws IOException;

  void clean();

  String getCommandInfo();

  boolean isAlive();

  boolean newTsConfig();

  TsConfigFile loadTsConfig(String tsConfigAbsolutePath);

  TsProgram createProgram(TsProgramRequest tsProgramRequest) throws IOException;

  boolean deleteProgram(TsProgram tsProgram) throws IOException;

  class JsAnalysisRequest {
    final String filePath;
    final String fileContent;
    final String fileType;
    final boolean ignoreHeaderComments;
    final List<String> tsConfigs;
    final String programId;
    final boolean unchanged;

    JsAnalysisRequest(String filePath, String fileType, @Nullable String fileContent, boolean ignoreHeaderComments, @Nullable List<String> tsConfigs, @Nullable String programId) {
      this(filePath, fileType, fileContent, ignoreHeaderComments, tsConfigs, programId, false);
    }

    JsAnalysisRequest(String filePath, String fileType, @Nullable String fileContent, boolean ignoreHeaderComments, @Nullable List<String> tsConfigs, @Nullable String programId, boolean unchanged) {
      this.filePath = filePath;
      this.fileType = fileType;
      this.fileContent = fileContent;
      this.ignoreHeaderComments = ignoreHeaderComments;
      this.tsConfigs = tsConfigs;
      this.programId = programId;
      this.unchanged = unchanged;
    }
  }

  class CssAnalysisRequest {
    final String filePath;
    final String fileContent;
    final List<StylelintRule> rules;

    CssAnalysisRequest(String filePath, @Nullable String fileContent, List<StylelintRule> rules) {
      this.filePath = filePath;
      this.fileContent = fileContent;
      this.rules = rules;
    }
  }

  class AnalysisResponse {
    ParsingError parsingError;
    List<Issue> issues = List.of();
    Highlight[] highlights = {};
    HighlightedSymbol[] highlightedSymbols = {};
    Metrics metrics = new Metrics();
    CpdToken[] cpdTokens = {};
    Perf perf;
  }

  class ParsingError {
    String message;
    Integer line;
    ParsingErrorCode code;
  }

  enum ParsingErrorCode {
    PARSING,
    MISSING_TYPESCRIPT,
    UNSUPPORTED_TYPESCRIPT,
    FAILING_TYPESCRIPT,
    GENERAL_ERROR
  }

  class Issue {
    Integer line;
    Integer column;
    Integer endLine;
    Integer endColumn;
    String message;
    String ruleId;
    List<IssueLocation> secondaryLocations;
    Double cost;
    List<QuickFix> quickFixes;
  }

  class QuickFix {
    String message;
    List<QuickFixEdit> edits;
  }

  class QuickFixEdit {
    String text;
    IssueLocation loc;
  }

  class IssueLocation {
    Integer line;
    Integer column;
    Integer endLine;
    Integer endColumn;
    String message;
  }

  class Highlight {
    Location location;
    String textType;
  }

  class HighlightedSymbol {
    Location declaration;
    Location[] references;
  }

  class Location {
    int startLine;
    int startCol;
    int endLine;
    int endCol;

    TextRange toTextRange(InputFile inputFile) {
      return inputFile.newRange(this.startLine, this.startCol, this.endLine, this.endCol);
    }
  }

  class Metrics {
    int[] ncloc = {};
    int[] commentLines = {};
    int[] nosonarLines = {};
    int[] executableLines = {};
    int functions;
    int statements;
    int classes;
    int complexity;
    int cognitiveComplexity;
  }

  class CpdToken {
    Location location;
    String image;
  }

  class Perf {
    int parseTime;
    int analysisTime;
  }

  class TsConfigResponse {
    final List<String> files;
    final List<String> projectReferences;
    final String error;
    final ParsingErrorCode errorCode;

    TsConfigResponse(List<String> files, List<String> projectReferences, @Nullable String error, @Nullable ParsingErrorCode errorCode) {
      this.files = files;
      this.projectReferences = projectReferences;
      this.error = error;
      this.errorCode = errorCode;
    }
  }

  class TsProgram {
    final String programId;
    final List<String> files;
    final List<String> projectReferences;
    final String error;

    TsProgram(String programId, List<String> files, List<String> projectReferences) {
      this.programId = programId;
      this.files = files;
      this.projectReferences = projectReferences;
      this.error = null;
    }

    TsProgram(String error) {
      this.programId = null;
      this.files = null;
      this.projectReferences = null;
      this.error = error;
    }

    @Override
    public String toString() {
      if (error == null) {
        return "TsProgram{" +
          "programId='" + programId + '\'' +
          ", files=" + files +
          ", projectReferences=" + projectReferences +
          '}';
      } else {
        return "TsProgram{ error='" + error + "'}";
      }
    }
  }

  class TsProgramRequest {
    final String tsConfig;

    public TsProgramRequest(String tsConfig) {
      this.tsConfig = tsConfig;
    }
  }
}

