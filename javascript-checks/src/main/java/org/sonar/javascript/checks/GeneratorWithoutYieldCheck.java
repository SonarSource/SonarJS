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
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.GeneratorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3531",
  name = "Generators should \"yield\" something",
  priority = Priority.MAJOR,
  tags = {Tags.ES2015, Tags.SUSPICIOUS})
@ActivatedByDefault
@SqaleConstantRemediation("5min")
public class GeneratorWithoutYieldCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Add a \"yield\" statement to this generator.";

  private Deque<Boolean> hasYieldStack = new ArrayDeque<>();

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
      Kind.GENERATOR_DECLARATION,
      Kind.GENERATOR_METHOD,
      Kind.GENERATOR_FUNCTION_EXPRESSION,

      Kind.YIELD_EXPRESSION
    );
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.YIELD_EXPRESSION)) {
      hasYieldStack.removeLast();
      hasYieldStack.addLast(true);

    } else {
      hasYieldStack.addLast(false);
    }
  }

  @Override
  public void leaveNode(Tree tree) {
    if (!tree.is(Kind.YIELD_EXPRESSION)) {
      boolean hasYield = hasYieldStack.removeLast();
      if (!hasYield) {
        addIssue(new PreciseIssue(this, getPrimaryLocation(tree)));
      }
    }
  }

  private static IssueLocation getPrimaryLocation(Tree tree) {
    Tree firstTree;
    Tree lastTree;

    if (tree.is(Kind.GENERATOR_DECLARATION)) {
      FunctionDeclarationTree functionDeclarationTree = (FunctionDeclarationTree) tree;
      firstTree = functionDeclarationTree.functionKeyword();
      lastTree = functionDeclarationTree.name();

    } else if (tree.is(Kind.GENERATOR_METHOD)) {
      GeneratorMethodDeclarationTree methodDeclarationTree = (GeneratorMethodDeclarationTree) tree;
      firstTree = methodDeclarationTree.starToken();
      lastTree = methodDeclarationTree.name();

    } else {
      FunctionExpressionTree functionExpressionTree = (FunctionExpressionTree) tree;
      firstTree = functionExpressionTree.functionKeyword();
      if (functionExpressionTree.name() != null) {
        lastTree = functionExpressionTree.name();
      } else {
        lastTree = functionExpressionTree.star();
      }
    }

    return new IssueLocation(firstTree, lastTree, MESSAGE);
  }
}
