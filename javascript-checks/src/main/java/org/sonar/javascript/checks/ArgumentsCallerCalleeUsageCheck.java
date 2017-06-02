/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
import com.google.common.collect.Lists;
import java.util.LinkedList;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "S2685")
public class ArgumentsCallerCalleeUsageCheck extends SubscriptionVisitorCheck {

  private static final String ARGUMENTS = "arguments";
  private static final String CALLER = "caller";
  private static final String CALLEE = "callee";

  LinkedList<String> scope = Lists.newLinkedList();

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.<Kind>builder()
      .add(Kind.DOT_MEMBER_EXPRESSION)
      .addAll(KindSet.FUNCTION_KINDS.getSubKinds())
      .build();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(KindSet.FUNCTION_KINDS)) {
      Tree name = ((FunctionTree) tree).name();

      if (name != null) {
        scope.add(CheckUtils.asString(name));
      }

    } else {
      checkExpression((DotMemberExpressionTree) tree);
    }
  }

  private void checkExpression(DotMemberExpressionTree expression) {
    if (!expression.object().is(Kind.IDENTIFIER_REFERENCE) || !expression.property().is(Kind.PROPERTY_IDENTIFIER)) {
      return;
    }

    String object = ((IdentifierTree) expression.object()).name();
    String property = (expression.property()).name();

    if (ARGUMENTS.equals(object)) {
      checkArgumentsProperty(expression, property);

    } else if (scope.contains(object)) {
      checkFunctionsProperty(expression, object, property);
    }
  }

  private void checkFunctionsProperty(Tree tree, String object, String property) {
    if (CALLER.equals(property)) {
      addIssue(tree, "Remove this use of \"" + object + ".caller\".");

    } else if (ARGUMENTS.equals(property)) {
      addIssue(tree, "Remove this use of \"" + object + ".arguments\".");
    }
  }

  private void checkArgumentsProperty(Tree tree, String property) {
    if (CALLER.equals(property)) {
      addIssue(tree, "Remove this use of \"arguments.caller\".");

    } else if (CALLEE.equals(property)) {
      addIssue(tree, "Name the enclosing function instead of using the deprecated property \"arguments.callee\".");
    }
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(KindSet.FUNCTION_KINDS) && ((FunctionTree) tree).name() != null) {
      scope.removeLast();
    }
  }
}
