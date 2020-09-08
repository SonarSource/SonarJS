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

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArgumentListTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@JavaScriptRule
@Rule(key = "S1154")
public class UselessStringOperationCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "%s is an immutable object; you must either store or return the result of the operation.";

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(Kind.EXPRESSION_STATEMENT);
  }

  @Override
  public void visitNode(Tree tree) {
    Tree expression = ((ExpressionStatementTree) tree).expression();

    if (expression.is(Kind.CALL_EXPRESSION)) {
      ExpressionTree callee = ((CallExpressionTree) expression).callee();

      if (callee.is(Kind.DOT_MEMBER_EXPRESSION)) {
        DotMemberExpressionTree memberExpression = (DotMemberExpressionTree) callee;

        if (memberExpression.object().types().containsOnly(Type.Kind.STRING)
          && !isReplaceExclusion(memberExpression.property(), ((CallExpressionTree) expression).argumentClause())) {
          addIssue(memberExpression.property(), String.format(MESSAGE, getVariable(memberExpression)));
        }
      }
    }
  }

  private static boolean isReplaceExclusion(IdentifierTree property, ArgumentListTree arguments) {
    if ("replace".equals(property.name()) && arguments.arguments().size() == 2) {
      Tree secondArgument = arguments.arguments().get(1);
      return !((ExpressionTree) secondArgument).types().containsOnly(Type.Kind.STRING);
    }

    return false;
  }

  private static String getVariable(MemberExpressionTree memberExpression) {
    String variableName = CheckUtils.asString(memberExpression.object());
    if (variableName.length() > 30) {
      variableName = "String";
    }
    return variableName;
  }

}
