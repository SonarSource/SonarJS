/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import org.sonar.api.Startable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

import static org.sonarsource.api.sonarlint.SonarLintSide.MULTIPLE_ANALYSES;

@ScannerSide
@SonarLintSide(lifespan = MULTIPLE_ANALYSES)
public interface EslintBridgeServer extends Startable {

  void startServerLazily(SensorContext context) throws IOException;

  AnalysisResponse analyzeJavaScript(AnalysisRequest request) throws IOException;

  AnalysisResponse analyzeTypeScript(TypeScriptAnalysisRequest request) throws IOException;

  void clean();

  String getCommandInfo();

  class AnalysisRequest {
    String filePath;
    String fileContent;
    Rule[] rules;

    AnalysisRequest(InputFile file, Rule[] rules) {
      this.filePath = file.absolutePath();
      this.fileContent = fileContent(file);
      if (this.fileContent.startsWith("#!")) {
        String[] lines = this.fileContent.split("\r\n|\n|\r", -1);
        this.fileContent = this.fileContent.substring(lines[0].length());
      }
      this.rules = rules;
    }

    private static String fileContent(InputFile file) {
      try {
        return file.contents();
      } catch (IOException e) {
        throw new IllegalStateException(e);
      }
    }
  }

  class Rule {
    String key;
    List<String> configurations;

    Rule(String key, List<String> configurations) {
      this.key = key;
      this.configurations = configurations;
    }
  }

  class AnalysisResponse {
    AnalysisResponseIssue[] issues = {};
    AnalysisResponseHighlight[] highlights = {};
    AnalysisResponseMetrics metrics;
  }

  class AnalysisResponseIssue {
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

  class AnalysisResponseHighlight {
    int startLine;
    int startCol;
    int endLine;
    int endCol;
    String textType;
  }

  class AnalysisResponseMetrics {
    int[] ncloc;
    int[] commentLines;
    int[] nosonarLines;
    int[] executableLines;
    int functions;
    int statements;
    int classes;
  }

  class TypeScriptAnalysisRequest extends AnalysisRequest {
    List<String> tsConfigs;

    TypeScriptAnalysisRequest(InputFile file, Rule[] rules, List<String> tsConfigs) {
      super(file, rules);
      this.tsConfigs = tsConfigs;
    }
  }
}

