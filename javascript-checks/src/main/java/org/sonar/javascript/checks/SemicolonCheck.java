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

import javax.annotation.Nullable;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.DefaultExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportModuleDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DebuggerStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
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

  private static final String MESSAGE = "Add a semicolon at the end of this statement.";

  private void checkEOS(Tree tree, @Nullable SyntaxToken semicolonToken) {
    if (semicolonToken == null) {
      getContext().addIssue(this, tree, MESSAGE);
    }
  }

  @Override
  public void visitDefaultExportDeclaration(DefaultExportDeclarationTree tree) {
    super.visitDefaultExportDeclaration(tree);
    boolean exportedObjectIsClassOrFunctionDeclaration = tree.object().is(
      Kind.FUNCTION_DECLARATION,
      Kind.FUNCTION_EXPRESSION,
      Kind.CLASS_DECLARATION,
      Kind.CLASS_EXPRESSION,
      Kind.GENERATOR_DECLARATION,
      Kind.GENERATOR_FUNCTION_EXPRESSION
    );
    if (!exportedObjectIsClassOrFunctionDeclaration) {
      checkEOS(tree, tree.semicolonToken());
    }
  }

  @Override
  public void visitNameSpaceExportDeclaration(NameSpaceExportDeclarationTree tree) {
    super.visitNameSpaceExportDeclaration(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitExportClause(ExportClauseTree tree) {
    super.visitExportClause(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitImportDeclaration(ImportDeclarationTree tree) {
    super.visitImportDeclaration(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitImportModuleDeclaration(ImportModuleDeclarationTree tree) {
    super.visitImportModuleDeclaration(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitVariableStatement(VariableStatementTree tree) {
    super.visitVariableStatement(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitExpressionStatement(ExpressionStatementTree tree) {
    super.visitExpressionStatement(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    super.visitDoWhileStatement(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitContinueStatement(ContinueStatementTree tree) {
    super.visitContinueStatement(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitBreakStatement(BreakStatementTree tree) {
    super.visitBreakStatement(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitReturnStatement(ReturnStatementTree tree) {
    super.visitReturnStatement(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitThrowStatement(ThrowStatementTree tree) {
    super.visitThrowStatement(tree);
    checkEOS(tree, tree.semicolonToken());
  }

  @Override
  public void visitDebugger(DebuggerStatementTree tree) {
    super.visitDebugger(tree);
    checkEOS(tree, tree.semicolonToken());
  }

}
