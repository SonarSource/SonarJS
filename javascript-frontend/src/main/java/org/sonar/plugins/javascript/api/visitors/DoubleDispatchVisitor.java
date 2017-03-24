/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.plugins.javascript.api.visitors;

import com.google.common.annotations.Beta;
import com.google.common.base.Preconditions;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.expression.SuperTreeImpl;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingPropertyTree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.DefaultExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBinding;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithExportList;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithNameSpaceExport;
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FromClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
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
import org.sonar.plugins.javascript.api.tree.expression.ArrayAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentPatternRestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.ComputedPropertyNameTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.InitializedAssignmentPatternElementTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewTargetTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternPairElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.expression.SpreadElementTree;
import org.sonar.plugins.javascript.api.tree.expression.TaggedTemplateTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateCharactersTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxIdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxJavaScriptExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxOpeningElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSelfClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSpreadAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardAttributeTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxTextTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
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
import org.sonar.plugins.javascript.api.tree.statement.FinallyBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
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
    Preconditions.checkState(context != null, "this#scanTree(context) should be called to initialise the context before accessing it");
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

  protected void scanChildren(Tree tree) {
    Iterator<Tree> childrenIterator = ((JavaScriptTree) tree).childrenIterator();

    Tree child;

    while (childrenIterator.hasNext()) {
      child = childrenIterator.next();
      if (child != null) {
        child.accept(this);
      }
    }
  }

  protected <T extends Tree> void scan(List<T> trees) {
    trees.forEach(this::scan);
  }

  public void visitScript(ScriptTree tree) {
    scanChildren(tree);
  }


  public void visitModule(ModuleTree tree) {
    scanChildren(tree);
  }


  public void visitImportDeclaration(ImportDeclarationTree tree) {
    scanChildren(tree);
  }


  public void visitImportModuleDeclaration(ImportModuleDeclarationTree tree) {
    scanChildren(tree);
  }


  public void visitImportClause(ImportClauseTree tree) {
    scanChildren(tree);
  }


  public void visitSpecifierList(SpecifierListTree tree) {
    scanChildren(tree);
  }


  public void visitSpecifier(SpecifierTree tree) {
    scanChildren(tree);
  }


  public void visitFromClause(FromClauseTree tree) {
    scanChildren(tree);
  }


  public void visitDefaultExportDeclaration(DefaultExportDeclarationTree tree) {
    scanChildren(tree);
  }


  public void visitNameSpaceExportDeclaration(NameSpaceExportDeclarationTree tree) {
    scanChildren(tree);
  }

  public void visitNamedExportDeclaration(NamedExportDeclarationTree tree) {
    scanChildren(tree);
  }

  public void visitExportDefaultBinding(ExportDefaultBinding tree) {
    scanChildren(tree);
  }

  public void visitExportDefaultBindingWithNameSpaceExport(ExportDefaultBindingWithNameSpaceExport tree) {
    scanChildren(tree);
  }


  public void visitExportDefaultBindingWithExportList(ExportDefaultBindingWithExportList tree) {
    scanChildren(tree);
  }

  public void visitVariableStatement(VariableStatementTree tree) {
    scanChildren(tree);
  }


  public void visitVariableDeclaration(VariableDeclarationTree tree) {
    scanChildren(tree);
  }


  public void visitClass(ClassTree tree) {
    scanChildren(tree);
  }

  public void visitDecorator(DecoratorTree tree) {
    scanChildren(tree);
  }

  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    scanChildren(tree);
  }

  public void visitFieldDeclaration(FieldDeclarationTree tree) {
    scanChildren(tree);
  }

  public void visitParameterList(ParameterListTree tree) {
    scanChildren(tree);
  }


  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    scanChildren(tree);
  }


  public void visitBlock(BlockTree tree) {
    scanChildren(tree);
  }


  public void visitEmptyStatement(EmptyStatementTree tree) {
    scanChildren(tree);
  }


  public void visitLabelledStatement(LabelledStatementTree tree) {
    scanChildren(tree);
  }


  public void visitExpressionStatement(ExpressionStatementTree tree) {
    scanChildren(tree);
  }


  public void visitIfStatement(IfStatementTree tree) {
    scanChildren(tree);
  }


  public void visitElseClause(ElseClauseTree tree) {
    scanChildren(tree);
  }


  public void visitForStatement(ForStatementTree tree) {
    scanChildren(tree);
  }


  public void visitWhileStatement(WhileStatementTree tree) {
    scanChildren(tree);
  }


  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    scanChildren(tree);
  }


  public void visitContinueStatement(ContinueStatementTree tree) {
    scanChildren(tree);
  }


  public void visitIdentifier(IdentifierTree tree) {
    scanChildren(tree);
  }


  public void visitBreakStatement(BreakStatementTree tree) {
    scanChildren(tree);
  }


  public void visitReturnStatement(ReturnStatementTree tree) {
    scanChildren(tree);
  }


  public void visitWithStatement(WithStatementTree tree) {
    scanChildren(tree);
  }


  public void visitSwitchStatement(SwitchStatementTree tree) {
    scanChildren(tree);
  }


  public void visitDefaultClause(DefaultClauseTree tree) {
    scanChildren(tree);
  }


  public void visitCaseClause(CaseClauseTree tree) {
    scanChildren(tree);
  }


  public void visitThrowStatement(ThrowStatementTree tree) {
    scanChildren(tree);
  }


  public void visitTryStatement(TryStatementTree tree) {
    scanChildren(tree);
  }


  public void visitCatchBlock(CatchBlockTree tree) {
    scanChildren(tree);
  }

  public void visitFinallyBlock(FinallyBlockTree tree) {
    scanChildren(tree);
  }

  public void visitDebugger(DebuggerStatementTree tree) {
    scanChildren(tree);
  }


  public void visitArrayBindingPattern(ArrayBindingPatternTree tree) {
    scanChildren(tree);
  }


  public void visitObjectBindingPattern(ObjectBindingPatternTree tree) {
    scanChildren(tree);
  }


  public void visitObjectLiteral(ObjectLiteralTree tree) {
    scanChildren(tree);
  }


  public void visitBindingProperty(BindingPropertyTree tree) {
    scanChildren(tree);
  }


  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    scanChildren(tree);
  }


  public void visitLiteral(LiteralTree tree) {
    scanChildren(tree);
  }


  public void visitArrayLiteral(ArrayLiteralTree tree) {
    scanChildren(tree);
  }


  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitArrowFunction(ArrowFunctionTree tree) {
    scanChildren(tree);
  }


  public void visitYieldExpression(YieldExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitBinaryExpression(BinaryExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitUnaryExpression(UnaryExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitMemberExpression(MemberExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitTaggedTemplate(TaggedTemplateTree tree) {
    scanChildren(tree);
  }


  public void visitCallExpression(CallExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitTemplateLiteral(TemplateLiteralTree tree) {
    scanChildren(tree);
  }


  public void visitTemplateExpression(TemplateExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitTemplateCharacters(TemplateCharactersTree tree) {
    scanChildren(tree);
  }


  public void visitParenthesisedExpression(ParenthesisedExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitComputedPropertyName(ComputedPropertyNameTree tree) {
    scanChildren(tree);
  }


  public void visitPairProperty(PairPropertyTree tree) {
    scanChildren(tree);
  }


  public void visitNewExpression(NewExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitFunctionExpression(FunctionExpressionTree tree) {
    scanChildren(tree);
  }


  public void visitRestElement(RestElementTree tree) {
    scanChildren(tree);
  }

  public void visitSpreadElement(SpreadElementTree tree) {
    scanChildren(tree);
  }


  public void visitSuper(SuperTreeImpl tree) {
    scanChildren(tree);
  }

  public void visitNewTarget(NewTargetTree tree) {
    scanChildren(tree);
  }

  public void visitExportClause(ExportClauseTree tree) {
    scanChildren(tree);
  }


  public void visitForObjectStatement(ForObjectStatementTree tree) {
    scanChildren(tree);
  }

  public void visitJsxIdentifier(JsxIdentifierTree tree) {
    scanChildren(tree);
  }

  public void visitJsxText(JsxTextTree tree){
    scanChildren(tree);
  }

  public void visitJsxSpreadAttribute(JsxSpreadAttributeTree tree) {
    scanChildren(tree);
  }

  public void visitJsxStandardAttribute(JsxStandardAttributeTree tree) {
    scanChildren(tree);
  }

  public void visitJsxJavaScriptExpression(JsxJavaScriptExpressionTree tree) {
    scanChildren(tree);
  }

  public void visitJsxClosingElement(JsxClosingElementTree tree) {
    scanChildren(tree);
  }

  public void visitJsxOpeningElement(JsxOpeningElementTree tree) {
    scanChildren(tree);
  }

  public void visitJsxStandardElement(JsxStandardElementTree tree) {
    scanChildren(tree);
  }

  public void visitJsxSelfClosingElement(JsxSelfClosingElementTree tree) {
    scanChildren(tree);
  }

  public void visitToken(SyntaxToken token) {
    for (SyntaxTrivia syntaxTrivia : token.trivias()) {
      syntaxTrivia.accept(this);
    }
  }

  public void visitComment(SyntaxTrivia commentToken) {
    // no sub-tree
  }

  public void visitArrayAssignmentPattern(ArrayAssignmentPatternTree tree) {
    scanChildren(tree);
  }

  public void visitAssignmentPatternRestElement(AssignmentPatternRestElementTree tree) {
    scanChildren(tree);
  }

  public void visitInitializedAssignmentPatternElement(InitializedAssignmentPatternElementTree tree) {
    scanChildren(tree);
  }

  public void visitObjectAssignmentPatternPairElement(ObjectAssignmentPatternPairElementTree tree) {
    scanChildren(tree);
  }

  public void visitObjectAssignmentPattern(ObjectAssignmentPatternTree tree) {
    scanChildren(tree);
  }
}
