/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.plugins.javascript.external;

import com.google.gson.JsonSyntaxException;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.issue.NewExternalIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.rules.EslintRulesDefinition;
import org.sonarsource.analyzer.commons.ExternalRuleLoader;

import static org.sonar.plugins.javascript.JavaScriptPlugin.ESLINT_REPORT_PATHS;

public class EslintReportSensor extends AbstractExternalIssuesSensor {

  private static final Logger LOG = Loggers.get(EslintReportSensor.class);

  @Override
  String linterName() {
    return EslintRulesDefinition.LINTER_NAME;
  }

  @Override
  String reportsPropertyName() {
    return ESLINT_REPORT_PATHS;
  }

  @Override
  void importReport(File report, SensorContext context) {
    LOG.info("Importing {}", report.getAbsoluteFile());

    try (InputStreamReader inputStreamReader = new InputStreamReader(new FileInputStream(report), StandardCharsets.UTF_8)) {
      FileWithMessages[] filesWithMessages = gson.fromJson(inputStreamReader, FileWithMessages[].class);

      for (FileWithMessages fileWithMessages : filesWithMessages) {
        InputFile inputFile = getInputFile(context, fileWithMessages.filePath);
        if (inputFile != null) {
          for (EslintError eslintError : fileWithMessages.messages) {
            saveEslintError(context, eslintError, inputFile);
          }
        }
      }
    } catch (IOException|JsonSyntaxException e) {
      LOG.error(FILE_EXCEPTION_MESSAGE, e);
    }
  }


  private static void saveEslintError(SensorContext context, EslintError eslintError, InputFile inputFile) {
    String eslintKey = eslintError.ruleId;
    if (eslintKey == null) {
      LOG.warn("Parse error issue from ESLint will not be imported, file " + inputFile.uri());
      return;
    }

    NewExternalIssue newExternalIssue = context.newExternalIssue();

    NewIssueLocation primaryLocation = newExternalIssue.newLocation()
      .message(eslintError.message)
      .on(inputFile)
      .at(getLocation(eslintError, inputFile));

    ExternalRuleLoader ruleLoader = EslintRulesDefinition.loader(eslintKey);

    newExternalIssue
      .at(primaryLocation)
      .engineId(EslintRulesDefinition.REPOSITORY_KEY)
      .ruleId(eslintKey)
      .type(ruleLoader.ruleType(eslintKey))
      .severity(ruleLoader.ruleSeverity(eslintKey))
      .remediationEffortMinutes(ruleLoader.ruleConstantDebtMinutes(eslintKey))
      .save();
  }

  private static TextRange getLocation(EslintError eslintError, InputFile inputFile) {
    if (eslintError.endLine == 0 || eslintError.isZeroLengthRange()) {
      // eslint can have issues only with start or with zero length range
      return inputFile.selectLine(eslintError.line);
    } else {
      return inputFile.newRange(
        eslintError.line,
        eslintError.column - 1,
        eslintError.endLine,
        eslintError.endColumn - 1);
    }
  }

  private static class FileWithMessages {
    String filePath;
    EslintError[] messages;
  }

  private static class EslintError {
    String ruleId;
    String message;
    int line;
    int column;
    int endLine;
    int endColumn;

    boolean isZeroLengthRange() {
      return line == endLine && column == endColumn;
    }
  }

}
