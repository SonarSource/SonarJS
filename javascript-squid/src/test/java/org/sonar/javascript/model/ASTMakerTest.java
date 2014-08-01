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
package org.sonar.javascript.model;

import com.google.common.base.Charsets;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.impl.Parser;
import org.junit.Ignore;
import org.junit.Test;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.javascript.parser.EcmaScriptParser;

import static org.fest.assertions.Assertions.assertThat;

@Ignore
public class ASTMakerTest {

  private final Parser p = EcmaScriptParser.create(new EcmaScriptConfiguration(Charsets.UTF_8));

  @Test
  public void nullLiteral() {
    AstNode astNode = p.parse("null;").getFirstDescendant(EcmaScriptGrammar.NULL_LITERAL);
    LiteralTree tree = (LiteralTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
  }

  @Test
  public void booleanLiteral() {
    AstNode astNode = p.parse("true;").getFirstDescendant(EcmaScriptGrammar.BOOLEAN_LITERAL);
    LiteralTree tree = (LiteralTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
  }

  @Test
  public void numericLiteral() {
    AstNode astNode = p.parse("42;").getFirstDescendant(EcmaScriptTokenType.NUMERIC_LITERAL);
    LiteralTree tree = (LiteralTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
  }

  @Test
  public void stringLiteral() {
    AstNode astNode = p.parse("'string';").getFirstDescendant(EcmaScriptGrammar.STRING_LITERAL);
    LiteralTree tree = (LiteralTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
  }

  @Test
  public void regularExpressionLiteral() {
    AstNode astNode = p.parse("/regexp/;").getFirstDescendant(EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL);
    LiteralTree tree = (LiteralTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
  }

  @Test
  public void identifier() {
    AstNode astNode = p.parse("id;").getFirstDescendant(EcmaScriptTokenType.IDENTIFIER);
    IdentifierTree tree = (IdentifierTree) ASTMaker.create().makeFrom(astNode);
    assertThat(tree.name()).isEqualTo("id");
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
  }

  @Test
  public void thisKeyword() {
    AstNode astNode = p.parse("this;").getFirstDescendant(EcmaScriptKeyword.THIS);
    IdentifierTree tree = (IdentifierTree) ASTMaker.create().makeFrom(astNode);
    assertThat(tree.name()).isEqualTo("this");
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
  }

  @Test
  public void groupingOperator() {
    AstNode astNode = p.parse("true;").getFirstDescendant(EcmaScriptGrammar.PRIMARY_EXPRESSION);
    assertThat(ASTMaker.create().makeFrom(astNode)).isInstanceOf(LiteralTree.class);

    astNode = p.parse("(true);").getFirstDescendant(EcmaScriptGrammar.PRIMARY_EXPRESSION);

    ParenthesizedTree tree = (ParenthesizedTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isNotNull();
  }

  @Test
  public void arrayLiteral() {
    AstNode astNode = p.parse("a = [ 42 , ];").getFirstDescendant(EcmaScriptGrammar.ARRAY_LITERAL);
    ArrayLiteralTree tree = (ArrayLiteralTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expressions()).hasSize(1);
  }

  @Test
  public void objectLiteral() {
    AstNode astNode = p.parse("a = { p : 42 };").getFirstDescendant(EcmaScriptGrammar.OBJECT_LITERAL);
    ObjectLiteralTree tree = (ObjectLiteralTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.propertyAssignments()).isNotEmpty();

    astNode = p.parse("a = { p : 42 };").getFirstDescendant(EcmaScriptGrammar.OBJECT_LITERAL);
    tree = (ObjectLiteralTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.propertyAssignments()).isNotEmpty();
  }

  @Test
  public void propertyAssignment() {
    // property
    AstNode astNode = p.parse("a = { p : 42 };").getFirstDescendant(EcmaScriptGrammar.PROPERTY_DEFINITION);
    PropertyAssignmentTree tree = (PropertyAssignmentTree) ASTMaker.create().makeFrom(astNode);
    assertThat(tree.propertyName()).isNotNull();
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.propertySetParameters()).isNull();
    assertThat(tree.body()).isNull();
    // getter
    astNode = p.parse("a = { get p() {} };").getFirstDescendant(EcmaScriptGrammar.PROPERTY_DEFINITION);
    tree = (PropertyAssignmentTree) ASTMaker.create().makeFrom(astNode);
    assertThat(tree.propertyName()).isNotNull();
    assertThat(tree.expression()).isNull();
    assertThat(tree.propertySetParameters()).isNull();
    assertThat(tree.body()).isNotNull();
    // setter
    astNode = p.parse("a = { set p(v) {} };").getFirstDescendant(EcmaScriptGrammar.PROPERTY_DEFINITION);
    tree = (PropertyAssignmentTree) ASTMaker.create().makeFrom(astNode);
    assertThat(tree.propertyName()).isNotNull();
    assertThat(tree.expression()).isNull();
    assertThat(tree.propertySetParameters()).isNotEmpty();
    assertThat(tree.body()).isNotNull();
  }

  @Test
  public void memberExpression() {
    // new
    AstNode astNode = p.parse("new foo();").getFirstDescendant(EcmaScriptGrammar.MEMBER_EXPRESSION);
    NewOperatorTree newOperatorTree = (NewOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) newOperatorTree).astNode).isSameAs(astNode);
    assertThat(newOperatorTree.constructor()).isNotNull();
    assertThat(newOperatorTree.arguments()).isEmpty();
    // index
    astNode = p.parse("foo[0];").getFirstDescendant(EcmaScriptGrammar.MEMBER_EXPRESSION);
    IndexAccessTree indexAccessTree = (IndexAccessTree) ASTMaker.create().makeFrom(astNode);
    assertThat(indexAccessTree.expression()).isNotNull();
    assertThat(indexAccessTree.index()).isNotNull();
    // property
    astNode = p.parse("foo.bar;").getFirstDescendant(EcmaScriptGrammar.MEMBER_EXPRESSION);
    PropertyAccessTree propertyAccessTree = (PropertyAccessTree) ASTMaker.create().makeFrom(astNode);
    assertThat(propertyAccessTree.expression()).isNotNull();
    assertThat(propertyAccessTree.identifier()).isNotNull();
  }

  @Test
  public void newExpression() {
    AstNode astNode = p.parse("foo;").getFirstDescendant(EcmaScriptGrammar.NEW_EXPRESSION);
    assertThat(ASTMaker.create().makeFrom(astNode)).isInstanceOf(IdentifierTree.class);

    astNode = p.parse("new foo;").getFirstDescendant(EcmaScriptGrammar.NEW_EXPRESSION);
    NewOperatorTree tree = (NewOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.constructor()).isNotNull();
    assertThat(tree.arguments()).isEmpty();
  }

  @Test
  public void callExpression() {
    AstNode astNode = p.parse("foo();").getFirstDescendant(EcmaScriptGrammar.CALL_EXPRESSION);
    FunctionCallTree tree = (FunctionCallTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.arguments()).isEmpty();

    astNode = p.parse("foo()(true);").getFirstDescendant(EcmaScriptGrammar.CALL_EXPRESSION);
    tree = (FunctionCallTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isInstanceOf(FunctionCallTree.class);
    assertThat(tree.arguments()).hasSize(1);

    astNode = p.parse("foo()[0];").getFirstDescendant(EcmaScriptGrammar.CALL_EXPRESSION);
    IndexAccessTree indexAccessTree = (IndexAccessTree) ASTMaker.create().makeFrom(astNode);
    assertThat(indexAccessTree.expression()).isNotNull();
    assertThat(indexAccessTree.index()).isNotNull();

    astNode = p.parse("foo().bar;").getFirstDescendant(EcmaScriptGrammar.CALL_EXPRESSION);
    PropertyAccessTree propertyAccessTree = (PropertyAccessTree) ASTMaker.create().makeFrom(astNode);
    assertThat(indexAccessTree.expression()).isNotNull();
    assertThat(propertyAccessTree.identifier()).isNotNull();
  }

  @Test
  public void postfixExpression() {
    AstNode astNode = p.parse("1;").getFirstDescendant(EcmaScriptGrammar.POSTFIX_EXPRESSION);
    assertThat(ASTMaker.create().makeFrom(astNode)).isInstanceOf(LiteralTree.class);

    astNode = p.parse("1++;").getFirstDescendant(EcmaScriptGrammar.POSTFIX_EXPRESSION);
    UnaryOperatorTree tree = (UnaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.operand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.INC);
  }

  @Test
  public void unaryExpression() {
    AstNode astNode = p.parse("true;").getFirstDescendant(EcmaScriptGrammar.UNARY_EXPRESSION);
    assertThat(ASTMaker.create().makeFrom(astNode)).isInstanceOf(LiteralTree.class);

    astNode = p.parse("typeof true;").getFirstDescendant(EcmaScriptGrammar.UNARY_EXPRESSION);
    UnaryOperatorTree tree = (UnaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.operand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptKeyword.TYPEOF);
  }

  @Test
  public void multiplicativeExpression() {
    AstNode astNode = p.parse("true * true").getFirstDescendant(EcmaScriptGrammar.MULTIPLICATIVE_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.STAR);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true / true * true").getFirstDescendant(EcmaScriptGrammar.MULTIPLICATIVE_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.DIV);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
  }

  @Test
  public void additiveExpression() {
    AstNode astNode = p.parse("true + true").getFirstDescendant(EcmaScriptGrammar.ADDITIVE_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.PLUS);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true - true + true").getFirstDescendant(EcmaScriptGrammar.ADDITIVE_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.MINUS);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
  }

  @Test
  public void shiftExpression() {
    AstNode astNode = p.parse("true << true").getFirstDescendant(EcmaScriptGrammar.SHIFT_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.SL);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true >> true << true").getFirstDescendant(EcmaScriptGrammar.SHIFT_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.SR);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
  }

  @Test
  public void relationalExpression() {
    AstNode astNode = p.parse("true < true").getFirstDescendant(EcmaScriptGrammar.RELATIONAL_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.LT);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true instanceof true < true").getFirstDescendant(EcmaScriptGrammar.RELATIONAL_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptKeyword.INSTANCEOF);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
  }

  @Test
  public void equalityExpression() {
    AstNode astNode = p.parse("true == true").getFirstDescendant(EcmaScriptGrammar.EQUALITY_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.EQUAL);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true != true == true").getFirstDescendant(EcmaScriptGrammar.EQUALITY_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.NOTEQUAL);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
  }

  @Test
  public void bitwiseAndExpression() {
    AstNode astNode = p.parse("true & true").getFirstDescendant(EcmaScriptGrammar.BITWISE_AND_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.AND);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true & true & true").getFirstDescendant(EcmaScriptGrammar.BITWISE_AND_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.AND);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
  }

  @Test
  public void bitwiseXorExpression() {
    AstNode astNode = p.parse("true ^ true").getFirstDescendant(EcmaScriptGrammar.BITWISE_XOR_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.XOR);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true ^ true ^ true").getFirstDescendant(EcmaScriptGrammar.BITWISE_XOR_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.XOR);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
  }

  @Test
  public void bitwiseOrExpression() {
    AstNode astNode = p.parse("true | true").getFirstDescendant(EcmaScriptGrammar.BITWISE_OR_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.OR);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true | true | true").getFirstDescendant(EcmaScriptGrammar.BITWISE_OR_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.OR);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
  }

  @Test
  public void logicalAndExpression() {
    AstNode astNode = p.parse("true && true").getFirstDescendant(EcmaScriptGrammar.LOGICAL_AND_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.ANDAND);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true && true && true").getFirstDescendant(EcmaScriptGrammar.LOGICAL_AND_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.ANDAND);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
  }

  @Test
  public void logicalOrExpression() {
    AstNode astNode = p.parse("true || true").getFirstDescendant(EcmaScriptGrammar.LOGICAL_OR_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.OROR);
    assertThat(tree.rightOperand()).isNotNull();

    astNode = p.parse("true || true || true").getFirstDescendant(EcmaScriptGrammar.LOGICAL_OR_EXPRESSION);
    tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.OROR);
    assertThat(tree.rightOperand()).isInstanceOf(BinaryOperatorTree.class);
  }

  @Test
  public void conditionalExpression() {
    AstNode astNode = p.parse("true ? false : true").getFirstDescendant(EcmaScriptGrammar.CONDITIONAL_EXPRESSION);
    ConditionalOperatorTree tree = (ConditionalOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.condition()).isNotNull();
    assertThat(tree.thenExpression()).isNotNull();
    assertThat(tree.elseExpression()).isNotNull();
  }

  @Test
  public void assignmentExpression() {
    AstNode astNode = p.parse("true = true").getFirstDescendant(EcmaScriptGrammar.ASSIGNMENT_EXPRESSION);
    BinaryOperatorTree tree = (BinaryOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator()).isEqualTo(EcmaScriptPunctuator.EQU);
    assertThat(tree.rightOperand()).isNotNull();
  }

  @Test
  public void expression() {
    AstNode astNode = p.parse("true").getFirstDescendant(EcmaScriptGrammar.EXPRESSION);
    assertThat(ASTMaker.create().makeFrom(astNode)).isInstanceOf(LiteralTree.class);

    astNode = p.parse("true, true").getFirstDescendant(EcmaScriptGrammar.EXPRESSION);
    CommaOperatorTree tree = (CommaOperatorTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expressions()).hasSize(2);
  }

  @Test
  public void block() {
    AstNode astNode = p.parse("{ }").getFirstDescendant(EcmaScriptGrammar.BLOCK);
    BlockTree tree = (BlockTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.statements()).isEmpty();

    astNode = p.parse("{ ; }").getFirstDescendant(EcmaScriptGrammar.BLOCK);
    tree = (BlockTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.statements()).hasSize(1);

    astNode = p.parse("{ ; ; }").getFirstDescendant(EcmaScriptGrammar.BLOCK);
    tree = (BlockTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.statements()).hasSize(2);

    astNode = p.parse("{ function fun() { } }").getFirstDescendant(EcmaScriptGrammar.BLOCK);
    tree = (BlockTree) ASTMaker.create().makeFrom(astNode);
    assertThat(tree.statements().get(0)).isInstanceOf(FunctionTree.class);
  }

  @Test
  public void variableStatement() {
    AstNode astNode = p.parse("var a;").getFirstDescendant(EcmaScriptGrammar.VARIABLE_STATEMENT);
    VariableStatementTree tree = (VariableStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.declarations()).hasSize(1);

    astNode = p.parse("var a, b;").getFirstDescendant(EcmaScriptGrammar.VARIABLE_STATEMENT);
    tree = (VariableStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.declarations()).hasSize(2);
  }

  @Test
  public void variableDeclaration() {
    AstNode astNode = p.parse("var a;").getFirstDescendant(EcmaScriptGrammar.VARIABLE_DECLARATION);
    VariableDeclarationTree tree = (VariableDeclarationTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    // FIXME: ecmascript 6 changed shape of tree, Strongly Typed AST not updated.
    //assertThat(tree.identifier()).isNotNull();
    assertThat(tree.initialiser()).isNull();

    astNode = p.parse("var a = true;").getFirstDescendant(EcmaScriptGrammar.VARIABLE_DECLARATION);
    tree = (VariableDeclarationTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    // FIXME: ecmascript 6 changed shape of tree, Strongly Typed AST not updated.
    //assertThat(tree.identifier()).isNotNull();
    //assertThat(tree.initialiser()).isNotNull();
  }

  @Test
  public void breakStatement() {
    AstNode astNode = p.parse("break").getFirstDescendant(EcmaScriptGrammar.BREAK_STATEMENT);
    BreakStatementTree tree = (BreakStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.label()).isNull();

    astNode = p.parse("break label").getFirstDescendant(EcmaScriptGrammar.BREAK_STATEMENT);
    tree = (BreakStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.label()).isNotNull();
  }

  @Test
  public void continueStatement() {
    AstNode astNode = p.parse("continue").getFirstDescendant(EcmaScriptGrammar.CONTINUE_STATEMENT);
    ContinueStatementTree tree = (ContinueStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.label()).isNull();

    astNode = p.parse("continue label").getFirstDescendant(EcmaScriptGrammar.CONTINUE_STATEMENT);
    tree = (ContinueStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.label()).isNotNull();
  }

  @Test
  public void debuggerStatement() {
    AstNode astNode = p.parse("debugger").getFirstDescendant(EcmaScriptGrammar.DEBUGGER_STATEMENT);
    DebuggerStatementTree tree = (DebuggerStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree).isNotNull();
  }

  @Test
  public void emptyStatement() {
    AstNode astNode = p.parse(";").getFirstDescendant(EcmaScriptGrammar.EMPTY_STATEMENT);
    EmptyStatementTree tree = (EmptyStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree).isNotNull();
  }

  @Test
  public void expressionStatement() {
    AstNode astNode = p.parse("true ;").getFirstDescendant(EcmaScriptGrammar.EXPRESSION_STATEMENT);
    ExpressionStatementTree tree = (ExpressionStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isNotNull();
  }

  @Test
  public void ifStatement() {
    AstNode astNode = p.parse("if (true) { ; ; }").getFirstDescendant(EcmaScriptGrammar.IF_STATEMENT);
    IfStatementTree tree = (IfStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.condition()).isNotNull();
    assertThat(tree.thenStatement()).isNotNull();
    assertThat(tree.elseStatement()).isNull();
  }

  @Test
  public void labelledStatement() {
    AstNode astNode = p.parse("label : ;").getFirstDescendant(EcmaScriptGrammar.LABELLED_STATEMENT);
    LabelledStatementTree tree = (LabelledStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.label()).isNotNull();
  }

  @Test
  public void returnStatement() {
    AstNode astNode = p.parse("return ;").getFirstDescendant(EcmaScriptGrammar.RETURN_STATEMENT);
    ReturnStatementTree tree = (ReturnStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isNull();

    astNode = p.parse("return true ;").getFirstDescendant(EcmaScriptGrammar.RETURN_STATEMENT);
    tree = (ReturnStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isNotNull();
  }

  @Test
  public void throwStatement() {
    AstNode astNode = p.parse("throw e ;").getFirstDescendant(EcmaScriptGrammar.THROW_STATEMENT);
    ThrowStatementTree tree = (ThrowStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isNotNull();
  }

  @Test
  public void whileStatement() {
    AstNode astNode = p.parse("while (true) ;").getFirstDescendant(EcmaScriptGrammar.WHILE_STATEMENT);
    WhileStatementTree tree = (WhileStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.condition()).isNotNull();
    assertThat(tree.statement()).isNotNull();
  }

  @Test
  public void doWhileStatement() {
    AstNode astNode = p.parse("do {} while (true) ;").getFirstDescendant(EcmaScriptGrammar.DO_WHILE_STATEMENT);
    DoWhileStatementTree tree = (DoWhileStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.statement()).isNotNull();
    assertThat(tree.condition()).isNotNull();
  }

  @Test
  public void forStatement() {
    AstNode astNode = p.parse("for ( ; ; ) ;").getFirstDescendant(EcmaScriptGrammar.FOR_STATEMENT);
    ForStatementTree tree = (ForStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.initVariables()).isNull();
    assertThat(tree.initExpression()).isNull();
    assertThat(tree.condition()).isNull();
    assertThat(tree.incrementExpression()).isNull();
    assertThat(tree.statement()).isNotNull();

    astNode = p.parse("for ( i = 0 ; i < 10 ; i++ ) ;").getFirstDescendant(EcmaScriptGrammar.FOR_STATEMENT);
    tree = (ForStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.initVariables()).isNull();
    assertThat(tree.initExpression()).isNotNull();
    assertThat(tree.condition()).isNotNull();
    assertThat(tree.incrementExpression()).isNotNull();
    assertThat(tree.statement()).isNotNull();

    astNode = p.parse("for ( var i = 0 ; i < 10 ; i++ ) ;").getFirstDescendant(EcmaScriptGrammar.FOR_STATEMENT);
    tree = (ForStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.initVariables()).hasSize(1);
    assertThat(tree.initExpression()).isNull();
    assertThat(tree.condition()).isNotNull();
    assertThat(tree.incrementExpression()).isNotNull();
    assertThat(tree.statement()).isNotNull();
  }

  @Test
  public void forInStatement() {
    AstNode astNode = p.parse("for ( i in a ) ;").getFirstDescendant(EcmaScriptGrammar.FOR_IN_STATEMENT);
    ForInStatementTree tree = (ForInStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.initVariables()).isNull();
    assertThat(tree.leftHandSideExpression()).isNotNull();
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.statement()).isNotNull();

    astNode = p.parse("for ( var i in a ) ;").getFirstDescendant(EcmaScriptGrammar.FOR_IN_STATEMENT);
    tree = (ForInStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.initVariables()).hasSize(1);
    assertThat(tree.leftHandSideExpression()).isNull();
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.statement()).isNotNull();
  }

  @Test
  public void withStatement() {
    AstNode astNode = p.parse("with ( e ) ;").getFirstDescendant(EcmaScriptGrammar.WITH_STATEMENT);
    WithStatementTree tree = (WithStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.statement()).isNotNull();
  }

  @Test
  public void switchStatement() {
    AstNode astNode = p.parse("switch (a) { case 1: break; case 2: break; default: break; }").getFirstDescendant(EcmaScriptGrammar.SWITCH_STATEMENT);
    SwitchStatementTree tree = (SwitchStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.cases()).hasSize(3);
  }

  @Test
  public void caseClause() {
    AstNode astNode = p.parse("switch (a) { case 1: ; case 2: ; default: ; }").getFirstDescendant(EcmaScriptGrammar.CASE_CLAUSE);
    CaseClauseTree tree = (CaseClauseTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.statements()).hasSize(1);
  }

  @Test
  public void defaultClause() {
    AstNode astNode = p.parse("switch (a) { case 1: ; default: ; }").getFirstDescendant(EcmaScriptGrammar.DEFAULT_CLAUSE);
    CaseClauseTree tree = (CaseClauseTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.expression()).isNull();
    assertThat(tree.statements()).hasSize(1);
  }

  @Test
  public void tryStatement() {
    AstNode astNode = p.parse("try { } catch(e) { }").getFirstDescendant(EcmaScriptGrammar.TRY_STATEMENT);
    TryStatementTree tree = (TryStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.block()).isNotNull();
    assertThat(tree.catchBlock()).isNotNull();
    assertThat(tree.finallyBlock()).isNull();

    astNode = p.parse("try { } finally { }").getFirstDescendant(EcmaScriptGrammar.TRY_STATEMENT);
    tree = (TryStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.block()).isNotNull();
    assertThat(tree.catchBlock()).isNull();
    assertThat(tree.finallyBlock()).isNotNull();

    astNode = p.parse("try { } catch(e) { } finally { }").getFirstDescendant(EcmaScriptGrammar.TRY_STATEMENT);
    tree = (TryStatementTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.block()).isNotNull();
    assertThat(tree.catchBlock()).isNotNull();
    assertThat(tree.finallyBlock()).isNotNull();
  }

  @Test
  public void program() {
    AstNode astNode = p.parse("true;");
    ProgramTree tree = (ProgramTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.sourceElements()).hasSize(1);

    astNode = p.parse("true; false;");
    tree = (ProgramTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.sourceElements()).hasSize(2);
  }

  @Test
  public void functionDeclaration() {
    AstNode astNode = p.parse("function fun() {}").getFirstDescendant(EcmaScriptGrammar.FUNCTION_DECLARATION);
    FunctionTree tree = (FunctionTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.identifier()).isNotNull();
    assertThat(tree.formalParameterList()).isEmpty();
    assertThat(tree.body()).isEmpty();
  }

  @Test
  public void functionExpression() {
    AstNode astNode = p.parse("f = function() {}").getFirstDescendant(EcmaScriptGrammar.FUNCTION_EXPRESSION);
    FunctionTree tree = (FunctionTree) ASTMaker.create().makeFrom(astNode);
    assertThat(((TreeImpl) tree).astNode).isSameAs(astNode);
    assertThat(tree.identifier()).isNull();
    assertThat(tree.formalParameterList()).isEmpty();
    assertThat(tree.body()).isEmpty();
  };

}
