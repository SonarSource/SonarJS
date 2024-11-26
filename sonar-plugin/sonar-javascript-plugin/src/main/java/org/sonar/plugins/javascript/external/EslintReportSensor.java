/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.external;

import static org.sonar.plugins.javascript.JavaScriptPlugin.ESLINT_REPORT_PATHS;

import com.google.gson.JsonSyntaxException;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextPointer;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.rule.Severity;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.issue.NewExternalIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.rules.RuleType;
import org.sonar.plugins.javascript.rules.EslintRulesDefinition;
import org.sonarsource.analyzer.commons.ExternalRuleLoader;

public class EslintReportSensor extends AbstractExternalIssuesSensor {

  private static final Logger LOG = LoggerFactory.getLogger(EslintReportSensor.class);

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

    try (
      InputStreamReader inputStreamReader = new InputStreamReader(
        new FileInputStream(report),
        StandardCharsets.UTF_8
      )
    ) {
      FileWithMessages[] filesWithMessages = gson.fromJson(
        inputStreamReader,
        FileWithMessages[].class
      );

      for (FileWithMessages fileWithMessages : filesWithMessages) {
        InputFile inputFile = getInputFile(context, fileWithMessages.filePath);
        if (inputFile != null) {
          for (EslintError eslintError : fileWithMessages.messages) {
            saveEslintError(context, eslintError, inputFile, fileWithMessages.filePath);
          }
        }
      }
    } catch (IOException | JsonSyntaxException e) {
      LOG.warn(FILE_EXCEPTION_MESSAGE, e);
    }
  }

  private static void saveEslintError(
    SensorContext context,
    EslintError eslintError,
    InputFile inputFile,
    String originalFilePath
  ) {
    String eslintKey = eslintError.ruleId;
    if (eslintKey == null) {
      LOG.warn("Parse error issue from ESLint will not be imported, file {}", inputFile.uri());
      return;
    }

    TextRange location = getLocation(eslintError, inputFile);
    TextPointer start = location.start();
    ExternalRuleLoader ruleLoader = EslintRulesDefinition.loader(eslintKey);
    RuleType ruleType = ruleLoader.ruleType(eslintKey);
    Severity severity = ruleLoader.ruleSeverity(eslintKey);
    Long effortInMinutes = ruleLoader.ruleConstantDebtMinutes(eslintKey);

    LOG.debug(
      "Saving external ESLint issue { file:\"{}\", id:{}, message:\"{}\", line:{}, offset:{}, type: {}, severity:{}, remediation:{} }",
      originalFilePath,
      eslintKey,
      eslintError.message,
      start.line(),
      start.lineOffset(),
      ruleType,
      severity,
      effortInMinutes
    );

    NewExternalIssue newExternalIssue = context.newExternalIssue();

    NewIssueLocation primaryLocation = newExternalIssue
      .newLocation()
      .message(eslintError.message)
      .on(inputFile)
      .at(location);

    newExternalIssue
      .at(primaryLocation)
      .engineId(EslintRulesDefinition.REPOSITORY_KEY)
      .ruleId(eslintKey)
      .type(ruleType)
      .severity(severity)
      .remediationEffortMinutes(effortInMinutes)
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
        eslintError.endColumn - 1
      );
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
