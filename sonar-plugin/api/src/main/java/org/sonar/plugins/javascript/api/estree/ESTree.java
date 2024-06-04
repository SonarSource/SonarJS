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

import java.util.List;

public class ESTree {

  private ESTree() {
    // shouldn't be instantiated
  }
  
  sealed interface Node {
    
    String type();
    Location loc();
  }
  
  public record Location(int startLine, int startCol, int endLine, int endCol) {}

        
  public record Program(String type, Location loc, String sourceType, List<Node> body) implements Node {}
  public record ModuleDeclaration(String type, Location loc, Node moduleDeclaration) implements Node {}
  public record ExportAllDeclaration(String type, Location loc, Identifier exported, Literal source) implements Node {}
  public record Literal(String type, Location loc, Node literal) implements Node {}
  public record BigIntLiteral(String type, Location loc, int value, String bigint, String raw) implements Node {}
  public record SimpleLiteral(String type, Location loc, Node value, String raw) implements Node {}
  public record Identifier(String type, Location loc, String name) implements Node {}
  public record ExportDefaultDeclaration(String type, Location loc, Node declaration) implements Node {}
  public record Expression(String type, Location loc, Node expression) implements Node {}
  public record YieldExpression(String type, Location loc, Expression argument, boolean delegate) implements Node {}
  public record UpdateExpression(String type, Location loc, UpdateOperator operator, Expression argument, boolean prefix) implements Node {}
  public record UpdateOperator(String type, Location loc, String updateOperator) implements Node {}
  public record UnaryExpression(String type, Location loc, UnaryOperator operator, boolean prefix, Expression argument) implements Node {}
  public record UnaryOperator(String type, Location loc, String unaryOperator) implements Node {}
  public record ThisExpression(String type, Location loc) implements Node {}
  public record TemplateLiteral(String type, Location loc, List<TemplateElement> quasis, List<Expression> expressions) implements Node {}
  public record TaggedTemplateExpression(String type, Location loc, Expression tag, TemplateLiteral quasi) implements Node {}
  public record SequenceExpression(String type, Location loc, List<Expression> expressions) implements Node {}
  public record ObjectExpression(String type, Location loc, List<Node> properties) implements Node {}
  public record SpreadElement(String type, Location loc, Expression argument) implements Node {}
  public record Property(String type, Location loc, Node key, Node value, String kind, boolean method, boolean shorthand, boolean computed) implements Node {}
  public record Pattern(String type, Location loc, Node pattern) implements Node {}
  public record AssignmentPattern(String type, Location loc, Pattern left, Expression right) implements Node {}
  public record RestElement(String type, Location loc, Pattern argument) implements Node {}
  public record ArrayPattern(String type, Location loc, List<Pattern> elements) implements Node {}
  public record ObjectPattern(String type, Location loc, List<Node> properties) implements Node {}
  public record AssignmentProperty(String type, Location loc, Pattern value, String kind, boolean method, Node key, boolean shorthand, boolean computed) implements Node {}
  public record PrivateIdentifier(String type, Location loc, String name) implements Node {}
  public record NewExpression(String type, Location loc, Node callee, List<Node> arguments) implements Node {}
  public record Super(String type, Location loc) implements Node {}
  public record MetaProperty(String type, Location loc, Identifier meta, Identifier property) implements Node {}
  public record MemberExpression(String type, Location loc, Node object, Node property, boolean computed, boolean optional) implements Node {}
  public record LogicalExpression(String type, Location loc, LogicalOperator operator, Expression left, Expression right) implements Node {}
  public record LogicalOperator(String type, Location loc, String logicalOperator) implements Node {}
  public record ImportExpression(String type, Location loc, Expression source) implements Node {}
  public record FunctionExpression(String type, Location loc, Identifier id, BlockStatement body, List<Pattern> params, boolean generator, boolean async) implements Node {}
  public record BlockStatement(String type, Location loc, List<Statement> body) implements Node {}
  public record ConditionalExpression(String type, Location loc, Expression test, Expression alternate, Expression consequent) implements Node {}
  public record ClassExpression(String type, Location loc, Identifier id, Expression superClass, ClassBody body) implements Node {}
  public record ClassBody(String type, Location loc, List<Node> body) implements Node {}
  public record StaticBlock(String type, Location loc) implements Node {}
  public record PropertyDefinition(String type, Location loc, Node key, Expression value, boolean computed, boolean isStatic) implements Node {}
  public record MethodDefinition(String type, Location loc, Node key, FunctionExpression value, String kind, boolean computed, boolean isStatic) implements Node {}
  public record ChainExpression(String type, Location loc, ChainElement expression) implements Node {}
  public record ChainElement(String type, Location loc, Node chainElement) implements Node {}
  public record SimpleCallExpression(String type, Location loc, boolean optional, Node callee, List<Node> arguments) implements Node {}
  public record CallExpression(String type, Location loc, Node callExpression) implements Node {}
  public record BinaryExpression(String type, Location loc, BinaryOperator operator, Expression left, Expression right) implements Node {}
  public record BinaryOperator(String type, Location loc, String binaryOperator) implements Node {}
  public record AwaitExpression(String type, Location loc, Expression argument) implements Node {}
  public record AssignmentExpression(String type, Location loc, AssignmentOperator operator, Node left, Expression right) implements Node {}
  public record AssignmentOperator(String type, Location loc, String assignmentOperator) implements Node {}
  public record ArrowFunctionExpression(String type, Location loc, boolean expression, Node body, List<Pattern> params, boolean generator, boolean async) implements Node {}
  public record ArrayExpression(String type, Location loc, List<Node> elements) implements Node {}
  public record MaybeNamedClassDeclaration(String type, Location loc, Identifier id, Expression superClass, ClassBody body) implements Node {}
  public record MaybeNamedFunctionDeclaration(String type, Location loc, Identifier id, BlockStatement body, List<Pattern> params, boolean generator, boolean async) implements Node {}
  public record ExportNamedDeclaration(String type, Location loc, Declaration declaration, List<ExportSpecifier> specifiers, Literal source) implements Node {}
  public record ExportSpecifier(String type, Location loc, Identifier exported, Identifier local) implements Node {}
  public record Declaration(String type, Location loc, Node declaration) implements Node {}
  public record ClassDeclaration(String type, Location loc, Identifier id, Expression superClass, ClassBody body) implements Node {}
  public record VariableDeclaration(String type, Location loc, List<VariableDeclarator> declarations, String kind) implements Node {}
  public record VariableDeclarator(String type, Location loc, Pattern id, Expression init) implements Node {}
  public record FunctionDeclaration(String type, Location loc, Identifier id, BlockStatement body, List<Pattern> params, boolean generator, boolean async) implements Node {}
  public record ImportDeclaration(String type, Location loc, List<Node> specifiers, Literal source) implements Node {}
  public record ImportNamespaceSpecifier(String type, Location loc, Identifier local) implements Node {}
  public record ImportDefaultSpecifier(String type, Location loc, Identifier local) implements Node {}
  public record ImportSpecifier(String type, Location loc, Identifier imported, Identifier local) implements Node {}
  public record Statement(String type, Location loc, Node statement) implements Node {}
  public record ForOfStatement(String type, Location loc, boolean await, Node left, Expression right, Statement body) implements Node {}
  public record ForInStatement(String type, Location loc, Node left, Expression right, Statement body) implements Node {}
  public record ForStatement(String type, Location loc, Node init, Expression test, Expression update, Statement body) implements Node {}
  public record DoWhileStatement(String type, Location loc, Statement body, Expression test) implements Node {}
  public record WhileStatement(String type, Location loc, Expression test, Statement body) implements Node {}
  public record TryStatement(String type, Location loc, BlockStatement block, CatchClause handler, BlockStatement finalizer) implements Node {}
  public record CatchClause(String type, Location loc, Pattern param, BlockStatement body) implements Node {}
  public record ThrowStatement(String type, Location loc, Expression argument) implements Node {}
  public record SwitchStatement(String type, Location loc, Expression discriminant, List<SwitchCase> cases) implements Node {}
  public record SwitchCase(String type, Location loc, Expression test, List<Statement> consequent) implements Node {}
  public record IfStatement(String type, Location loc, Expression test, Statement consequent, Statement alternate) implements Node {}
  public record ContinueStatement(String type, Location loc, Identifier label) implements Node {}
  public record BreakStatement(String type, Location loc, Identifier label) implements Node {}
  public record LabeledStatement(String type, Location loc, Identifier label, Statement body) implements Node {}
  public record ReturnStatement(String type, Location loc, Expression argument) implements Node {}
  public record WithStatement(String type, Location loc, Expression object, Statement body) implements Node {}
  public record DebuggerStatement(String type, Location loc) implements Node {}
  public record EmptyStatement(String type, Location loc) implements Node {}
  public record ExpressionStatement(String type, Location loc, Expression expression) implements Node {}
  public record Directive(String type, Location loc, Literal expression, String directive) implements Node {}
}

