/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import java.util.Objects;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.rule.RuleKey;
import org.sonar.plugins.javascript.AbstractChecks;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.api.CustomRuleRepository.Language;

import static org.sonar.plugins.javascript.eslint.EslintBridgeServer.Issue;
import static org.sonar.plugins.javascript.eslint.EslintBridgeServer.IssueLocation;

class EslintBasedIssue {

  private final Issue issue;

  EslintBasedIssue(Issue issue) {
    this.issue = issue;
  }

  void saveIssue(SensorContext context, InputFile file, AbstractChecks checks) {
    NewIssue newIssue = context.newIssue();
    NewIssueLocation location = newIssue.newLocation()
      .message(issue.message)
      .on(file);

    if (issue.endLine != null) {
      location.at(file.newRange(issue.line, issue.column, issue.endLine, issue.endColumn));
    } else {
      if (issue.line != 0) {
        location.at(file.selectLine(issue.line));
      }
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

    RuleKey ruleKey = checks.ruleKeyByEslintKey(issue.ruleId, languageForFile(file));
    if (ruleKey != null) {
      newIssue.at(location)
        .forRule(ruleKey)
        .save();
    }
  }

  private static Language languageForFile(InputFile file) {
    if (Objects.equals(file.language(), TypeScriptLanguage.KEY)) {
      return Language.TYPESCRIPT;
    } else {
      return Language.JAVASCRIPT;
    }
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
}
