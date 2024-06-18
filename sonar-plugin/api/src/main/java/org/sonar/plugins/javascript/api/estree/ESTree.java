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

import java.math.BigInteger;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

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
  
  public sealed interface CallExpression extends Expression {
    ExpressionOrSuper callee();
    List<ExpressionOrSpreadElement> arguments();
  }
  public sealed interface ChainElement extends Node {
    boolean optional();
  }
  public sealed interface Declaration extends Statement {

  }
  public sealed interface Expression extends ExpressionOrSpreadElement, ExpressionOrSuper, ExpressionOrPrivateIdentifier, ExpressionOrPattern, ExpressionOrVariableDeclaration, ExpressionOrClassDeclarationOrFunctionDeclaration, BlockStatementOrExpression {

  }
  public sealed interface Literal extends Expression, IdentifierOrLiteral {
    String raw();
  }
  public sealed interface ModuleDeclaration extends DirectiveOrModuleDeclarationOrStatement {

  }
  public sealed interface Pattern extends ExpressionOrPattern, PatternOrVariableDeclaration, MemberExpressionOrPattern {

  }
  public sealed interface Statement extends DirectiveOrModuleDeclarationOrStatement {

  }

  public sealed interface ExpressionOrSpreadElement extends Node {}
  public sealed interface BlockStatementOrExpression extends Node {}
  public sealed interface MemberExpressionOrPattern extends Node {}
  public sealed interface ExpressionOrPrivateIdentifier extends Node {}
  public sealed interface MethodDefinitionOrPropertyDefinitionOrStaticBlock extends Node {}
  public sealed interface ExpressionOrClassDeclarationOrFunctionDeclaration extends Node {}
  public sealed interface PatternOrVariableDeclaration extends Node {}
  public sealed interface ExpressionOrVariableDeclaration extends Node {}
  public sealed interface ImportDefaultSpecifierOrImportNamespaceSpecifierOrImportSpecifier extends Node {}
  public sealed interface ExpressionOrSuper extends Node {}
  public sealed interface PropertyOrSpreadElement extends Node {}
  public sealed interface PropertyOrRestElement extends Node {}
  public sealed interface DirectiveOrModuleDeclarationOrStatement extends Node {}
  public sealed interface ExpressionOrPattern extends Node {}
  public sealed interface IdentifierOrLiteral extends Node {}
        
  public record ArrayExpression(Location loc, List<ExpressionOrSpreadElement> elements) implements Expression {}
  public record ArrayPattern(Location loc, List<Pattern> elements) implements Pattern {}
  public record ArrowFunctionExpression(Location loc, boolean expression, BlockStatementOrExpression body, List<Pattern> params, boolean generator, boolean async) implements Expression {}
  public record AssignmentExpression(Location loc, AssignmentOperator operator, MemberExpressionOrPattern left, Expression right) implements Expression {}
  public record AssignmentPattern(Location loc, Pattern left, Expression right) implements Pattern {}
  public record AwaitExpression(Location loc, Expression argument) implements Expression {}
  public record BigIntLiteral(Location loc, BigInteger value, String bigint, String raw) implements Literal {}
  public record BinaryExpression(Location loc, BinaryOperator operator, Expression left, Expression right) implements Expression {}
  public record BlockStatement(Location loc, List<Statement> body) implements BlockStatementOrExpression, Statement {}
  public record BreakStatement(Location loc, Optional<Identifier> label) implements Statement {}
  public record CatchClause(Location loc, Optional<Pattern> param, BlockStatement body) implements Node {}
  public record ChainExpression(Location loc, ChainElement expression) implements Expression {}
  public record ClassBody(Location loc, List<MethodDefinitionOrPropertyDefinitionOrStaticBlock> body) implements Node {}
  // See "ExportDefaultDeclaration" for explanation about the optional id field.
  public record ClassDeclaration(Location loc, Optional<Identifier> id, Optional<Expression> superClass, ClassBody body) implements Declaration, ExpressionOrClassDeclarationOrFunctionDeclaration {}
  public record ClassExpression(Location loc, Optional<Identifier> id, Optional<Expression> superClass, ClassBody body) implements Expression {}
  public record ConditionalExpression(Location loc, Expression test, Expression alternate, Expression consequent) implements Expression {}
  public record ContinueStatement(Location loc, Optional<Identifier> label) implements Statement {}
  public record DebuggerStatement(Location loc) implements Statement {}
  public record Directive(Location loc, Literal expression, String directive) implements DirectiveOrModuleDeclarationOrStatement {}
  public record DoWhileStatement(Location loc, Statement body, Expression test) implements Statement {}
  public record EmptyStatement(Location loc) implements Statement {}
  public record ExportAllDeclaration(Location loc, Optional<IdentifierOrLiteral> exported, Literal source) implements ModuleDeclaration {}
  // In "d.ts" file, the declaration field has type: MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | Expression.
  // The "MaybeNamed" are there to show that the id is optional in this specific case.
  // We decided to not create this extra class, and instead use the existing FunctionDeclaration and ClassDeclaration classes.
  // The consequence is that the id field of these classes is now optional (while it is not in the "d.ts" file).
  public record ExportDefaultDeclaration(Location loc, ExpressionOrClassDeclarationOrFunctionDeclaration declaration) implements ModuleDeclaration {}
  public record ExportNamedDeclaration(Location loc, Optional<Declaration> declaration, List<ExportSpecifier> specifiers, Optional<Literal> source) implements ModuleDeclaration {}
  public record ExportSpecifier(Location loc, Identifier exported, Identifier local) implements Node {}
  public record ExpressionStatement(Location loc, Expression expression) implements Statement {}
  public record ForInStatement(Location loc, PatternOrVariableDeclaration left, Expression right, Statement body) implements Statement {}
  public record ForOfStatement(Location loc, boolean await, PatternOrVariableDeclaration left, Expression right, Statement body) implements Statement {}
  public record ForStatement(Location loc, Optional<ExpressionOrVariableDeclaration> init, Optional<Expression> test, Optional<Expression> update, Statement body) implements Statement {}
  // See "ExportDefaultDeclaration" for explanation about the optional id field.
  public record FunctionDeclaration(Location loc, Optional<Identifier> id, BlockStatement body, List<Pattern> params, boolean generator, boolean async) implements Declaration, ExpressionOrClassDeclarationOrFunctionDeclaration  {}
  public record FunctionExpression(Location loc, Optional<Identifier> id, BlockStatement body, List<Pattern> params, boolean generator, boolean async) implements Expression {}
  public record Identifier(Location loc, String name) implements Expression, Pattern, IdentifierOrLiteral {}
  public record IfStatement(Location loc, Expression test, Statement consequent, Optional<Statement> alternate) implements Statement {}
  public record ImportDeclaration(Location loc, List<ImportDefaultSpecifierOrImportNamespaceSpecifierOrImportSpecifier> specifiers, Literal source) implements ModuleDeclaration {}
  public record ImportDefaultSpecifier(Location loc, Identifier local) implements ImportDefaultSpecifierOrImportNamespaceSpecifierOrImportSpecifier {}
  public record ImportExpression(Location loc, Expression source) implements Expression {}
  public record ImportNamespaceSpecifier(Location loc, Identifier local) implements ImportDefaultSpecifierOrImportNamespaceSpecifierOrImportSpecifier {}
  public record ImportSpecifier(Location loc, Identifier imported, Identifier local) implements ImportDefaultSpecifierOrImportNamespaceSpecifierOrImportSpecifier {}
  public record LabeledStatement(Location loc, Identifier label, Statement body) implements Statement {}
  public record LogicalExpression(Location loc, LogicalOperator operator, Expression left, Expression right) implements Expression {}
  public record MemberExpression(Location loc, ExpressionOrSuper object, ExpressionOrPrivateIdentifier property, boolean computed, boolean optional) implements ChainElement, Expression, Pattern {}
  public record MetaProperty(Location loc, Identifier meta, Identifier property) implements Expression {}
  public record MethodDefinition(Location loc, ExpressionOrPrivateIdentifier key, FunctionExpression value, String kind, boolean computed, boolean isStatic) implements MethodDefinitionOrPropertyDefinitionOrStaticBlock {}
  public record NewExpression(Location loc, ExpressionOrSuper callee, List<ExpressionOrSpreadElement> arguments) implements CallExpression {}
  public record ObjectExpression(Location loc, List<PropertyOrSpreadElement> properties) implements Expression {}
  public record ObjectPattern(Location loc, List<PropertyOrRestElement> properties) implements Pattern {}
  public record PrivateIdentifier(Location loc, String name) implements ExpressionOrPrivateIdentifier {}
  public record Program(Location loc, String sourceType, List<DirectiveOrModuleDeclarationOrStatement> body) implements Node {}
  // In Estree "d.ts", we also have an "AssignmentProperty", which is a "Property" with a "kind" field set to "init".
  // We decided to not create this extra class, and instead use the existing Property class, as it is not trivial to distinguish between the two.
  public record Property(Location loc, ExpressionOrPrivateIdentifier key, ExpressionOrPattern value, String kind, boolean method, boolean shorthand, boolean computed) implements PropertyOrSpreadElement, PropertyOrRestElement {}
  public record PropertyDefinition(Location loc, ExpressionOrPrivateIdentifier key, Optional<Expression> value, boolean computed, boolean isStatic) implements MethodDefinitionOrPropertyDefinitionOrStaticBlock {}
  public record RegExpLiteral(Location loc, String pattern, String flags, String raw) implements Literal {}
  public record RestElement(Location loc, Pattern argument) implements PropertyOrRestElement, Pattern {}
  public record ReturnStatement(Location loc, Optional<Expression> argument) implements Statement {}
  public record SequenceExpression(Location loc, List<Expression> expressions) implements Expression {}
  public record SimpleCallExpression(Location loc, boolean optional, ExpressionOrSuper callee, List<ExpressionOrSpreadElement> arguments) implements CallExpression, ChainElement {}
  public record SimpleLiteral(Location loc, Object value, String raw) implements Literal {}
  public record SpreadElement(Location loc, Expression argument) implements ExpressionOrSpreadElement, PropertyOrSpreadElement {}
  public record StaticBlock(Location loc, List<Statement> body) implements MethodDefinitionOrPropertyDefinitionOrStaticBlock, Statement {}
  public record Super(Location loc) implements ExpressionOrSuper {}
  public record SwitchCase(Location loc, Optional<Expression> test, List<Statement> consequent) implements Node {}
  public record SwitchStatement(Location loc, Expression discriminant, List<SwitchCase> cases) implements Statement {}
  public record TaggedTemplateExpression(Location loc, Expression tag, TemplateLiteral quasi) implements Expression {}
  public record TemplateElement(Location loc, boolean tail, String cooked, String raw) implements Node {}
  public record TemplateLiteral(Location loc, List<TemplateElement> quasis, List<Expression> expressions) implements Expression {}
  public record ThisExpression(Location loc) implements Expression {}
  public record ThrowStatement(Location loc, Expression argument) implements Statement {}
  public record TryStatement(Location loc, BlockStatement block, Optional<CatchClause> handler, Optional<BlockStatement> finalizer) implements Statement {}
  public record UnaryExpression(Location loc, UnaryOperator operator, boolean prefix, Expression argument) implements Expression {}
  public record UpdateExpression(Location loc, UpdateOperator operator, Expression argument, boolean prefix) implements Expression {}
  public record VariableDeclaration(Location loc, List<VariableDeclarator> declarations, String kind) implements ExpressionOrVariableDeclaration, PatternOrVariableDeclaration, Declaration {}
  public record VariableDeclarator(Location loc, Pattern id, Optional<Expression> init) implements Node {}
  public record WhileStatement(Location loc, Expression test, Statement body) implements Statement {}
  public record WithStatement(Location loc, Expression object, Statement body) implements Statement {}
  public record YieldExpression(Location loc, Optional<Expression> argument, boolean delegate) implements Expression {}

  public interface Operator {
    String raw();
  }

  public enum UnaryOperator implements Operator {
    MINUS("-"), PLUS("+"), LOGICAL_NOT("!"), BITWISE_NOT("~"), TYPEOF("typeof"), VOID("void"), DELETE("delete");

    private final String raw;

    UnaryOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }

    public static UnaryOperator from(String operator) {
      return Arrays.stream(values()).filter(v -> Objects.equals(operator, v.raw)).findFirst().orElse(null);
    }
  }
  
  public enum BinaryOperator implements Operator {
    EQUAL("=="), 
    NOT_EQUAL("!="), 
    STRICT_EQUAL("==="), 
    STRICT_NOT_EQUAL("!=="), 
    LESS_THAN("<"), 
    LESS_THAN_OR_EQUAL("<="), 
    GREATER_THAN(">"), 
    GREATER_THAN_OR_EQUAL(">="), 
    LEFT_SHIFT("<<"), 
    RIGHT_SHIFT(">>"), 
    UNSIGNED_RIGHT_SHIFT(">>>"), 
    PLUS("+"), 
    MINUS("-"), 
    MULTIPLY("*"), 
    DIVIDE("/"), 
    MODULO("%"), 
    EXPONENTIATION("**"), 
    BITWISE_AND("&"), 
    BITWISE_OR("|"), 
    BITWISE_XOR("^"), 
    IN("in"), 
    INSTANCEOF("instanceof");

    private final String raw;

    BinaryOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }

    public static BinaryOperator from(String operator) {
      return Arrays.stream(values()).filter(v -> Objects.equals(operator, v.raw)).findFirst().orElse(null);
    }
  }
  
  public enum LogicalOperator implements Operator {
    AND("&&"), OR("||"), NULLISH_COALESCING("??");

    private final String raw;

    LogicalOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }

    public static LogicalOperator from(String operator) {
      return Arrays.stream(values()).filter(v -> Objects.equals(operator, v.raw)).findFirst().orElse(null);
    }
  }
  
  public enum AssignmentOperator implements Operator {
    ASSIGN("="), 
    PLUS_ASSIGN("+="), 
    MINUS_ASSIGN("-="), 
    MULTIPLY_ASSIGN("*="), 
    DIVIDE_ASSIGN("/="), 
    MODULO_ASSIGN("%="),
    EXPONENTIATION_ASSIGN("**="),
    LEFT_SHIFT_ASSIGN("<<="),
    RIGHT_SHIFT_ASSIGN(">>="),
    UNSIGNED_RIGHT_SHIFT_ASSIGN(">>>="),
    BITWISE_OR_ASSIGN("|="),
    BITWISE_XOR_ASSIGN("^="),
    BITWISE_AND_ASSIGN("&="),
    LOGICAL_OR_ASSIGN("||="),
    LOGICAL_AND_ASSIGN("&&="),
    NULLISH_COALESCING_ASSIGN("??=")
    ;

    private final String raw;

    AssignmentOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }

    public static AssignmentOperator from(String operator) {
      return Arrays.stream(values()).filter(v -> Objects.equals(operator, v.raw)).findFirst().orElse(null);
    }
  }
  
  public enum UpdateOperator implements Operator {
    INCREMENT("++"), DECREMENT("--");

    private final String raw;

    UpdateOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }

    public static UpdateOperator from(String operator) {
      return Arrays.stream(values()).filter(v -> Objects.equals(operator, v.raw)).findFirst().orElse(null);
    }
  }
}

