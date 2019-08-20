/*
 * SonarTS
 * Copyright (C) 2017-2019 SonarSource SA
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
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Severity;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.issue.NewExternalIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugin.typescript.TypeScriptRules;
import org.sonar.plugins.javascript.rules.TSLintRulesDefinition;
import org.sonarsource.analyzer.commons.ExternalReportProvider;

import static org.sonar.plugin.typescript.TypeScriptPlugin.TSLINT_REPORT_PATHS;

public class TslintReportSensor implements Sensor {

  private static final Logger LOG = Loggers.get(TslintReportSensor.class);
  protected static final Gson gson = new Gson();

  private static final long DEFAULT_REMEDIATION_COST = 5L;
  private static final Severity DEFAULT_SEVERITY = Severity.MAJOR;
  private static final String LINER_NAME = "TSLint";
  private static final String FILE_EXCEPTION_MESSAGE = "No issues information will be saved as the report file can't be read.";

  // key - tslint key, value - SQ key
  private final Map<String, String> activatedRules = new HashMap<>();

  static final String REPOSITORY = "tslint";

  public TslintReportSensor(CheckFactory checkFactory) {
    TypeScriptRules typeScriptRules = new TypeScriptRules(checkFactory);
    typeScriptRules.forEach(typeScriptRule -> {
      if (typeScriptRule.isEnabled()) {
        String tsLintKey = typeScriptRule.tsLintKey();
        activatedRules.put(tsLintKey, typeScriptRules.ruleKeyFromTsLintKey(tsLintKey).toString());
      }
    });
  }

  @Override
  public void describe(SensorDescriptor sensorDescriptor) {
    sensorDescriptor
      .onlyWhenConfiguration(conf -> conf.hasKey(TSLINT_REPORT_PATHS))
      .name("Import of " + LINER_NAME + " issues");
  }

  @Override
  public void execute(SensorContext context) {
    List<File> reportFiles = ExternalReportProvider.getReportFiles(context, TSLINT_REPORT_PATHS);
    for (File reportFile : reportFiles) {
      importReport(reportFile, context);
    }
  }

  private static InputFile getInputFile(SensorContext context, String fileName) {
    FilePredicates predicates = context.fileSystem().predicates();
    InputFile inputFile = context.fileSystem().inputFile(predicates.hasPath(fileName));
    if (inputFile == null) {
      LOG.warn("No input file found for {}. No {} issues will be imported on this file.", fileName, LINER_NAME);
      return null;
    }
    return inputFile;
  }

  private void importReport(File report, SensorContext context) {
    LOG.info("Importing {}", report.getAbsoluteFile());

    try (InputStreamReader inputStreamReader = new InputStreamReader(new FileInputStream(report), StandardCharsets.UTF_8)) {
      TslintError[] tslintErrors = gson.fromJson(inputStreamReader, TslintError[].class);
      for (TslintError tslintError : tslintErrors) {
        saveTslintError(context, tslintError);
      }
    } catch (IOException e) {
      LOG.error(FILE_EXCEPTION_MESSAGE, e);
    }
  }

  private void saveTslintError(SensorContext context, TslintError tslintError) {
    String tslintKey = tslintError.ruleName;

    if (activatedRules.containsKey(tslintKey)) {
      String message = "TSLint issue for rule '{}' is skipped because this rule is activated in your SonarQube profile for TypeScript (rule key in SQ {})";
      LOG.debug(message, tslintKey, activatedRules.get(tslintKey));
      return;
    }

    InputFile inputFile = getInputFile(context, tslintError.name);
    if (inputFile == null) {
      return;
    }
    NewExternalIssue newExternalIssue = context.newExternalIssue();

    NewIssueLocation primaryLocation = newExternalIssue.newLocation()
      .message(tslintError.failure)
      .on(inputFile)
      .at(getLocation(tslintError, inputFile));

    newExternalIssue
      .at(primaryLocation)
      .forRule(RuleKey.of(REPOSITORY, tslintKey))
      .type(TSLintRulesDefinition.ruleType(tslintKey))
      .severity(DEFAULT_SEVERITY)
      .remediationEffortMinutes(DEFAULT_REMEDIATION_COST)
      .save();
  }

  private static TextRange getLocation(TslintError tslintError, InputFile inputFile) {
    if (samePosition(tslintError.startPosition, tslintError.endPosition)) {
      // tslint allows issue location with 0 length, SonarQube doesn't allow that
      return inputFile.selectLine(tslintError.startPosition.line + 1);
    } else {
      return inputFile.newRange(
        tslintError.startPosition.line + 1,
        tslintError.startPosition.character,
        tslintError.endPosition.line + 1,
        tslintError.endPosition.character);
    }
  }

  private static boolean samePosition(TslintPosition p1, TslintPosition p2) {
    return p1.line == p2.line && p1.character == p2.character;
  }

  private static class TslintError {
    TslintPosition startPosition;
    TslintPosition endPosition;
    String failure;
    String name;
    String ruleName;
  }

  private static class TslintPosition {
    int character;
    int line;
  }
}
