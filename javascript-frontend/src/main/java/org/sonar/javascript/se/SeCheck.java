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
package org.sonar.javascript.se;

import com.google.common.collect.ImmutableList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.visitors.Issues;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

public class SeCheck implements JavaScriptCheck {

  private Issues issues = new Issues(this);

  public void checkConditions(Map<Tree, Collection<Truthiness>> conditions) {
    // do nothing by default
  }

  public void beforeBlockElement(ProgramState currentState, Tree element) {
    // do nothing by default
  }

  public void afterBlockElement(ProgramState currentState, Tree element) {
    // do nothing by default
  }

  /**
   * Method is called when the execution finished before reaching limit
   */
  public void endOfExecution(Scope functionScope) {
    // do nothing by default
  }

  public void startOfExecution(Scope functionScope) {
    // do nothing by default
  }

  @Override
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

  @Override
  public List<Issue> scanFile(TreeVisitorContext context) {
    List<Issue> result = ImmutableList.copyOf(issues.getList());
    issues.reset();
    return result;
    // we might add method "getIssue" to this class and use it instead of this one in SeCheckDispatcher
  }
}
