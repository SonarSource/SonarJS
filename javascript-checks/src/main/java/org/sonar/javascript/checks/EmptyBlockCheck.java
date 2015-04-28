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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.interfaces.declaration.FunctionDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.MethodDeclarationTree;
import org.sonar.javascript.model.interfaces.expression.FunctionExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.BlockTree;
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
public class EmptyBlockCheck extends BaseTreeVisitor {

  @Override
  public void visitBlock(BlockTree tree) {
    if (tree.statements().isEmpty() && !hasComment(tree.closeCurlyBrace())) {
      getContext().addIssue(this, tree, "Either remove or fill this block of code.");
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
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
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


  private static boolean hasComment(SyntaxToken closingBrace) {
    return !closingBrace.trivias().isEmpty();
  }

}
