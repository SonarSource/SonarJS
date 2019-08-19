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

import com.google.common.annotations.VisibleForTesting;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.io.IOException;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
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
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptChecks;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonarsource.analyzer.commons.ProgressReport;
import org.sonarsource.nodejs.NodeCommandException;

public class EslintBasedRulesSensor implements Sensor {

  private static final Logger LOG = Loggers.get(EslintBasedRulesSensor.class);
  private static final Gson GSON = new Gson();
  private final JavaScriptChecks checks;
  private final EslintBridgeServer eslintBridgeServer;
  private final AnalysisWarnings analysisWarnings;
  @VisibleForTesting
  final Rule[] rules;

  private ProgressReport progressReport =
    new ProgressReport("Report about progress of ESLint-based rules", TimeUnit.SECONDS.toMillis(10));

  public EslintBasedRulesSensor(CheckFactory checkFactory, EslintBridgeServer eslintBridgeServer, @Nullable AnalysisWarnings analysisWarnings) {
    this.checks = JavaScriptChecks.createJavaScriptCheck(checkFactory)
      .addChecks(CheckList.REPOSITORY_KEY, CheckList.getChecks());

    this.rules = this.checks.eslintBasedChecks().stream()
      .map(check -> new Rule(check.eslintKey(), check.configurations()))
      .toArray(Rule[]::new);

    this.eslintBridgeServer = eslintBridgeServer;
    this.analysisWarnings = analysisWarnings;
  }

  @Override
  public void execute(SensorContext context) {
    if (rules.length == 0) {
      LOG.debug("Skipping execution of eslint-based rules because none of them are activated");
      return;
    }
    try {
      eslintBridgeServer.startServerLazily(context);
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
    } catch (ServerAlreadyFailedException e) {
      LOG.debug("Skipping start of eslint-bridge server due to the failure during first analysis");
      LOG.debug("Skipping execution of eslint-based rules due to the problems with eslint-bridge server");

    } catch (NodeCommandException e) {
      LOG.error(e.getMessage(), e);
      if (analysisWarnings != null) {
        analysisWarnings.addUnique("Some JavaScript rules were not executed. " + e.getMessage());
      }
    } catch (Exception e) {
      LOG.error("Failure during analysis, " + eslintBridgeServer.getCommandInfo(), e);
    } finally {
      progressReport.cancel();
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
      location.at(file.newRange(issue.line, issue.column, issue.endLine, issue.endColumn));
    } else {
      location.at(file.selectLine(issue.line));
    }

    issue.secondaryLocations.forEach(secondary -> {
      NewIssueLocation newIssueLocation = newSecondaryLocation(file, newIssue, secondary);
      if (newIssueLocation != null) {
        newIssue.addLocation(newIssueLocation);
      }
    });

    if (issue.cost != null) {
      newIssue.gap(issue.cost);
    }

    Optional<RuleKey> ruleKeyOptional = ruleKey(issue.ruleId);
    ruleKeyOptional.ifPresent(ruleKey ->
      newIssue.at(location)
      .forRule(ruleKey)
      .save());
  }

  private static NewIssueLocation newSecondaryLocation(InputFile inputFile, NewIssue issue, IssueLocation location) {
    NewIssueLocation newIssueLocation = issue.newLocation().on(inputFile);

    if (location.line != null && location.endLine != null && location.column != null && location.endColumn != null) {
      newIssueLocation.at(inputFile.newRange(location.line, location.column, location.endLine, location.endColumn));
      if (location.message != null) {
        newIssueLocation.message(location.message);
      }
      return newIssueLocation;
    }
    return null;
  }

  @VisibleForTesting
  Optional<RuleKey> ruleKey(String eslintKey) {
    RuleKey ruleKey = checks.ruleKeyByEslintKey(eslintKey);
    if (ruleKey == null) {
      // for eslint rules activated by comment (e.g. `/*eslint no-magic-numbers: "error"*/`)
      return Optional.empty();
    }
    return Optional.of(ruleKey);
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
      .name("ESLint-based SonarJS")
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
    List<IssueLocation> secondaryLocations;
    Double cost;
  }

  static class IssueLocation {
    Integer line;
    Integer column;
    Integer endLine;
    Integer endColumn;
    String message;
  }

}
