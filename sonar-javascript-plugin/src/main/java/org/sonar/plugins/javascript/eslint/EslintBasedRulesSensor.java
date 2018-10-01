/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import com.google.common.annotations.VisibleForTesting;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.io.IOException;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptChecks;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonarsource.analyzer.commons.ProgressReport;

public class EslintBasedRulesSensor implements Sensor {

  private static final Logger LOG = Loggers.get(EslintBasedRulesSensor.class);
  private static final Gson GSON = new Gson();
  private final JavaScriptChecks checks;
  private final EslintBridgeServer eslintBridgeServer;
  @VisibleForTesting
  final Rule[] rules;

  private ProgressReport progressReport =
    new ProgressReport("Report about progress of ESLint-based rules", TimeUnit.SECONDS.toMillis(10));

  public EslintBasedRulesSensor(CheckFactory checkFactory, EslintBridgeServer eslintBridgeServer) {
    this.checks = JavaScriptChecks.createJavaScriptCheck(checkFactory)
      .addChecks(CheckList.REPOSITORY_KEY, CheckList.getChecks());

    this.rules = this.checks.eslintBasedChecks().stream()
      .map(check -> new Rule(check.eslintKey(), check.configurations()))
      .toArray(Rule[]::new);

    this.eslintBridgeServer = eslintBridgeServer;
  }

  @Override
  public void execute(SensorContext context) {
    if (rules.length == 0) {
      LOG.debug("Skipping execution of eslint-based rules because none of them are activated");
      return;
    }

    try {
      eslintBridgeServer.deploy();
      eslintBridgeServer.startServer(context);

      Iterable<InputFile> inputFiles = getInputFiles(context);
      startProgressReport(inputFiles);

      for (InputFile inputFile : inputFiles) {
        if (inputFile.filename().endsWith(".vue")) {
          LOG.debug("Skipping analysis of Vue.js file {}", inputFile.uri());
        } else {
          analyze(inputFile, context);
        }
        progressReport.nextFile();
      }
      progressReport.stop();
    } catch (Exception e) {
      LOG.error(e.getMessage());
      LOG.error("Failure during analysis: " + eslintBridgeServer, e);
    } finally {
      progressReport.cancel();
      eslintBridgeServer.clean();
    }
  }

  private void analyze(InputFile file, SensorContext context) {
    AnalysisRequest analysisRequest = new AnalysisRequest(file, rules);
    try {
      String result = eslintBridgeServer.call(GSON.toJson(analysisRequest));
      AnalysisResponseIssue[] issues = toIssues(result);
      for (AnalysisResponseIssue issue : issues) {
        saveIssue(file, context, issue);
      }
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file.uri(), e);
    }
  }

  private static AnalysisResponseIssue[] toIssues(String result) {
    try {
      return GSON.fromJson(result, AnalysisResponseIssue[].class);
    } catch (JsonSyntaxException e) {
      LOG.error("Failed to parse: \n-----\n" + result + "\n-----\n");
      return new AnalysisResponseIssue[0];
    }
  }

  private void saveIssue(InputFile file, SensorContext context, AnalysisResponseIssue issue) {
    NewIssue newIssue = context.newIssue();
    NewIssueLocation location = newIssue.newLocation()
      .message(issue.message)
      .on(file);

    if (issue.endLine != null) {
      location.at(file.newRange(issue.line, issue.column - 1, issue.endLine, issue.endColumn - 1));
    } else {
      location.at(file.selectLine(issue.line));
    }

    newIssue.at(
      location)
      .forRule(ruleKey(issue.ruleId))
      .save();
  }

  private RuleKey ruleKey(String eslintKey) {
    RuleKey ruleKey = checks.ruleKeyByEslintKey(eslintKey);
    if (ruleKey == null) {
      throw new IllegalStateException("No SonarJS rule key found for an eslint-based rule [" + eslintKey + "]");
    }
    return ruleKey;
  }

  private static Iterable<InputFile> getInputFiles(SensorContext sensorContext) {
    FileSystem fileSystem = sensorContext.fileSystem();
    FilePredicate mainFilePredicate = sensorContext.fileSystem().predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
    return fileSystem.inputFiles(mainFilePredicate);
  }

  private void startProgressReport(Iterable<InputFile> inputFiles) {
    Collection<String> files = StreamSupport.stream(inputFiles.spliterator(), false)
      .map(InputFile::toString)
      .collect(Collectors.toList());

    progressReport.start(files);
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(JavaScriptLanguage.KEY)
      .name("SonarJS ESLint-based rules execution")
      .onlyOnFileType(Type.MAIN);
  }

  static class AnalysisRequest {
    String fileUri;
    String fileContent;
    Rule[] rules;

    AnalysisRequest(InputFile file, Rule[] rules) {
      this.fileUri = file.uri().toString();
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

  static class Rule {
    String key;
    List<String> configurations;

    Rule(String key, List<String> configurations) {
      this.key = key;
      this.configurations = configurations;
    }
  }

  static class AnalysisResponseIssue {
    Integer line;
    Integer column;
    Integer endLine;
    Integer endColumn;
    String message;
    String ruleId;
  }

}
