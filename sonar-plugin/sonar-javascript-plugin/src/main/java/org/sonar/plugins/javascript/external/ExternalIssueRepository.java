/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import java.io.File;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import javax.annotation.Nullable;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.bridge.BridgeServer;

/**
 * This is the application of the Repository Pattern.
 *
 * In a proper Domain-Driven project, the repository implementation is hosted by the Infrastructure layer,
 * and its purpose is to serve as a delegate between the Domain and the persistence layer.
 * We can fit this class into the pattern, using the following rationalizations:
 *
 * * The `Issue` instance is the Domain entity - i.e. the Conceptual entity of the Conceptual Data Model
 * * The `SensorContext` instance is the persistence layer - i.e. SonarQube is the infrastructure Host, which provides the persistence layer through the `NewExternalIssue` class
 */
public class ExternalIssueRepository {

  private ExternalIssueRepository() {}

  /**
   * Persist the passed issue into the passed context, using the passed rule repository key to resolve the belonging rule.
   */
  public static void save(ExternalIssue issue, SensorContext context) {
    var file = issue.file();
    var newIssue = context.newExternalIssue();
    var newLocation = newIssue.newLocation();

    newLocation.on(file);

    if (issue.message() != null) {
      newLocation.message(issue.message());
    }

    newLocation.at(
      file.newRange(
        issue.location().start().line(),
        issue.location().start().lineOffset(),
        issue.location().end().line(),
        issue.location().end().lineOffset()
      )
    );

    newIssue
      .severity(issue.severity())
      .remediationEffortMinutes(issue.effort())
      .at(newLocation)
      .engineId(issue.engineId())
      .ruleId(issue.name())
      .type(issue.type())
      .save();
  }

  public static void dedupeAndSaveESLintIssues(
    SensorContext context,
    Map<String, List<ExternalIssue>> externalIssuesMap,
    List<BridgeServer.Issue> issues
  ) {
    var externalIssues = externalIssuesMap.values().stream().flatMap(List::stream).toList();
    if (!externalIssues.isEmpty()) {
      var deduplicatedExternalIssues = ExternalIssueRepository.deduplicateIssues(
        externalIssues,
        issues
      );
      saveESLintIssues(context, deduplicatedExternalIssues);
    }
  }

  public static void saveESLintIssues(SensorContext context, List<ExternalIssue> externalIssues) {
    for (var externalIssue : externalIssues) {
      ExternalIssueRepository.save(externalIssue, context);
    }
  }

  public static List<ExternalIssue> deduplicateIssues(
    @Nullable List<ExternalIssue> externalIssues,
    List<BridgeServer.Issue> issues
  ) {
    if (externalIssues == null) {
      return List.of();
    }
    var deduplicatedIssues = new ArrayList<ExternalIssue>();
    // normalize issues of JS/TS analyzer into a set of strings
    var normalizedIssues = new HashSet<>();
    for (BridgeServer.Issue issue : issues) {
      for (String ruleKey : issue.ruleESLintKeys()) {
        String issueKey = String.format(
          "%s-%s-%d-%d-%d-%d",
          ruleKey,
          issue.filePath().replaceAll(Pattern.quote(File.separator), "/"),
          issue.line(),
          issue.column(),
          issue.endLine(),
          issue.endColumn()
        );
        normalizedIssues.add(issueKey);
      }
    }
    // at that point, we have the list of issues that were persisted
    // we can now persist the ESLint issues that match none of the persisted issues
    for (var externalIssue : externalIssues) {
      var issueKey = String.format(
        "%s-%s-%d-%d-%d-%d",
        externalIssue.name(),
        externalIssue.file().absolutePath().replaceAll(Pattern.quote(File.separator), "/"),
        externalIssue.location().start().line(),
        externalIssue.location().start().lineOffset(),
        externalIssue.location().end().line(),
        externalIssue.location().end().lineOffset()
      );

      if (!normalizedIssues.contains(issueKey)) {
        deduplicatedIssues.add(externalIssue);
      }
    }
    return deduplicatedIssues;
  }
}
