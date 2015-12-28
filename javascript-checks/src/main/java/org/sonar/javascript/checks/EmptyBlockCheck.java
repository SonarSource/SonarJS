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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.GeneratorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "EmptyBlock",
  name = "Nested blocks of code should not be left empty",
  priority = Priority.MAJOR,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("5min")
public class EmptyBlockCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Either remove or fill this block of code.";

  @Override
  public void visitBlock(BlockTree tree) {
    if (tree.statements().isEmpty() && !hasComment(tree.closeCurlyBrace())) {
      addLineIssue(tree, MESSAGE);
    }
    super.visitBlock(tree);
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    // Ignoring empty function
    scan(tree.body().statements());
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    // Ignoring empty function
    scan(tree.body().statements());
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    visitMethodDeclarationTree(tree);
  }

  @Override
  public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
    visitMethodDeclarationTree(tree);
  }

  @Override
  public void visitGeneratorMethodDeclaration(GeneratorMethodDeclarationTree tree) {
    visitMethodDeclarationTree(tree);
  }

  private void visitMethodDeclarationTree(MethodDeclarationTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    // Ignoring empty function
    scan(tree.body().statements());
  }

  private static boolean hasComment(SyntaxToken closingBrace) {
    return !closingBrace.trivias().isEmpty();
  }

}
