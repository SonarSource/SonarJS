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
package org.sonar.plugins.javascript.external;

import static org.sonar.plugins.javascript.JavaScriptPlugin.ESLINT_REPORT_PATHS;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.rule.Severity;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.rules.RuleType;
import org.sonar.plugins.javascript.rules.EslintRulesDefinition;
import org.sonarsource.analyzer.commons.ExternalReportProvider;
import org.sonarsource.analyzer.commons.ExternalRuleLoader;

public class EslintReportImporter {

  private static final Logger LOG = LoggerFactory.getLogger(EslintReportImporter.class);

  String linterName() {
    return EslintRulesDefinition.LINTER_NAME;
  }

  String reportsPropertyName() {
    return ESLINT_REPORT_PATHS;
  }

  InputFile getInputFile(SensorContext context, String fileName) {
    FilePredicates predicates = context.fileSystem().predicates();
    InputFile inputFile = context.fileSystem().inputFile(predicates.hasPath(fileName));
    if (inputFile == null) {
      LOG.warn(
        "No input file found for {}. No {} issues will be imported on this file.",
        fileName,
        linterName()
      );
      return null;
    }
    return inputFile;
  }

  /**
   * Execute the importer, and return the list of external issues found.
   */
  public List<Issue> execute(SensorContext context) {
    var results = new ArrayList<Issue>();

    List<File> reportFiles = ExternalReportProvider.getReportFiles(context, reportsPropertyName());
    reportFiles.forEach(report -> results.addAll(importReport(report, context)));

    return results;
  }

  /**
   * Import the passed report, and return the list of external issues found.
   */
  List<Issue> importReport(File report, SensorContext context) {
    LOG.info("Importing {}", report.getAbsoluteFile());

    var results = new ArrayList<Issue>();
    var serializer = new Gson();

    try (
      InputStreamReader inputStreamReader = new InputStreamReader(
        new FileInputStream(report),
        StandardCharsets.UTF_8
      )
    ) {
      FileWithMessages[] filesWithMessages = serializer.fromJson(
        inputStreamReader,
        FileWithMessages[].class
      );

      for (FileWithMessages fileWithMessages : filesWithMessages) {
        InputFile inputFile = getInputFile(context, fileWithMessages.filePath);
        if (inputFile != null) {
          for (EslintError eslintError : fileWithMessages.messages) {
            if (eslintError.ruleId == null) {
              LOG.warn(
                "Parse error issue from ESLint will not be imported, file {}",
                inputFile.uri()
              );
            } else {
              results.add(createIssue(eslintError, inputFile));
            }
          }
        }
      }
    } catch (IOException | JsonSyntaxException e) {
      LOG.warn("No issues information will be saved as the report file can't be read.", e);
    }

    return results;
  }

  private static Issue createIssue(EslintError eslintError, InputFile inputFile) {
    String eslintKey = eslintError.ruleId;
    TextRange location = getLocation(eslintError, inputFile);
    ExternalRuleLoader ruleLoader = EslintRulesDefinition.loader(eslintKey);
    RuleType ruleType = ruleLoader.ruleType(eslintKey);
    Severity severity = ruleLoader.ruleSeverity(eslintKey);
    Long effortInMinutes = ruleLoader.ruleConstantDebtMinutes(eslintKey);

    return new Issue(
      eslintKey,
      inputFile,
      location,
      ruleType,
      eslintError.message,
      severity,
      effortInMinutes,
      // todo: this should be the linter name according to org.sonar.api.batch.sensor.issue.NewExternalIssue.engineId
      EslintRulesDefinition.REPOSITORY_KEY
    );
  }

  private static TextRange getLocation(EslintError eslintError, InputFile inputFile) {
    if (eslintError.endLine == 0 || eslintError.isZeroLengthRange()) {
      // eslint can have issues only with start or with zero length range
      return inputFile.selectLine(eslintError.line);
    } else {
      return inputFile.newRange(
        eslintError.line,
        // ESLint location column is 1-based
        eslintError.column - 1,
        eslintError.endLine,
        // ESLint location column is 1-based
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
