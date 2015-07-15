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
package org.sonar.plugins.javascript.api.visitors;

import com.google.common.annotations.Beta;
import org.sonar.javascript.model.internal.expression.SuperTreeImpl;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
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
import org.sonar.plugins.javascript.api.tree.statement.EndOfStatementTree;
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
public interface TreeVisitor {

  void visitScript(ScriptTree tree);

  void visitModule(ModuleTree tree);

  void visitImportDeclaration(ImportDeclarationTree tree);

  void visitImportModuletDeclaration(ImportModuleDeclarationTree tree);

  void visitImportClause(ImportClauseTree tree);

  void visitSpecifierList(SpecifierListTree tree);

  void visitSpecifier(SpecifierTree tree);

  void visitFromClause(FromClauseTree tree);

  void visitDefaultExportDeclaration(DefaultExportDeclarationTree tree);

  void visitNameSpaceExportDeclaration(NameSpaceExportDeclarationTree tree);

  void visitNamedExportDeclaration(NamedExportDeclarationTree tree);

  void visitVariableStatement(VariableStatementTree tree);

  void visitVariableDeclaration(VariableDeclarationTree tree);

  void visitClassDeclaration(ClassTree tree);

  void visitMethodDeclaration(MethodDeclarationTree tree);

  void visitParameterList(ParameterListTree tree);

  void visitFunctionDeclaration(FunctionDeclarationTree tree);

  void visitBlock(BlockTree tree);

  void visitEmptyStatement(EmptyStatementTree tree);

  void visitLabelledStatement(LabelledStatementTree tree);

  void visitExpressionStatement(ExpressionStatementTree tree);

  void visitIfStatement(IfStatementTree tree);

  void visitElseClause(ElseClauseTree tree);

  void visitForStatement(ForStatementTree tree);

  void visitForInStatement(ForInStatementTree tree);

  void visitForOfStatement(ForOfStatementTree tree);

  void visitWhileStatement(WhileStatementTree tree);

  void visitDoWhileStatement(DoWhileStatementTree tree);

  void visitContinueStatement(ContinueStatementTree tree);

  void visitIdentifier(IdentifierTree tree);

  void visitBreakStatement(BreakStatementTree tree);

  void visitReturnStatement(ReturnStatementTree tree);

  void visitWithStatement(WithStatementTree tree);

  void visitSwitchStatement(SwitchStatementTree tree);

  void visitDefaultClause(DefaultClauseTree tree);

  void visitCaseClause(CaseClauseTree tree);

  void visitThrowStatement(ThrowStatementTree tree);

  void visitTryStatement(TryStatementTree tree);

  void visitCatchBlock(CatchBlockTree tree);

  void visitDebugger(DebuggerStatementTree tree);

  void visitArrayBindingPattern(ArrayBindingPatternTree tree);

  void visitObjectLiteral(ObjectLiteralTree tree);

  void visitBindingProperty(BindingPropertyTree tree);

  void visitInitializedBindingElement(InitializedBindingElementTree tree);

  void visitLiteral(LiteralTree tree);

  void visitArrayLiteral(ArrayLiteralTree tree);

  void visitAssignmentExpression(AssignmentExpressionTree tree);

  void visitConditionalExpression(ConditionalExpressionTree tree);

  void visitArrowFunction(ArrowFunctionTree tree);

  void visitYieldExpression(YieldExpressionTree tree);

  void visitBinaryExpression(BinaryExpressionTree tree);

  void visitUnaryExpression(UnaryExpressionTree tree);

  void visitMemberExpression(MemberExpressionTree tree);

  void visitTaggedTemplate(TaggedTemplateTree tree);

  void visitCallExpression(CallExpressionTree tree);

  void visitTemplateLiteral(TemplateLiteralTree tree);

  void visitTemplateExpression(TemplateExpressionTree tree);

  void visitTemplateCharacters(TemplateCharactersTree tree);

  void visitParenthesisedExpression(ParenthesisedExpressionTree tree);

  void visitComputedPropertyName(ComputedPropertyNameTree tree);

  void visitPairProperty(PairPropertyTree tree);

  void visitNewExpression(NewExpressionTree tree);

  void visitThisTree(ThisTree tree);

  void visitFunctionExpression(FunctionExpressionTree tree);

  void visitRestElement(RestElementTree tree);

  void visitSuper(SuperTreeImpl tree);

  void visitObjectBindingPattern(ObjectBindingPatternTree tree);

  void visitExportClause(ExportClauseTree tree);

  void visitEndOfStatement(EndOfStatementTree tree);
}
