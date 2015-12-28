/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.issues;

import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.rule.RuleKey;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;

public class PreciseIssueCompat {

  private PreciseIssueCompat() {
  }

  public static void save(SensorContext sensorContext, InputFile inputFile, RuleKey ruleKey, PreciseIssue issue) {
    NewIssue newIssue = sensorContext.newIssue();

    newIssue
      .forRule(ruleKey)
      .at(newLocation(inputFile, newIssue, issue.primaryLocation()));

    if (issue.cost() != null) {
      newIssue.effortToFix(issue.cost());
    }

    for (IssueLocation secondary : issue.secondaryLocations()) {
      newIssue.addLocation(newLocation(inputFile, newIssue, secondary));
    }
    newIssue.save();
  }


  private static NewIssueLocation newLocation(InputFile inputFile, NewIssue issue, IssueLocation location) {
    TextRange range = inputFile.newRange(
      location.startLine(), location.startLineOffset(), location.endLine(), location.endLineOffset());

    NewIssueLocation newLocation = issue.newLocation()
      .on(inputFile)
      .at(range);

    if (location.message() != null) {
      newLocation.message(location.message());
    }
    return newLocation;
  }

}
