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

import static org.sonar.plugins.javascript.utils.UnicodeEscape.unicodeEscape;

import org.sonar.api.batch.sensor.SensorContext;

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
  public static void save(Issue issue, SensorContext context) {
    var file = issue.file();
    var newIssue = context.newExternalIssue();
    var newLocation = newIssue.newLocation();

    newLocation.on(file);

    if (issue.message() != null) {
      var escapedMsg = unicodeEscape(issue.message());
      newLocation.message(escapedMsg);
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
}
