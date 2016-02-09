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
package org.sonar.plugins.javascript.api.visitors;

import com.google.common.annotations.Beta;
import com.google.common.base.Preconditions;
import com.sonar.sslr.api.typed.Optional;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.expression.SuperTreeImpl;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingPropertyTree;
import org.sonar.plugins.javascript.api.tree.declaration.DefaultExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.FromClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.GeneratorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportModuleDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NamedExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierListTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.ComputedPropertyNameTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.TaggedTemplateTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateCharactersTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ThisTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DebuggerStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DefaultClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.EmptyStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForInStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForOfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.LabelledStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ThrowStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.TryStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WithStatementTree;

@Beta
public abstract class DoubleDispatchVisitor implements TreeVisitor {

  private TreeVisitorContext context = null;

  @Override
  public TreeVisitorContext getContext() {
    Preconditions.checkState(context != null, "this#scanTree(context) should be called to initialised the context before accessing it");
    return context;
  }

  @Override
  public final void scanTree(TreeVisitorContext context) {
    this.context = context;
    scan(context.getTopTree());
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
        throw new IllegalArgumentException("List element type should be of type Optional or Tree.");
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


  public void visitImportModuleDeclaration(ImportModuleDeclarationTree tree) {
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
    scan(tree.statement());
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


  public void visitDefaultClause(DefaultClauseTree tree) {
    scan(tree.statements());
  }


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
    // no sub-tree
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


  public void visitRestElement(RestElementTree tree) {
    scan(tree.element());
  }


  public void visitSuper(SuperTreeImpl tree) {
    // no sub-tree
  }


  public void visitExportClause(ExportClauseTree tree) {
    scan(tree.exports());
    scan(tree.fromClause());
  }


  public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    scan(tree.body());
  }


  public void visitGeneratorMethodDeclaration(GeneratorMethodDeclarationTree tree) {
    scan(tree.name());
    scan(tree.parameters());
    scan(tree.body());
  }

}
