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
package org.sonar.javascript.ast.visitors;

import java.util.List;

import javax.annotation.Nullable;

import org.sonar.javascript.model.implementations.expression.SuperTreeImpl;
import org.sonar.javascript.model.interfaces.ModuleTree;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ArrayBindingPatternTree;
import org.sonar.javascript.model.interfaces.declaration.BindingPropertyTree;
import org.sonar.javascript.model.interfaces.declaration.DefaultExportDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ExportClauseTree;
import org.sonar.javascript.model.interfaces.declaration.FromClauseTree;
import org.sonar.javascript.model.interfaces.declaration.FunctionDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ImportClauseTree;
import org.sonar.javascript.model.interfaces.declaration.ImportDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ImportModuleDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.InitializedBindingElementTree;
import org.sonar.javascript.model.interfaces.declaration.MethodDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.NameSpaceExportDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.NamedExportDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ObjectBindingPatternTree;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.javascript.model.interfaces.declaration.SpecifierListTree;
import org.sonar.javascript.model.interfaces.declaration.SpecifierTree;
import org.sonar.javascript.model.interfaces.expression.ArrayLiteralTree;
import org.sonar.javascript.model.interfaces.expression.ArrowFunctionTree;
import org.sonar.javascript.model.interfaces.expression.AssignmentExpressionTree;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.CallExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ClassTree;
import org.sonar.javascript.model.interfaces.expression.ComputedPropertyNameTree;
import org.sonar.javascript.model.interfaces.expression.ConditionalExpressionTree;
import org.sonar.javascript.model.interfaces.expression.FunctionExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;
import org.sonar.javascript.model.interfaces.expression.MemberExpressionTree;
import org.sonar.javascript.model.interfaces.expression.NewExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ObjectLiteralTree;
import org.sonar.javascript.model.interfaces.expression.PairPropertyTree;
import org.sonar.javascript.model.interfaces.expression.ParenthesisedExpressionTree;
import org.sonar.javascript.model.interfaces.expression.RestElementTree;
import org.sonar.javascript.model.interfaces.expression.TaggedTemplateTree;
import org.sonar.javascript.model.interfaces.expression.TemplateCharactersTree;
import org.sonar.javascript.model.interfaces.expression.TemplateExpressionTree;
import org.sonar.javascript.model.interfaces.expression.TemplateLiteralTree;
import org.sonar.javascript.model.interfaces.expression.ThisTree;
import org.sonar.javascript.model.interfaces.expression.UnaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.YieldExpressionTree;
import org.sonar.javascript.model.interfaces.statement.BlockTree;
import org.sonar.javascript.model.interfaces.statement.BreakStatementTree;
import org.sonar.javascript.model.interfaces.statement.CaseClauseTree;
import org.sonar.javascript.model.interfaces.statement.CatchBlockTree;
import org.sonar.javascript.model.interfaces.statement.ContinueStatementTree;
import org.sonar.javascript.model.interfaces.statement.DebuggerStatementTree;
import org.sonar.javascript.model.interfaces.statement.DefaultClauseTree;
import org.sonar.javascript.model.interfaces.statement.DoWhileStatementTree;
import org.sonar.javascript.model.interfaces.statement.ElseClauseTree;
import org.sonar.javascript.model.interfaces.statement.EmptyStatementTree;
import org.sonar.javascript.model.interfaces.statement.ExpressionStatementTree;
import org.sonar.javascript.model.interfaces.statement.ForInStatementTree;
import org.sonar.javascript.model.interfaces.statement.ForOfStatementTree;
import org.sonar.javascript.model.interfaces.statement.ForStatementTree;
import org.sonar.javascript.model.interfaces.statement.IfStatementTree;
import org.sonar.javascript.model.interfaces.statement.LabelledStatementTree;
import org.sonar.javascript.model.interfaces.statement.ReturnStatementTree;
import org.sonar.javascript.model.interfaces.statement.SwitchStatementTree;
import org.sonar.javascript.model.interfaces.statement.ThrowStatementTree;
import org.sonar.javascript.model.interfaces.statement.TryStatementTree;
import org.sonar.javascript.model.interfaces.statement.VariableDeclarationTree;
import org.sonar.javascript.model.interfaces.statement.VariableStatementTree;
import org.sonar.javascript.model.interfaces.statement.WhileStatementTree;
import org.sonar.javascript.model.interfaces.statement.WithStatementTree;
import org.sonar.javascript.parser.sslr.Optional;

