/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import org.sonar.api.Startable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

import javax.annotation.Nullable;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

import static org.sonarsource.api.sonarlint.SonarLintSide.MULTIPLE_ANALYSES;

@ScannerSide
@SonarLintSide(lifespan = MULTIPLE_ANALYSES)
public interface EslintBridgeServer extends Startable {

  void startServerLazily(SensorContext context) throws IOException;

  void initLinter(List<Rule> rules, List<String> environments, List<String> globals) throws IOException;

  AnalysisResponse analyzeJavaScript(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeTypeScript(JsAnalysisRequest request) throws IOException;

  AnalysisResponse analyzeCss(CssAnalysisRequest request) throws IOException;

  void clean();

  String getCommandInfo();

  boolean isAlive();

  boolean newTsConfig();

  TsConfigFile loadTsConfig(String tsConfigAbsolutePath);

  class JsAnalysisRequest {
    final String filePath;
    final String fileContent;
    final String fileType;
    final boolean ignoreHeaderComments;
    final List<String> tsConfigs;

    JsAnalysisRequest(String filePath, String fileType, @Nullable String fileContent, boolean ignoreHeaderComments, @Nullable List<String> tsConfigs) {
      this.filePath = filePath;
      this.fileType = fileType;
      this.fileContent = fileContent;
      this.ignoreHeaderComments = ignoreHeaderComments;
      this.tsConfigs = tsConfigs;
    }
  }

  class CssAnalysisRequest {
    final String filePath;
    final String fileContent;
    final String stylelintConfig;

    CssAnalysisRequest(String filePath, @Nullable String fileContent, String stylelintConfig) {
      this.filePath = filePath;
      this.fileContent = fileContent;
      this.stylelintConfig = stylelintConfig;
    }
  }

  class Rule {
    String key;
    List<String> fileTypeTarget;
    List<Object> configurations;

    Rule(String key, List<Object> configurations, List<InputFile.Type> fileTypeTarget) {
      this.key = key;
      this.fileTypeTarget = fileTypeTarget.stream().map(InputFile.Type::name).collect(Collectors.toList());
      this.configurations = configurations;
    }

    @Override
    public String toString() {
      return key;
    }
  }

  class AnalysisResponse {
    ParsingError parsingError;
    Issue[] issues = {};
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
}

