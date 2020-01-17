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
package org.sonar.javascript.se;

import com.google.common.collect.ImmutableList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.visitors.Issues;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

/**
 * Extend this class to implement a new check based on symbolic execution.
 */
public class SeCheck implements JavaScriptCheck {

  private Issues issues = new Issues(this);

  private TreeVisitorContext context;

  /**
   * Override this method to check the constraints on conditions (TRUTHY or FALSY) in current execution (aka function scope).
   * This method is called after end of execution. Note that it's not called if execution was not finished due reaching the execution limit.
   */
  public void checkConditions(Map<Tree, Collection<Constraint>> conditions) {
    // do nothing by default
  }

  /**
   * Override this method to perform actions before executing <code>element</code>.
   * This method is called before each element until end of execution or reaching the execution limit.
   * @param currentState current state at the program point preceding <code>element</code>
   * @param element syntax tree to be executed next
   * @param programPoint current programPoint associated to the element
   */
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    // do nothing by default
  }

  /**
   * Override this method to perform actions after executing <code>element</code>.
   * This method is called after each element until end of execution or reaching the execution limit.
   * @param currentState current state at the program point following <code>element</code>
   * @param element last executed syntax tree
   */
  public void afterBlockElement(ProgramState currentState, Tree element) {
    // do nothing by default
  }

  public void cleanupAndStartFileAnalysis(ScriptTree scriptTree) {
    this.issues.reset();
    this.startOfFile(scriptTree);
  }

  /**
   * Override this method to perform actions before any analysis is performed
   *
   * @param scriptTree the scriptTree that is going to be analyzed
   */
  protected void startOfFile(ScriptTree scriptTree) {
    // do nothing by default
  }

  public void endOfFile(ScriptTree scriptTree) {
    // do nothing by default
  }

  /**
   * Override this method to perform actions when the execution is finished.
   * This method is called for each execution, i.e. for each function in the file.
   * Note this method is not called if the execution limit was reached.
   * @param functionScope scope corresponding to the function which was executed
   */
  public void endOfExecution(Scope functionScope) {
    // do nothing by default
  }

  /**
   * Override this method to perform actions before the start of execution.
   * This method is called for each execution, i.e. for each function in the file.
   * Note this method is called even if the execution limit was reached later.
   * @param functionScope scope corresponding to the function which will be executed
   */
  public void startOfExecution(Scope functionScope) {
    // do nothing by default
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

  @Override
  public List<Issue> scanFile(TreeVisitorContext context) {
    List<Issue> result = ImmutableList.copyOf(issues.getList());
    issues.reset();
    return result;
    // we might add method "getIssue" to this class and use it instead of this one in SeCheckDispatcher
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

  public void setContext(TreeVisitorContext context) {
    this.context = context;
  }

  public TreeVisitorContext getContext() {
    return context;
  }
}
