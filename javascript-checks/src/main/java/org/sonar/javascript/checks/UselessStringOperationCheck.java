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
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableList;
import java.util.List;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S1154",
  name = "Results of operations on strings should not be ignored",
  priority = Priority.BLOCKER,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("20min")
public class UselessStringOperationCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "%s is an immutable object; you must either store or return the result of the operation.";

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Kind.EXPRESSION_STATEMENT);
  }

  @Override
  public void visitNode(Tree tree) {
    Tree expression = ((ExpressionStatementTree) tree).expression();

    if (expression.is(Kind.CALL_EXPRESSION)) {
      ExpressionTree callee = ((CallExpressionTree) expression).callee();

      if (callee.is(Kind.DOT_MEMBER_EXPRESSION)) {
        DotMemberExpressionTree memberExpression = (DotMemberExpressionTree) callee;

        if (memberExpression.object().types().containsOnly(Type.Kind.STRING)
          && !isReplaceExclusion(memberExpression.property(), ((CallExpressionTree) expression).arguments())) {
          addLineIssue(tree, String.format(MESSAGE, getVariable(memberExpression)));
        }
      }
    }
  }

  private static boolean isReplaceExclusion(IdentifierTree property, ParameterListTree arguments) {
    if ("replace".equals(property.name()) && arguments.parameters().size() == 2) {
      Tree secondArgument = arguments.parameters().get(1);
      return secondArgument instanceof ExpressionTree && !((ExpressionTree) secondArgument).types().containsOnly(Type.Kind.STRING);
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
