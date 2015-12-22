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
package org.sonar.plugins.javascript.utils;

import com.google.common.collect.Lists;
import java.util.List;
import org.sonar.api.component.Component;
import org.sonar.api.issue.Issuable;
import org.sonar.api.issue.Issue;

public class IssuableMock implements Issuable {

  private List<Issue> issues = Lists.newArrayList();

  @Override
  public IssueBuilder newIssueBuilder() {
    return new IssueBuilderMock();
  }

  @Override
  public boolean addIssue(Issue issue) {
    return issues.add(issue);
  }

  @Override
  public List<Issue> issues() {
    return issues;
  }

  @Override
  public List<Issue> resolvedIssues() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public Component component() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

}