public class BaseTreeVisitor implements TreeVisitor {


  protected void scan(@Nullable Tree tree) {
    if (tree != null) {
      tree.accept(this);
    }
  }

  protected <T> void scan(List<T> trees) {
    for (T tree : trees) {

      if (tree instanceof Optional) {
        scan((Optional) tree);

      } else if (tree instanceof Tree) {
        scan((Tree) tree);

      } else {
        // FIXME martin
        throw new IllegalArgumentException("List element type should be Optional or Tree.");
      }
    }
  }

  private void scan(Optional<Tree> tree) {
    if (tree.isPresent()) {
      scan(tree.get());
    }
  }

  public void visitScript(ScriptTree tree) {
    scan(tree.items());
  }

  public void visitModule(ModuleTree tree) {
    scan(tree.items());
  }

  public void visitImportDeclaration(ImportDeclarationTree tree) {
    scan(tree.importClause());
    scan(tree.fromClause());
  }

  public void visitImportModuletDeclaration(ImportModuleDeclarationTree tree) {
    scan(tree.moduleName());
  }

  public void visitImportClause(ImportClauseTree tree) {
    scan(tree.namedImport());
  }

  public void visitSpecifierList(SpecifierListTree tree) {
    scan(tree.specifiers());
  }

  public void visitSpecifier(SpecifierTree tree) {
    scan(tree.name());
    scan(tree.localName());
  }

  public void visitFromClause(FromClauseTree tree) {
    scan(tree.module());
  }

  public void visitDefaultExportDeclaration(DefaultExportDeclarationTree tree) {
    scan(tree.object());
  }

  public void visitNameSpaceExportDeclaration(NameSpaceExportDeclarationTree tree) {
    scan(tree.fromClause());
  }

  public void visitNamedExportDeclaration(NamedExportDeclarationTree tree) {
    scan(tree.object());
  }

  public void visitVariableStatement(VariableStatementTree tree) {
    scan(tree.declaration());
  }

  public void visitVariableDeclaration(VariableDeclarationTree tree) {
    scan(tree.variables());
  }

