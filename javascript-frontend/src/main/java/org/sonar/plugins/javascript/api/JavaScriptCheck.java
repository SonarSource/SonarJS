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
package org.sonar.plugins.javascript.api;

import com.google.common.annotations.Beta;
import java.util.List;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

/**
 * Marker interface for all JavaScript checks.
 */
@Beta
public interface JavaScriptCheck {

  /**
   * Returns new issue which is located on first line of <code>tree</code>
   * @deprecated since 2.14 use {@link JavaScriptCheck#addIssue(Issue)}
   */
  @Deprecated
  LineIssue addLineIssue(Tree tree, String message);

  /**
   *
   * Returns new issue which is instance of {@link PreciseIssue}. Then you can chain this method with following method calls to provide more information about issue:
   * <ul>
   * <li>{@link PreciseIssue#secondary(Tree, String)}, {@link PreciseIssue#secondary(Tree)} (without message) or
   * {@link PreciseIssue#secondary(IssueLocation)} to add secondary location</li>
   * <li>{@link PreciseIssue#cost(double)} to add cost</li>
   * </ul>
   *
   * <p>See example</p>
   * <pre>
   * {@code
   *  newIssue(functionDeclaration, "Remove this function declaration")
   *    .secondary(call, "Function call")
   *    .secondary(redefinition, "Function redefinition")
   *    .cost(functionDeclaration.parameters().parameters().size());
   * }
   * </pre>
   *
   * To create new issue you also can use {@link JavaScriptCheck#addIssue(Issue)}: <pre>getContext().addIssue(new FileIssue(this, "Some message"))</pre>
   *
   * @param tree primary location of issue
   * @param message primary message
   * @return new issue
   *
   */
  PreciseIssue addIssue(Tree tree, String message);

  /**
   * Use this method only to add specific kind of issue.
   * E.g. you can use this method to add issue on file level, line issue or precise issue with sophisticated primary location.<p>
   * Otherwise please use {@link org.sonar.plugins.javascript.api.JavaScriptCheck#addIssue(Tree, String)}</li>
   * </ul>
   */
  <T extends Issue> T addIssue(T issue);

  List<Issue> scanFile(TreeVisitorContext context);
}
