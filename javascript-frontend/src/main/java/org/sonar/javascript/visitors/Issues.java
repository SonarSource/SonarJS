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
package org.sonar.javascript.visitors;

import java.util.ArrayList;
import java.util.List;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

public class Issues {

  private List<Issue> issueList;
  private JavaScriptCheck check;

  public Issues(JavaScriptCheck check) {
    this.check = check;
    this.issueList = new ArrayList<>();
  }

  public LineIssue addLineIssue(Tree tree, String message) {
    return addIssue(new LineIssue(check, tree, message));
  }

  public PreciseIssue addIssue(Tree tree, String message) {
    PreciseIssue preciseIssue = new PreciseIssue(check, new IssueLocation(tree, message));
    addIssue(preciseIssue);
    return preciseIssue;
  }

  public <T extends Issue> T addIssue(T issue) {
    issueList.add(issue);
    return issue;
  }

  public List<Issue> getList() {
    return issueList;
  }

  public void reset() {
    issueList = new ArrayList<>();
  }
}