  public void visitClassDeclaration(ClassTree tree) {
    scan(tree.name());
    scan(tree.superClass());
    scan(tree.elements());
  }

  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    scan(tree.body());
  }

  public void visitParameterList(ParameterListTree tree) {
    scan(tree.parameters());
  }

  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    scan(tree.body());
  }

  public void visitBlock(BlockTree tree) {
    scan(tree.statements());
  }

  public void visitEmptyStatement(EmptyStatementTree tree) {
    // no subtrees
  }

  public void visitLabelledStatement(LabelledStatementTree tree) {
    scan(tree.label());
    scan(tree.statement());
  }

  public void visitExpressionStatement(ExpressionStatementTree tree) {
    scan(tree.expression());
  }

  public void visitIfStatement(IfStatementTree tree) {
    scan(tree.condition());
    scan(tree.thenStatement());
    scan(tree.elseClause());
  }

  public void visitElseClause(ElseClauseTree tree) {
    scan(tree.statement());
  }

  public void visitForStatement(ForStatementTree tree) {
    scan(tree.init());
    scan(tree.condition());
    scan(tree.update());
    scan(tree.statement());
  }

  public void visitForInStatement(ForInStatementTree tree) {
    scan(tree.variableOrExpression());
    scan(tree.expression());
    scan(tree.statement());
  }

  public void visitForOfStatement(ForOfStatementTree tree) {
    scan(tree.variableOrExpression());
    scan(tree.expression());
    scan(tree.statement());
  }

  public void visitWhileStatement(WhileStatementTree tree) {
    scan(tree.condition());
    scan(tree.statement());
  }

  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    scan(tree.statement());
    scan(tree.condition());
  }

  public void visitContinueStatement(ContinueStatementTree tree) {
    scan(tree.label());
  }

  public void visitIdentifier(IdentifierTree tree) {
    // no sub-tree
  }

  public void visitBreakStatement(BreakStatementTree tree) {
    scan(tree.label());
  }

  public void visitReturnStatement(ReturnStatementTree tree) {
    scan(tree.expression());
  }

  public void visitWithStatement(WithStatementTree tree) {
    scan(tree.expression());
    scan(tree.statement());
  }

  public void visitSwitchStatement(SwitchStatementTree tree) {
    scan(tree.expression());
    scan(tree.cases());
  }

  @Override
  public void visitDefaultClause(DefaultClauseTree tree) {
    scan(tree.statements());
  }

  @Override
  public void visitCaseClause(CaseClauseTree tree) {
    scan(tree.expression());
    scan(tree.statements());
  }

  public void visitThrowStatement(ThrowStatementTree tree) {
    scan(tree.expression());
  }

  public void visitTryStatement(TryStatementTree tree) {
    scan(tree.block());
    scan(tree.catchBlock());
    scan(tree.finallyBlock());
  }

  public void visitCatchBlock(CatchBlockTree tree) {
    scan(tree.parameter());
    scan(tree.block());
  }

  public void visitDebugger(DebuggerStatementTree tree) {
    // no sub tree
  }

  public void visitArrayBindingPattern(ArrayBindingPatternTree tree) {
    scan(tree.elements());
  }

  public void visitObjectBindingPattern(ObjectBindingPatternTree tree) {
    scan(tree.elements());
  }

  public void visitObjectLiteral(ObjectLiteralTree tree) {
    scan(tree.properties());
  }

  public void visitBindingProperty(BindingPropertyTree tree) {
    scan(tree.name());
    scan(tree.value());
  }

  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    scan(tree.left());
    scan(tree.right());
  }

  public void visitLiteral(LiteralTree tree) {
    // no sub-tree
  }

  public void visitArrayLiteral(ArrayLiteralTree tree) {
    scan(tree.elements());
  }

  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    scan(tree.variable());
    scan(tree.expression());
  }

  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    scan(tree.condition());
    scan(tree.trueExpression());
    scan(tree.falseExpression());
  }

  public void visitArrowFunction(ArrowFunctionTree tree) {
    scan(tree.parameters());
    scan(tree.conciseBody());
  }

  public void visitYieldExpression(YieldExpressionTree tree) {
    scan(tree.argument());
  }

  public void visitBinaryExpression(BinaryExpressionTree tree) {
    scan(tree.leftOperand());
    scan(tree.rightOperand());
  }

  public void visitUnaryExpression(UnaryExpressionTree tree) {
    scan(tree.expression());
  }

  public void visitMemberExpression(MemberExpressionTree tree) {
    scan(tree.object());
    scan(tree.property());
  }

  public void visitTaggedTemplate(TaggedTemplateTree tree) {
    scan(tree.callee());
    scan(tree.template());
  }

  public void visitCallExpression(CallExpressionTree tree) {
    scan(tree.callee());
    scan(tree.arguments());
  }

  public void visitTemplateLiteral(TemplateLiteralTree tree) {
    scan(tree.strings());
    scan(tree.expressions());
  }

  public void visitTemplateExpression(TemplateExpressionTree tree) {
    scan(tree.expression());
  }

  public void visitTemplateCharacters(TemplateCharactersTree tree) {
    // no sub-tree
  }

  public void visitParenthesisedExpression(ParenthesisedExpressionTree tree) {
    scan(tree.expression());
  }

  public void visitComputedPropertyName(ComputedPropertyNameTree tree) {
    scan(tree.expression());
  }

  public void visitPairProperty(PairPropertyTree tree) {
    scan(tree.key());
    scan(tree.value());
  }

  public void visitNewExpression(NewExpressionTree tree) {
    scan(tree.expression());
    scan(tree.arguments());
  }

  public void visitThisTree(ThisTree tree) {
    // no sub-tree
  }

  public void visitFunctionExpression(FunctionExpressionTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    scan(tree.body());
  }

  @Override
  public void visitRestElement(RestElementTree tree) {
    scan(tree.element());
  }

  @Override
  public void visitSuper(SuperTreeImpl tree) {
    // no sub-tree
  }

  @Override
  public void visitExportClause(ExportClauseTree tree) {
    scan(tree.exports());
    scan(tree.fromClause());
  }
}
