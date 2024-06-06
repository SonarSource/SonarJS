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

/**
  This file is generated. Do not modify it manually. Look at tools/estree instead.
  
  This is !EXPERIMENTAL UNSUPPORTED INTERNAL API! It can be modified or removed without prior notice.   
*/
public class ESTree {

  private ESTree() {
    // shouldn't be instantiated, used only as a namespace
  }
  
  public sealed interface Node {    
    Location loc();
  }
  
  public record Position(int line, int column) {}
  public record Location(Position start, Position end) {}
  
  public sealed interface CallExpression extends Node {
    Node callee();
    List<Node> arguments();
  }
  public sealed interface ChainElement extends Node {
    boolean optional();
  }
  public sealed interface Declaration extends Node {

  }
  public sealed interface ExportDefaultDeclaration extends Node {

  }
  public sealed interface Expression extends Node {

  }
  public sealed interface HasBody extends Node {
    Node body();
  }
  public sealed interface HasTest extends Node {
    Expression test();
  }
  public sealed interface Literal extends Node {
    String raw();
  }
  public sealed interface ModuleDeclaration extends Node {

  }
  public sealed interface Pattern extends Node {

  }
  public sealed interface Statement extends Node {

  }
        
  public record ArrayExpression(Location loc, List<Node> elements) implements Expression {}
  public record ArrayPattern(Location loc, List<Pattern> elements) implements Pattern {}
  public record ArrowFunctionExpression(Location loc, boolean expression, Node body, List<Pattern> params, boolean generator, boolean async) implements Expression, HasBody {}
  public record AssignmentExpression(Location loc, AssignmentOperator operator, Node left, Expression right) implements Expression {}
  public record AssignmentOperator(Location loc, String assignmentOperator) implements Node {}
  public record AssignmentPattern(Location loc, Pattern left, Expression right) implements Pattern {}
  public record AssignmentProperty(Location loc, Pattern value, String kind, boolean method, Node key, boolean shorthand, boolean computed) implements Node {}
  public record AwaitExpression(Location loc, Expression argument) implements Expression {}
  public record BigIntLiteral(Location loc, int value, String bigint, String raw) implements Literal {}
  public record BinaryExpression(Location loc, BinaryOperator operator, Expression left, Expression right) implements Expression {}
  public record BinaryOperator(Location loc, String binaryOperator) implements Node {}
  public record BlockStatement(Location loc, List<Statement> body) implements Statement {}
  public record BreakStatement(Location loc, Identifier label) implements Statement {}
  public record CatchClause(Location loc, Pattern param, BlockStatement body) implements Node, HasBody {}
  public record ChainExpression(Location loc, ChainElement expression) implements Expression {}
  public record ClassBody(Location loc, List<Node> body) implements Node {}
  public record ClassDeclaration(Location loc, Identifier id, Expression superClass, ClassBody body) implements Declaration, HasBody {}
  public record ClassExpression(Location loc, Identifier id, Expression superClass, ClassBody body) implements Expression, HasBody {}
  public record ConditionalExpression(Location loc, Expression test, Expression alternate, Expression consequent) implements Expression, HasTest {}
  public record ContinueStatement(Location loc, Identifier label) implements Statement {}
  public record DebuggerStatement(Location loc) implements Statement {}
  public record Directive(Location loc, Literal expression, String directive) implements Node {}
  public record DoWhileStatement(Location loc, Statement body, Expression test) implements Statement, HasBody, HasTest {}
  public record EmptyStatement(Location loc) implements Statement {}
  public record ExportAllDeclaration(Location loc, Identifier exported, Literal source) implements ModuleDeclaration {}
  public record ExportNamedDeclaration(Location loc, Declaration declaration, List<ExportSpecifier> specifiers, Literal source) implements ModuleDeclaration {}
  public record ExportSpecifier(Location loc, Identifier exported, Identifier local) implements Node {}
  public record ExpressionStatement(Location loc, Expression expression) implements Statement {}
  public record ForInStatement(Location loc, Node left, Expression right, Statement body) implements Statement, HasBody {}
  public record ForOfStatement(Location loc, boolean await, Node left, Expression right, Statement body) implements Statement, HasBody {}
  public record ForStatement(Location loc, Node init, Expression test, Expression update, Statement body) implements Statement, HasBody, HasTest {}
  public record FunctionDeclaration(Location loc, Identifier id, BlockStatement body, List<Pattern> params, boolean generator, boolean async) implements Declaration, HasBody {}
  public record FunctionExpression(Location loc, Identifier id, BlockStatement body, List<Pattern> params, boolean generator, boolean async) implements Expression, HasBody {}
  public record Identifier(Location loc, String name) implements Expression, Pattern {}
  public record IfStatement(Location loc, Expression test, Statement consequent, Statement alternate) implements Statement, HasTest {}
  public record ImportDeclaration(Location loc, List<Node> specifiers, Literal source) implements ModuleDeclaration {}
  public record ImportDefaultSpecifier(Location loc, Identifier local) implements Node {}
  public record ImportExpression(Location loc, Expression source) implements Expression {}
  public record ImportNamespaceSpecifier(Location loc, Identifier local) implements Node {}
  public record ImportSpecifier(Location loc, Identifier imported, Identifier local) implements Node {}
  public record LabeledStatement(Location loc, Identifier label, Statement body) implements Statement, HasBody {}
  public record LogicalExpression(Location loc, LogicalOperator operator, Expression left, Expression right) implements Expression {}
  public record LogicalOperator(Location loc, String logicalOperator) implements Node {}
  public record MaybeNamedClassDeclaration(Location loc, Identifier id, Expression superClass, ClassBody body) implements ExportDefaultDeclaration, HasBody {}
  public record MaybeNamedFunctionDeclaration(Location loc, Identifier id, BlockStatement body, List<Pattern> params, boolean generator, boolean async) implements ExportDefaultDeclaration, HasBody {}
  public record MemberExpression(Location loc, Node object, Node property, boolean computed, boolean optional) implements ChainElement, Expression, Pattern {}
  public record MetaProperty(Location loc, Identifier meta, Identifier property) implements Expression {}
  public record MethodDefinition(Location loc, Node key, FunctionExpression value, String kind, boolean computed, boolean isStatic) implements Node {}
  public record NewExpression(Location loc, Node callee, List<Node> arguments) implements CallExpression, Expression {}
  public record ObjectExpression(Location loc, List<Node> properties) implements Expression {}
  public record ObjectPattern(Location loc, List<Node> properties) implements Pattern {}
  public record PrivateIdentifier(Location loc, String name) implements Node {}
  public record Program(Location loc, String sourceType, List<Node> body) implements Node {}
  public record Property(Location loc, Node key, Node value, String kind, boolean method, boolean shorthand, boolean computed) implements Node {}
  public record PropertyDefinition(Location loc, Node key, Expression value, boolean computed, boolean isStatic) implements Node {}
  public record RegExpLiteral(Location loc, String pattern, String flags, String raw) implements Literal {}
  public record RestElement(Location loc, Pattern argument) implements Pattern {}
  public record ReturnStatement(Location loc, Expression argument) implements Statement {}
  public record SequenceExpression(Location loc, List<Expression> expressions) implements Expression {}
  public record SimpleCallExpression(Location loc, boolean optional, Node callee, List<Node> arguments) implements CallExpression, ChainElement {}
  public record SimpleLiteral(Location loc, Node value, String raw) implements Literal {}
  public record SpreadElement(Location loc, Expression argument) implements Node {}
  public record StaticBlock(Location loc) implements Statement {}
  public record Super(Location loc) implements Node {}
  public record SwitchCase(Location loc, Expression test, List<Statement> consequent) implements Node, HasTest {}
  public record SwitchStatement(Location loc, Expression discriminant, List<SwitchCase> cases) implements Statement {}
  public record TaggedTemplateExpression(Location loc, Expression tag, TemplateLiteral quasi) implements Expression {}
  public record TemplateElement(Location loc, boolean tail, String cooked, String raw) implements Node {}
  public record TemplateLiteral(Location loc, List<TemplateElement> quasis, List<Expression> expressions) implements Expression {}
  public record ThisExpression(Location loc) implements Expression {}
  public record ThrowStatement(Location loc, Expression argument) implements Statement {}
  public record TryStatement(Location loc, BlockStatement block, CatchClause handler, BlockStatement finalizer) implements Statement {}
  public record UnaryExpression(Location loc, UnaryOperator operator, boolean prefix, Expression argument) implements Expression {}
  public record UnaryOperator(Location loc, String unaryOperator) implements Node {}
  public record UpdateExpression(Location loc, UpdateOperator operator, Expression argument, boolean prefix) implements Expression {}
  public record UpdateOperator(Location loc, String updateOperator) implements Node {}
  public record VariableDeclaration(Location loc, List<VariableDeclarator> declarations, String kind) implements Declaration {}
  public record VariableDeclarator(Location loc, Pattern id, Expression init) implements Node {}
  public record WhileStatement(Location loc, Expression test, Statement body) implements Statement, HasBody, HasTest {}
  public record WithStatement(Location loc, Expression object, Statement body) implements Statement, HasBody {}
  public record YieldExpression(Location loc, Expression argument, boolean delegate) implements Expression {}
}

