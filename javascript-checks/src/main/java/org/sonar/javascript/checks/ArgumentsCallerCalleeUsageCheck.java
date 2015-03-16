/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import java.util.List;

import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.DotMemberExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.Tags;

import com.google.common.collect.ImmutableList;

@Rule(
  key = "S2685",
  priority = Priority.CRITICAL,
  tags = {Tags.OBSOLETE})
public class ArgumentsCallerCalleeUsageCheck extends SubscriptionBaseVisitor {

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Kind.DOT_MEMBER_EXPRESSION);
  }

  @Override
  public void visitNode(Tree tree) {
    DotMemberExpressionTree expression = (DotMemberExpressionTree) tree;

    if (isExpressionIdentifierNamed(expression.object(), "arguments")) {

      if (isExpressionIdentifierNamed(expression.property(), "callee")) {
        addIssue(tree, "Name the enclosing function instead of using the deprecated property \"arguments.callee\".");

      } else if (isExpressionIdentifierNamed(expression.property(), "caller")) {
        addIssue(tree, "Remove this use of \"arguments.caller\".");
      }
    }

  }

  private static boolean isExpressionIdentifierNamed(ExpressionTree tree, String name) {
    return tree instanceof IdentifierTree && name.equals(((IdentifierTree) tree).name());
  }

}
