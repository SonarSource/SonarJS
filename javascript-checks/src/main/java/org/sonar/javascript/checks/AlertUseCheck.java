/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableSet;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.JavaScriptFile;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

@Rule(key = "S1442")
public class AlertUseCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this usage of %s(...).";
  private static final Set<String> OPEN_DIALOG_METHODS = ImmutableSet.of("alert", "prompt", "confirm");

  @Override
  public List<Issue> scanFile(TreeVisitorContext context) {
    JavaScriptFile jsFile = context.getJavaScriptFile();
    if (jsFile.fileName().equals("file.js")) {
      addIssue(context.getTopTree(), "Issue on specific file.");
    }
    return super.scanFile(context);
  }

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    ExpressionTree callee = tree.callee();
    if (callee.is(Kind.IDENTIFIER_REFERENCE) && OPEN_DIALOG_METHODS.contains(((IdentifierTree) callee).name())) {
      addIssue(tree, String.format(MESSAGE, ((IdentifierTree) callee).name()));
    }

    super.visitCallExpression(tree);
  }

}
