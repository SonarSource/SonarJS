/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.issues;

import java.util.List;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.rule.RuleKey;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;

public class PreciseIssue {

  private final SensorContext sensorContext;
  private final InputFile inputFile;
  private final RuleKey ruleKey;
  private final IssueLocation primaryLocation;
  private final List<IssueLocation> secondaryLocations;
  private final Double cost;


  public PreciseIssue(
    SensorContext sensorContext, InputFile inputFile, RuleKey ruleKey,
    IssueLocation location, List<IssueLocation> secondaryLocations, Double cost) {

    this.sensorContext = sensorContext;
    this.inputFile = inputFile;
    this.ruleKey = ruleKey;
    this.primaryLocation = location;
    this.secondaryLocations = secondaryLocations;
    this.cost = cost;
  }

  public static void save(
    SensorContext sensorContext, InputFile inputFile, RuleKey ruleKey,
    IssueLocation location, List<IssueLocation> secondaryLocations, Double cost) {

    PreciseIssue preciseIssue = new PreciseIssue(sensorContext, inputFile, ruleKey, location, secondaryLocations, cost);
    preciseIssue.save();
  }

  private void save() {
    NewIssue newIssue = sensorContext.newIssue();
    newIssue.forRule(ruleKey)
      .at(newLocation(newIssue, primaryLocation))
      .effortToFix(cost);
    for (IssueLocation secondary : secondaryLocations) {
      newIssue.addLocation(newLocation(newIssue, secondary));
    }
    newIssue.save();
  }

  private NewIssueLocation newLocation(NewIssue issue, IssueLocation location) {
    TextRange range = inputFile.newRange(
      location.startLine(), location.startLineOffset(), location.endLine(), location.endLineOffset());
    return issue.newLocation()
      .on(inputFile)
      .at(range)
      .message(location.message());
  }

}
