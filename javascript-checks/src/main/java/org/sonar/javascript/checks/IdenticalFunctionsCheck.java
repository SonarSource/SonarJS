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

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

import static org.sonar.javascript.tree.SyntacticEquivalence.areEquivalent;

@Rule(key = "S4144")
public class IdenticalFunctionsCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Update this function so that its implementation is not identical to the one on line %s.";


  private final List<BlockTree> functionBlocks = new ArrayList<>();

  @Override
  public Set<Kind> nodesToVisit() {
    return KindSet.FUNCTION_KINDS.getSubKinds();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    functionBlocks.clear();
  }

  @Override
  public void leaveFile(Tree scriptTree) {
    if (functionBlocks.size() < 2) {
      return;
    }

    for (int i = 1; i < functionBlocks.size(); i++) {
      BlockTree duplicatingFunctionBlock = functionBlocks.get(i);

      for (int j = 0; j < i; j++) {
        BlockTree originalFunctionBlock = functionBlocks.get(j);

        if (areEquivalent(duplicatingFunctionBlock, originalFunctionBlock)) {

          Tree originalFunctionIssueNode = functionTreeIssueNode((FunctionTree) originalFunctionBlock.parent());
          String message = String.format(MESSAGE, originalFunctionIssueNode.firstToken().line());
          Tree duplicatingFunctionIssueNode = functionTreeIssueNode((FunctionTree) duplicatingFunctionBlock.parent());

          addIssue(duplicatingFunctionIssueNode, message)
            .secondary(originalFunctionIssueNode, "original implementation");
          break;
        }
      }
    }

  }

  private static Tree functionTreeIssueNode(FunctionTree functionTree) {
    if (functionTree.is(Kind.ARROW_FUNCTION)) {
      return ((ArrowFunctionTree) functionTree).doubleArrowToken();
    } else if (functionTree.is(Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION)) {
      return ((FunctionExpressionTree) functionTree).functionKeyword();
    } else {
      return functionTree.name();
    }
  }

  @Override
  public void visitNode(Tree tree) {
    Tree body = ((FunctionTree) tree).body();
    if (body.is(Kind.BLOCK) && isBigEnough(((BlockTree) body))) {
      functionBlocks.add((BlockTree) body);
    }
  }

  private static boolean isBigEnough(BlockTree block) {
    List<StatementTree> statements = block.statements();

    if (!statements.isEmpty()) {
      int firstLine = statements.get(0).firstToken().line();
      int lastLine = statements.get(statements.size() - 1).lastToken().endLine();
      return lastLine - firstLine > 1;
    }

    return false;
  }

}
