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

import org.sonar.javascript.JavaScriptFileScanner;
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

import com.google.common.base.Preconditions;

public class BaseTreeVisitor implements TreeVisitor, JavaScriptFileScanner {

  private AstTreeVisitorContext context = null;

  public AstTreeVisitorContext getContext() {
    Preconditions.checkState(context != null, "this#scanFile(context) should be called to initialised the context before accessing it");
    return context;
  }

  @Override
  public void scanFile(AstTreeVisitorContext context) {
    this.context = context;
    scan(context.getTree());
  }

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
        // FIXME martin: improve message
        throw new IllegalArgumentException("List element type should be Optional or Tree.");
      }
    }
  }

  private void scan(Optional<Tree> tree) {
    if (tree.isPresent()) {
      scan(tree.get());
    }
  }

  @Override
  public void visitScript(ScriptTree tree) {
    scan(tree.items());
  }

  @Override
  public void visitModule(ModuleTree tree) {
    scan(tree.items());
  }

  @Override
  public void visitImportDeclaration(ImportDeclarationTree tree) {
    scan(tree.importClause());
    scan(tree.fromClause());
  }

  @Override
  public void visitImportModuletDeclaration(ImportModuleDeclarationTree tree) {
    scan(tree.moduleName());
  }

  @Override
  public void visitImportClause(ImportClauseTree tree) {
    scan(tree.namedImport());
  }

  @Override
  public void visitSpecifierList(SpecifierListTree tree) {
    scan(tree.specifiers());
  }

  @Override
  public void visitSpecifier(SpecifierTree tree) {
    scan(tree.name());
    scan(tree.localName());
  }

  @Override
  public void visitFromClause(FromClauseTree tree) {
    scan(tree.module());
  }

  @Override
  public void visitDefaultExportDeclaration(DefaultExportDeclarationTree tree) {
    scan(tree.object());
  }

  @Override
  public void visitNameSpaceExportDeclaration(NameSpaceExportDeclarationTree tree) {
    scan(tree.fromClause());
  }

  @Override
  public void visitNamedExportDeclaration(NamedExportDeclarationTree tree) {
    scan(tree.object());
  }

  @Override
  public void visitVariableStatement(VariableStatementTree tree) {
    scan(tree.declaration());
  }

  @Override
  public void visitVariableDeclaration(VariableDeclarationTree tree) {
    scan(tree.variables());
  }

  @Override
  public void visitClassDeclaration(ClassTree tree) {
    scan(tree.name());
    scan(tree.superClass());
    scan(tree.elements());
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    scan(tree.body());
  }

  @Override
  public void visitParameterList(ParameterListTree tree) {
    scan(tree.parameters());
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    scan(tree.body());
  }

  @Override
  public void visitBlock(BlockTree tree) {
    scan(tree.statements());
  }

  @Override
  public void visitEmptyStatement(EmptyStatementTree tree) {
    // no subtrees
  }

  @Override
  public void visitLabelledStatement(LabelledStatementTree tree) {
    scan(tree.label());
    scan(tree.statement());
  }

  @Override
  public void visitExpressionStatement(ExpressionStatementTree tree) {
    scan(tree.expression());
  }

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    scan(tree.condition());
    scan(tree.thenStatement());
    scan(tree.elseClause());
  }

  @Override
  public void visitElseClause(ElseClauseTree tree) {
    scan(tree.statement());
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    scan(tree.init());
    scan(tree.condition());
    scan(tree.update());
    scan(tree.statement());
  }

  @Override
  public void visitForInStatement(ForInStatementTree tree) {
    scan(tree.variableOrExpression());
    scan(tree.expression());
    scan(tree.statement());
  }

  @Override
  public void visitForOfStatement(ForOfStatementTree tree) {
    scan(tree.variableOrExpression());
    scan(tree.expression());
    scan(tree.statement());
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    scan(tree.condition());
    scan(tree.statement());
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    scan(tree.statement());
    scan(tree.condition());
  }

  @Override
  public void visitContinueStatement(ContinueStatementTree tree) {
    scan(tree.label());
  }

  @Override
  public void visitIdentifier(IdentifierTree tree) {
    // no sub-tree
  }

  @Override
  public void visitBreakStatement(BreakStatementTree tree) {
    scan(tree.label());
  }

  @Override
  public void visitReturnStatement(ReturnStatementTree tree) {
    scan(tree.expression());
  }

  @Override
  public void visitWithStatement(WithStatementTree tree) {
    scan(tree.expression());
    scan(tree.statement());
  }

  @Override
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

  @Override
  public void visitThrowStatement(ThrowStatementTree tree) {
    scan(tree.expression());
  }

  @Override
  public void visitTryStatement(TryStatementTree tree) {
    scan(tree.block());
    scan(tree.catchBlock());
    scan(tree.finallyBlock());
  }

  @Override
  public void visitCatchBlock(CatchBlockTree tree) {
    scan(tree.parameter());
    scan(tree.block());
  }

  @Override
  public void visitDebugger(DebuggerStatementTree tree) {
    // no sub tree
  }

  @Override
  public void visitArrayBindingPattern(ArrayBindingPatternTree tree) {
    scan(tree.elements());
  }

  @Override
  public void visitObjectBindingPattern(ObjectBindingPatternTree tree) {
    scan(tree.elements());
  }

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    scan(tree.properties());
  }

  @Override
  public void visitBindingProperty(BindingPropertyTree tree) {
    scan(tree.name());
    scan(tree.value());
  }

  @Override
  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    scan(tree.left());
    scan(tree.right());
  }

  @Override
  public void visitLiteral(LiteralTree tree) {
    // no sub-tree
  }

  @Override
  public void visitArrayLiteral(ArrayLiteralTree tree) {
    scan(tree.elements());
  }

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    scan(tree.variable());
    scan(tree.expression());
  }

  @Override
  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    scan(tree.condition());
    scan(tree.trueExpression());
    scan(tree.falseExpression());
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    scan(tree.parameters());
    scan(tree.conciseBody());
  }

  @Override
  public void visitYieldExpression(YieldExpressionTree tree) {
    scan(tree.argument());
  }

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    scan(tree.leftOperand());
    scan(tree.rightOperand());
  }

  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    scan(tree.expression());
  }

  @Override
  public void visitMemberExpression(MemberExpressionTree tree) {
    scan(tree.object());
    scan(tree.property());
  }

  @Override
  public void visitTaggedTemplate(TaggedTemplateTree tree) {
    scan(tree.callee());
    scan(tree.template());
  }

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    scan(tree.callee());
    scan(tree.arguments());
  }

  @Override
  public void visitTemplateLiteral(TemplateLiteralTree tree) {
    scan(tree.strings());
    scan(tree.expressions());
  }

  @Override
  public void visitTemplateExpression(TemplateExpressionTree tree) {
    scan(tree.expression());
  }

  @Override
  public void visitTemplateCharacters(TemplateCharactersTree tree) {
    // no sub-tree
  }

  @Override
  public void visitParenthesisedExpression(ParenthesisedExpressionTree tree) {
    scan(tree.expression());
  }

  @Override
  public void visitComputedPropertyName(ComputedPropertyNameTree tree) {
    scan(tree.expression());
  }

  @Override
  public void visitPairProperty(PairPropertyTree tree) {
    scan(tree.key());
    scan(tree.value());
  }

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    scan(tree.expression());
    scan(tree.arguments());
  }

  @Override
  public void visitThisTree(ThisTree tree) {
    // no sub-tree
  }

  @Override
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
