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
package org.sonar.javascript.checks;

import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S3579")
public class AssociativeArraysCheck extends DoubleDispatchVisitorCheck {
  private static final String MESSAGE = "Make \"%s\" an object if it must have named properties; otherwise, use a numeric index here.";

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    if (tree.variable().is(Tree.Kind.BRACKET_MEMBER_EXPRESSION)) {
      BracketMemberExpressionTree memberExpression = (BracketMemberExpressionTree) tree.variable();
      if (memberExpression.object().types().containsOnly(Kind.ARRAY)) {
        ExpressionTree arrayIndex = memberExpression.property();
        if (arrayIndex.types().containsOnly(Kind.STRING)) {
          addIssue(arrayIndex, String.format(MESSAGE, CheckUtils.asString(memberExpression.object())));
        }
      }
    }
    super.visitAssignmentExpression(tree);
  }
}
