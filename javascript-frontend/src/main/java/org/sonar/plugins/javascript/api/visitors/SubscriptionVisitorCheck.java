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
package org.sonar.plugins.javascript.api.visitors;

import com.google.common.annotations.Beta;
import java.util.ArrayList;
import java.util.List;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.Tree;

@Beta
public abstract class SubscriptionVisitorCheck extends SubscriptionVisitor implements JavaScriptCheck {

  private List<Issue> issues;

  @Override
  public List<Issue> scanFile(TreeVisitorContext context){
    issues = new ArrayList<>();
    scanTree(context);
    return issues;
  }

  @Override
  public LineIssue addLineIssue(Tree tree, String message) {
    return addIssue(new LineIssue(this, tree, message));
  }

  @Override
  public PreciseIssue addIssue(Tree tree, String message) {
    PreciseIssue preciseIssue = new PreciseIssue(this, new IssueLocation(tree, message));
    addIssue(preciseIssue);
    return preciseIssue;
  }

  @Override
  public <T extends Issue> T addIssue(T issue) {
    issues.add(issue);
    return issue;
  }

}
