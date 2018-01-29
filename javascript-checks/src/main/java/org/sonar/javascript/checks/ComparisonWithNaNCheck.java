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
import java.util.Set;
import javax.annotation.CheckForNull;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "S2688")
public class ComparisonWithNaNCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Use a test of the format \"a %s a\" instead.";
  private static final String NAN = "NaN";

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.copyOf(KindSet.EQUALITY_KINDS.getSubKinds());
  }

  @Override
  public void visitNode(Tree tree) {
    BinaryExpressionTree expression = (BinaryExpressionTree) tree;
    ExpressionTree nan = getNaN(expression);

    if (nan != null) {
      addIssue(nan, String.format(MESSAGE, expression.operatorToken().text()))
        .secondary(expression.operatorToken());
    }
  }

  /**
   * Returns true for "NaN" and "Number.NaN"
   */
  private static boolean isNaN(ExpressionTree expression) {
    if (expression.is(Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree memberExpression = (DotMemberExpressionTree) expression;
      return isIdentifier(memberExpression.object(), "Number") && isIdentifier(memberExpression.property(), NAN);
    } else {
      return isIdentifier(expression, NAN);
    }
  }

  private static boolean isIdentifier(Tree tree, String value) {
    return tree instanceof IdentifierTree && value.equals(((IdentifierTree) tree).name());
  }

  @CheckForNull
  private static ExpressionTree getNaN(BinaryExpressionTree expression) {
    if (isNaN(expression.leftOperand())) {
      return expression.leftOperand();
    } else if (isNaN(expression.rightOperand())) {
      return expression.rightOperand();
    }

    return null;
  }

}
