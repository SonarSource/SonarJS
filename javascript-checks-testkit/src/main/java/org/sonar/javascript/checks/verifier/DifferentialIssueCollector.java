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
import java.util.Iterator;
import java.util.function.Consumer;
import org.sonar.plugins.javascript.api.visitors.Issue;

public class DifferentialIssueCollector implements IssueCollector {

  private final ExpectedIssues expectedIssues;
  private final Consumer<String> output;

  public DifferentialIssueCollector(ExpectedIssues expectedIssues, Consumer<String> output) {
    this.expectedIssues = expectedIssues;
    this.output = output;
  }

  @Override
  public synchronized void writeIssues(Iterator<Issue> issues, File file) {
    while (issues.hasNext()) {
      Issue issue = issues.next();
      IssueEntry entry = IssueEntry.from(issue, file);
      if (!expectedIssues.expects(entry)) {
        output.accept(entry.createExcerpt());
      }
    }
  }

  @Override
  public void writeSummary() {
    output.accept(expectedIssues.describeMissingExpectations());
  }
}
