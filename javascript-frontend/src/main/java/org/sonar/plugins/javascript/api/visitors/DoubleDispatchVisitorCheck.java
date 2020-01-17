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
package org.sonar.plugins.javascript.api.visitors;

import java.util.List;
import org.sonar.javascript.visitors.Issues;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.Tree;

public abstract class DoubleDispatchVisitorCheck extends DoubleDispatchVisitor implements JavaScriptCheck {

  private Issues issues = new Issues(this);

  @Override
  public List<Issue> scanFile(TreeVisitorContext context){
    issues.reset();
    scanTree(context);
    return issues.getList();
  }

  /**
   * @deprecated see {@link JavaScriptCheck#addLineIssue(Tree, String)}
   */
  @Override
  @Deprecated
  public LineIssue addLineIssue(Tree tree, String message) {
    return issues.addLineIssue(tree, message);
  }

  @Override
  public PreciseIssue addIssue(Tree tree, String message) {
    return issues.addIssue(tree, message);
  }

  @Override
  public <T extends Issue> T addIssue(T issue) {
    return issues.addIssue(issue);
  }

}
