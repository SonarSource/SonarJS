/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

package org.sonar.plugins.javascript.api.estree;


public class ESTree {

  private ESTree() {
    // shouldn't be instantiated
  }
  
  sealed interface Node {

  }
  public record Program(String sourceType, Node body) implements Node {}
  public record ModuleDeclaration(Node moduleDeclaration) implements Node {}
  public record ExportAllDeclaration(Identifier exported, Literal source) implements Node {}
  public record Literal(Node literal) implements Node {}
  public record BigIntLiteral(int value, String bigint, String raw) implements Node {}
  public record SimpleLiteral(Node value, String raw) implements Node {}
  public record Identifier(String name) implements Node {}
  public record ExportDefaultDeclaration(Node declaration) implements Node {}
  public record Expression(Node expression) implements Node {}
  public record YieldExpression(Expression argument, boolean delegate) implements Node {}
  public record UpdateExpression(UpdateOperator operator, Expression argument, boolean prefix) implements Node {}
  public record UpdateOperator(String updateOperator) implements Node {}
  public record UnaryExpression(UnaryOperator operator, boolean prefix, Expression argument) implements Node {}
  public record UnaryOperator(String unaryOperator) implements Node {}
  public record ThisExpression() implements Node {}
  public record TemplateLiteral(Node quasis, Node expressions) implements Node {}
  public record TaggedTemplateExpression(Expression tag, TemplateLiteral quasi) implements Node {}
  public record SequenceExpression(Node expressions) implements Node {}
  public record ObjectExpression(Node properties) implements Node {}
  public record SpreadElement(Expression argument) implements Node {}
  public record Property(Node key, Node value, String kind, boolean method, boolean shorthand, boolean computed) implements Node {}
  public record Pattern(Node pattern) implements Node {}
  public record AssignmentPattern(Pattern left, Expression right) implements Node {}
  public record RestElement(Pattern argument) implements Node {}
  public record ArrayPattern(Node elements) implements Node {}
  public record ObjectPattern(Node properties) implements Node {}
  public record AssignmentProperty(Pattern value, String kind, boolean method, Node key, boolean shorthand, boolean computed) implements Node {}
  public record PrivateIdentifier(String name) implements Node {}
  public record NewExpression(Node callee, Node arguments) implements Node {}
  public record Super() implements Node {}
  public record MetaProperty(Identifier meta, Identifier property) implements Node {}
  public record MemberExpression(Node object, Node property, boolean computed, boolean optional) implements Node {}
  public record LogicalExpression(LogicalOperator operator, Expression left, Expression right) implements Node {}
  public record LogicalOperator(String logicalOperator) implements Node {}
  public record ImportExpression(Expression source) implements Node {}
  public record FunctionExpression(Identifier id, BlockStatement body, Node params, boolean generator, boolean async) implements Node {}
  public record BlockStatement(Node body) implements Node {}
  public record ConditionalExpression(Expression test, Expression alternate, Expression consequent) implements Node {}
  public record ClassExpression(Identifier id, Expression superClass, ClassBody body) implements Node {}
  public record ClassBody(Node body) implements Node {}
  public record StaticBlock() implements Node {}
  public record PropertyDefinition(Node key, Expression value, boolean computed, boolean isStatic) implements Node {}
  public record MethodDefinition(Node key, FunctionExpression value, String kind, boolean computed, boolean isStatic) implements Node {}
  public record ChainExpression(ChainElement expression) implements Node {}
  public record ChainElement(Node chainElement) implements Node {}
  public record SimpleCallExpression(boolean optional, Node callee, Node arguments) implements Node {}
  public record CallExpression(Node callExpression) implements Node {}
  public record BinaryExpression(BinaryOperator operator, Expression left, Expression right) implements Node {}
  public record BinaryOperator(String binaryOperator) implements Node {}
  public record AwaitExpression(Expression argument) implements Node {}
  public record AssignmentExpression(AssignmentOperator operator, Node left, Expression right) implements Node {}
  public record AssignmentOperator(String assignmentOperator) implements Node {}
  public record ArrowFunctionExpression(boolean expression, Node body, Node params, boolean generator, boolean async) implements Node {}
  public record ArrayExpression(Node elements) implements Node {}
  public record MaybeNamedClassDeclaration(Identifier id, Expression superClass, ClassBody body) implements Node {}
  public record MaybeNamedFunctionDeclaration(Identifier id, BlockStatement body, Node params, boolean generator, boolean async) implements Node {}
  public record ExportNamedDeclaration(Declaration declaration, Node specifiers, Literal source) implements Node {}
  public record ExportSpecifier(Identifier exported, Identifier local) implements Node {}
  public record Declaration(Node declaration) implements Node {}
  public record ClassDeclaration(Identifier id, Expression superClass, ClassBody body) implements Node {}
  public record VariableDeclaration(Node declarations, String kind) implements Node {}
  public record VariableDeclarator(Pattern id, Expression init) implements Node {}
  public record FunctionDeclaration(Identifier id, BlockStatement body, Node params, boolean generator, boolean async) implements Node {}
  public record ImportDeclaration(Node specifiers, Literal source) implements Node {}
  public record ImportNamespaceSpecifier(Identifier local) implements Node {}
  public record ImportDefaultSpecifier(Identifier local) implements Node {}
  public record ImportSpecifier(Identifier imported, Identifier local) implements Node {}
  public record Statement(Node statement) implements Node {}
  public record ForOfStatement(boolean await, Node left, Expression right, Statement body) implements Node {}
  public record ForInStatement(Node left, Expression right, Statement body) implements Node {}
  public record ForStatement(Node init, Expression test, Expression update, Statement body) implements Node {}
  public record DoWhileStatement(Statement body, Expression test) implements Node {}
  public record WhileStatement(Expression test, Statement body) implements Node {}
  public record TryStatement(BlockStatement block, CatchClause handler, BlockStatement finalizer) implements Node {}
  public record CatchClause(Pattern param, BlockStatement body) implements Node {}
  public record ThrowStatement(Expression argument) implements Node {}
  public record SwitchStatement(Expression discriminant, Node cases) implements Node {}
  public record SwitchCase(Expression test, Node consequent) implements Node {}
  public record IfStatement(Expression test, Statement consequent, Statement alternate) implements Node {}
  public record ContinueStatement(Identifier label) implements Node {}
  public record BreakStatement(Identifier label) implements Node {}
  public record LabeledStatement(Identifier label, Statement body) implements Node {}
  public record ReturnStatement(Expression argument) implements Node {}
  public record WithStatement(Expression object, Statement body) implements Node {}
  public record DebuggerStatement() implements Node {}
  public record EmptyStatement() implements Node {}
  public record ExpressionStatement(Expression expression) implements Node {}
  public record Directive(Literal expression, String directive) implements Node {}
}

