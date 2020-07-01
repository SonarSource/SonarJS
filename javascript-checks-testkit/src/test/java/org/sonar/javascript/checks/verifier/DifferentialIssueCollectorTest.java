/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.checks.verifier;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import org.junit.Before;
import org.junit.Test;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.LineIssue;

import static org.assertj.core.api.Assertions.assertThat;

public class DifferentialIssueCollectorTest extends DoubleDispatchVisitorCheck {

  private LineIssue issue1;
  private LineIssue issue2;
  private List<String> output;
  private File file;
  private ArrayList<Issue> issues;
  private DifferentialIssueCollector collector;
  private ExpectedIssues expectedIssues;

  @Before
  public void setUp() throws Exception {
    file = new File("src/test/resources/bulk-verifier-test/bulk-file-2.js");
    output = new ArrayList<>();
    issues = new ArrayList<>();
    issue1 = new LineIssue(this, 1, "an issue");
    issue2 = new LineIssue(this, 2, "another issue");
    expectedIssues = new ExpectedIssues();
    collector = new DifferentialIssueCollector(expectedIssues, output::add);
  }

  @Test
  public void logsUnexpectedIssue() throws Exception {
    issues.add(issue1);
    collector.writeIssues(issues.iterator(), file);
    assertThat(output).contains(IssueEntry.from(issue1, file).createExcerpt());
  }

  @Test
  public void skipsExpectedIssue() throws Exception {
    issues.add(issue1);
    issues.add(issue2);
    expectedIssues.addExpectation(IssueEntry.from(issue1, file).toId());
    collector.writeIssues(issues.iterator(), file);
    assertThat(output).contains(IssueEntry.from(issue2, file).createExcerpt());
    assertThat(output).doesNotContain(IssueEntry.from(issue1, file).createExcerpt());
  }

  @Test
  public void reportsMissingExpectedIssue() throws Exception {
    final IssueEntry expectedEntry = IssueEntry.from(issue1, file);
    expectedIssues.addExpectation(expectedEntry.toId());
    issues.add(issue2);
    collector.writeIssues(issues.iterator(), file);
    collector.writeSummary();
    assertThat(output).contains(expectedIssues.describeMissingExpectations());
  }
}
