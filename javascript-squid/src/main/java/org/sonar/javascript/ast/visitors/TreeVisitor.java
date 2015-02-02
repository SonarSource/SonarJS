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

import org.sonar.javascript.model.implementations.expression.SuperTreeImpl;
import org.sonar.javascript.model.interfaces.ModuleTree;
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

}
