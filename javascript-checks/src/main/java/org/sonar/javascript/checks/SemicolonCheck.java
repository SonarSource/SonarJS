/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportModuleDeclarationTree;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DebuggerStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.EndOfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ThrowStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "Semicolon",
  name = "Each statement should end with a semicolon",
  priority = Priority.MINOR,
  tags = {Tags.CONVENTION})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("1min")
public class SemicolonCheck extends BaseTreeVisitor {

  /**
   * TODO: for this check it would be better to have a link to the parent to be able to log the issue
   * just by subscribing to EndOfStatementTree node.
   */
  private void checkEOS(Tree tree, EndOfStatementTree eos) {
    if (!eos.hasSemicolon()) {
      getContext().addIssue(this, tree, "Add a semicolon at the end of this statement.");
    }
  }

  @Override
  public void visitImportDeclaration(ImportDeclarationTree tree) {
    super.visitImportDeclaration(tree);
    checkEOS(tree, tree.endOfStatement());
  }

  @Override
  public void visitImportModuletDeclaration(ImportModuleDeclarationTree tree) {
    super.visitImportModuletDeclaration(tree);
    checkEOS(tree, tree.endOfStatement());
  }

  @Override
  public void visitVariableStatement(VariableStatementTree tree) {
    super.visitVariableStatement(tree);
    checkEOS(tree, tree.endOfStatement());
  }

  @Override
  public void visitExpressionStatement(ExpressionStatementTree tree) {
    super.visitExpressionStatement(tree);
    checkEOS(tree, tree.endOfStatement());
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    super.visitDoWhileStatement(tree);
    checkEOS(tree, tree.endOfStatement());
  }

  @Override
  public void visitContinueStatement(ContinueStatementTree tree) {
    super.visitContinueStatement(tree);
    checkEOS(tree, tree.endOfStatement());
  }

  @Override
  public void visitBreakStatement(BreakStatementTree tree) {
    super.visitBreakStatement(tree);
    checkEOS(tree, tree.endOfStatement());
  }

  @Override
  public void visitReturnStatement(ReturnStatementTree tree) {
    super.visitReturnStatement(tree);
    checkEOS(tree, tree.endOfStatement());
  }

  @Override
  public void visitThrowStatement(ThrowStatementTree tree) {
    super.visitThrowStatement(tree);
    checkEOS(tree, tree.endOfStatement());
  }

  @Override
  public void visitDebugger(DebuggerStatementTree tree) {
    super.visitDebugger(tree);
    checkEOS(tree, tree.endOfStatement());
  }

}
