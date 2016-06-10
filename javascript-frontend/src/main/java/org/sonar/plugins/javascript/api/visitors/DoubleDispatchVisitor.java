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
import org.sonar.plugins.javascript.api.tree.declaration.DefaultExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
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

  protected void scanTree(Tree tree) {
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
    scanTree(tree);
  }


  public void visitModule(ModuleTree tree) {
    scanTree(tree);
  }


  public void visitImportDeclaration(ImportDeclarationTree tree) {
    scanTree(tree);
  }


  public void visitImportModuleDeclaration(ImportModuleDeclarationTree tree) {
    scanTree(tree);
  }


  public void visitImportClause(ImportClauseTree tree) {
    scanTree(tree);
  }


  public void visitSpecifierList(SpecifierListTree tree) {
    scanTree(tree);
  }


  public void visitSpecifier(SpecifierTree tree) {
    scanTree(tree);
  }


  public void visitFromClause(FromClauseTree tree) {
    scanTree(tree);
  }


  public void visitDefaultExportDeclaration(DefaultExportDeclarationTree tree) {
    scanTree(tree);
  }


  public void visitNameSpaceExportDeclaration(NameSpaceExportDeclarationTree tree) {
    scanTree(tree);
  }


  public void visitNamedExportDeclaration(NamedExportDeclarationTree tree) {
    scanTree(tree);
  }


  public void visitVariableStatement(VariableStatementTree tree) {
    scanTree(tree);
  }


  public void visitVariableDeclaration(VariableDeclarationTree tree) {
    scanTree(tree);
  }


  public void visitClass(ClassTree tree) {
    scanTree(tree);
  }


  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    scanTree(tree);
  }


  public void visitParameterList(ParameterListTree tree) {
    scanTree(tree);
  }


  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    scanTree(tree);
  }


  public void visitBlock(BlockTree tree) {
    scanTree(tree);
  }


  public void visitEmptyStatement(EmptyStatementTree tree) {
    scanTree(tree);
  }


  public void visitLabelledStatement(LabelledStatementTree tree) {
    scanTree(tree);
  }


  public void visitExpressionStatement(ExpressionStatementTree tree) {
    scanTree(tree);
  }


  public void visitIfStatement(IfStatementTree tree) {
    scanTree(tree);
  }


  public void visitElseClause(ElseClauseTree tree) {
    scanTree(tree);
  }


  public void visitForStatement(ForStatementTree tree) {
    scanTree(tree);
  }


  public void visitWhileStatement(WhileStatementTree tree) {
    scanTree(tree);
  }


  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    scanTree(tree);
  }


  public void visitContinueStatement(ContinueStatementTree tree) {
    scanTree(tree);
  }


  public void visitIdentifier(IdentifierTree tree) {
    scanTree(tree);
  }


  public void visitBreakStatement(BreakStatementTree tree) {
    scanTree(tree);
  }


  public void visitReturnStatement(ReturnStatementTree tree) {
    scanTree(tree);
  }


  public void visitWithStatement(WithStatementTree tree) {
    scanTree(tree);
  }


  public void visitSwitchStatement(SwitchStatementTree tree) {
    scanTree(tree);
  }


  public void visitDefaultClause(DefaultClauseTree tree) {
    scanTree(tree);
  }


  public void visitCaseClause(CaseClauseTree tree) {
    scanTree(tree);
  }


  public void visitThrowStatement(ThrowStatementTree tree) {
    scanTree(tree);
  }


  public void visitTryStatement(TryStatementTree tree) {
    scanTree(tree);
  }


  public void visitCatchBlock(CatchBlockTree tree) {
    scanTree(tree);
  }


  public void visitDebugger(DebuggerStatementTree tree) {
    scanTree(tree);
  }


  public void visitArrayBindingPattern(ArrayBindingPatternTree tree) {
    scanTree(tree);
  }


  public void visitObjectBindingPattern(ObjectBindingPatternTree tree) {
    scanTree(tree);
  }


  public void visitObjectLiteral(ObjectLiteralTree tree) {
    scanTree(tree);
  }


  public void visitBindingProperty(BindingPropertyTree tree) {
    scanTree(tree);
  }


  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    scanTree(tree);
  }


  public void visitLiteral(LiteralTree tree) {
    scanTree(tree);
  }


  public void visitArrayLiteral(ArrayLiteralTree tree) {
    scanTree(tree);
  }


  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    scanTree(tree);
  }


  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    scanTree(tree);
  }


  public void visitArrowFunction(ArrowFunctionTree tree) {
    scanTree(tree);
  }


  public void visitYieldExpression(YieldExpressionTree tree) {
    scanTree(tree);
  }


  public void visitBinaryExpression(BinaryExpressionTree tree) {
    scanTree(tree);
  }


  public void visitUnaryExpression(UnaryExpressionTree tree) {
    scanTree(tree);
  }


  public void visitMemberExpression(MemberExpressionTree tree) {
    scanTree(tree);
  }


  public void visitTaggedTemplate(TaggedTemplateTree tree) {
    scanTree(tree);
  }


  public void visitCallExpression(CallExpressionTree tree) {
    scanTree(tree);
  }


  public void visitTemplateLiteral(TemplateLiteralTree tree) {
    scanTree(tree);
  }


  public void visitTemplateExpression(TemplateExpressionTree tree) {
    scanTree(tree);
  }


  public void visitTemplateCharacters(TemplateCharactersTree tree) {
    scanTree(tree);
  }


  public void visitParenthesisedExpression(ParenthesisedExpressionTree tree) {
    scanTree(tree);
  }


  public void visitComputedPropertyName(ComputedPropertyNameTree tree) {
    scanTree(tree);
  }


  public void visitPairProperty(PairPropertyTree tree) {
    scanTree(tree);
  }


  public void visitNewExpression(NewExpressionTree tree) {
    scanTree(tree);
  }


  public void visitFunctionExpression(FunctionExpressionTree tree) {
    scanTree(tree);
  }


  public void visitRestElement(RestElementTree tree) {
    scanTree(tree);
  }

  public void visitSpreadElement(SpreadElementTree tree) {
    scanTree(tree);
  }


  public void visitSuper(SuperTreeImpl tree) {
    scanTree(tree);
  }


  public void visitExportClause(ExportClauseTree tree) {
    scanTree(tree);
  }


  public void visitForObjectStatement(ForObjectStatementTree tree) {
    scanTree(tree);
  }

  public void visitJsxIdentifier(JsxIdentifierTree tree) {
    scanTree(tree);
  }

  public void visitJsxText(JsxTextTree tree){
    scanTree(tree);
  }

  public void visitJsxSpreadAttribute(JsxSpreadAttributeTree tree) {
    scanTree(tree);
  }

  public void visitJsxStandardAttribute(JsxStandardAttributeTree tree) {
    scanTree(tree);
  }

  public void visitJsxJavaScriptExpression(JsxJavaScriptExpressionTree tree) {
    scanTree(tree);
  }

  public void visitJsxClosingElement(JsxClosingElementTree tree) {
    scanTree(tree);
  }

  public void visitJsxOpeningElement(JsxOpeningElementTree tree) {
    scanTree(tree);
  }

  public void visitJsxStandardElement(JsxStandardElementTree tree) {
    scanTree(tree);
  }

  public void visitJsxSelfClosingElement(JsxSelfClosingElementTree tree) {
    scanTree(tree);
  }

  public void visitToken(SyntaxToken token) {
    for (SyntaxTrivia syntaxTrivia : token.trivias()) {
      syntaxTrivia.accept(this);
    }
  }

  public void visitComment(SyntaxTrivia commentToken) {
    // no sub-tree
  }
}
