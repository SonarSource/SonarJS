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

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import org.sonar.api.server.rule.RulesDefinition;
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
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.LinkedList;
import java.util.List;

@Rule(
  key = "S2685",
  name = "\"arguments.caller\" and \"arguments.callee\" should not be used",
  priority = Priority.CRITICAL,
  tags = {Tags.OBSOLETE})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("30min")
public class ArgumentsCallerCalleeUsageCheck extends SubscriptionBaseVisitor {

  private static final String ARGUMENTS = "arguments";
  private static final String CALLER = "caller";
  private static final String CALLEE = "callee";

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
