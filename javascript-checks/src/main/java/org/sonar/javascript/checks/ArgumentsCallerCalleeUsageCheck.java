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

import java.util.LinkedList;
import java.util.List;

import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.FunctionDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.MethodDeclarationTree;
import org.sonar.javascript.model.interfaces.expression.DotMemberExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.FunctionExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.Tags;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;

@Rule(
  key = "S2685",
  priority = Priority.CRITICAL,
  tags = {Tags.OBSOLETE})
public class ArgumentsCallerCalleeUsageCheck extends SubscriptionBaseVisitor {

  LinkedList<String> scope = Lists.newLinkedList();
  private static final Kind[] FUNCTION_NODES = {
    Kind.FUNCTION_EXPRESSION,
    Kind.FUNCTION_DECLARATION,
    Kind.GENERATOR_METHOD,
    Kind.METHOD,
    Kind.GENERATOR_DECLARATION,
    Kind.GENERATOR_FUNCTION_EXPRESSION
  };

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.<Kind>builder()
      .add(Kind.DOT_MEMBER_EXPRESSION)
      .add(FUNCTION_NODES)
      .build();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(CheckUtils.functionNodesArray())) {
      IdentifierTree name = getFunctionName(tree);

      if (name != null) {
        scope.add(name.name());
      }

    } else {
      checkExpression((DotMemberExpressionTree) tree);
    }

  }

  private void checkExpression(DotMemberExpressionTree expression) {
    if (!expression.object().is(Kind.IDENTIFIER_REFERENCE) || !expression.property().is(Kind.IDENTIFIER_NAME)) {
      return;
    }

    String object = ((IdentifierTree) expression.object()).name();
    String property = ((IdentifierTree) expression.property()).name();

    if ("caller".equals(property)) {

      if ("arguments".equals(object)) {
        addIssue(expression, "Remove this use of \"arguments.caller\".");
      } else if (scope.contains(object)) {
        addIssue(expression, "Remove this use of \"" + object + ".caller\".");
      }

    } else if ("arguments".equals(property) && scope.contains(object)) {
      addIssue(expression, "Remove this use of \"" + object + ".arguments\".");

    } else if ("callee".equals(property) && "arguments".equals(object)) {
      addIssue(expression, "Name the enclosing function instead of using the deprecated property \"arguments.callee\".");
    }
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(FUNCTION_NODES) && getFunctionName(tree) != null) {
      scope.removeLast();
    }
  }

  public IdentifierTree getFunctionName(Tree tree) {
    if (tree instanceof FunctionExpressionTree) {
      return ((FunctionExpressionTree) tree).name();

    } else if (tree instanceof FunctionDeclarationTree) {
      return ((FunctionDeclarationTree) tree).name();

    } else {
      ExpressionTree name = ((MethodDeclarationTree) tree).name();
      return name instanceof IdentifierTree ? (IdentifierTree) name : null;
    }
  }
}
