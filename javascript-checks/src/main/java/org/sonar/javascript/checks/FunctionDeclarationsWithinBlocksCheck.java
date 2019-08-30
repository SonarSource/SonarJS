/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "FunctionDeclarationsWithinBlocks")
public class FunctionDeclarationsWithinBlocksCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Do not use function declarations within blocks.";

  @Override
  public void visitBlock(BlockTree tree) {
    for (StatementTree stmt : tree.statements()) {

      if (stmt.is(Kind.FUNCTION_DECLARATION)) {
        addIssue(((FunctionDeclarationTree) stmt).functionKeyword(), MESSAGE);
      }
    }

    super.visitBlock(tree);
  }

  /**
   * Ignoring function declared in function body block
   */


  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    if (tree.body().is(Kind.BLOCK)) {
      scan(((BlockTree) tree.body()).statements());

    } else {
      super.visitArrowFunction(tree);
    }
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    scan(tree.body().statements());
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    scan(tree.body().statements());
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    scan(tree.body().statements());
  }

  @Override
  public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
    scan(tree.body().statements());
  }
}
