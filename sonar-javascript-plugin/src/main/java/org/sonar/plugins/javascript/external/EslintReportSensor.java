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
package org.sonar.plugins.javascript.external;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.issue.NewExternalIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.rules.EslintRulesDefinition;
import org.sonarsource.analyzer.commons.ExternalReportProvider;
import org.sonarsource.analyzer.commons.ExternalRuleLoader;

import static org.sonar.plugins.javascript.JavaScriptPlugin.ESLINT_REPORT_PATHS;
import static org.sonar.plugins.javascript.rules.EslintRulesDefinition.LINTER_NAME;
import static org.sonar.plugins.javascript.rules.EslintRulesDefinition.REPO_KEY;

public class EslintReportSensor implements Sensor {

  private static final Logger LOG = Loggers.get(EslintReportSensor.class);

  @Override
  public void describe(SensorDescriptor sensorDescriptor) {
    sensorDescriptor
      .onlyWhenConfiguration(conf -> conf.hasKey(ESLINT_REPORT_PATHS))
      .name("Import of " + LINTER_NAME + " issues");
  }

  @Override
  public void execute(SensorContext context) {
    List<File> reportFiles = ExternalReportProvider.getReportFiles(context, ESLINT_REPORT_PATHS);
    reportFiles.forEach(report -> importReport(report, context));
  }

  private static void importReport(File report, SensorContext context) {
    LOG.info("Importing {}", report.getAbsoluteFile());

    try (InputStreamReader inputStreamReader = new InputStreamReader(new FileInputStream(report), StandardCharsets.UTF_8)) {
      FileWithMessages[] filesWithMessages = new Gson().fromJson(inputStreamReader, FileWithMessages[].class);

      for (FileWithMessages fileWithMessages : filesWithMessages) {
        InputFile inputFile = getInputFile(context, fileWithMessages.filePath);
        if (inputFile != null) {
          for (EslintError eslintError : fileWithMessages.messages) {
            saveEslintError(context, eslintError, inputFile);
          }
        }
      }
    } catch (IOException|JsonSyntaxException e) {
      LOG.error("No issues information will be saved as the report file can't be read.", e);
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
      .engineId(REPO_KEY)
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

  private static InputFile getInputFile(SensorContext context, String fileName) {
    FilePredicates predicates = context.fileSystem().predicates();
    InputFile inputFile = context.fileSystem().inputFile(predicates.or(predicates.hasRelativePath(fileName), predicates.hasAbsolutePath(fileName)));
    if (inputFile == null) {
      LOG.warn("No input file found for {}. No {} issues will be imported on this file.", fileName, LINTER_NAME);
      return null;
    }
    return inputFile;
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
