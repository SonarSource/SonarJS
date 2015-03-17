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
package org.sonar.javascript.checks.utils;

import com.google.common.collect.ImmutableSet;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import com.sonar.sslr.api.Token;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;

import java.util.List;

public class CheckUtils {

  private CheckUtils() {
  }

  public static final ImmutableSet<Kind> ASSIGNMENT_EXPRESSION = ImmutableSet.of(
    Kind.ASSIGNMENT,
    Kind.MULTIPLY_ASSIGNMENT,
    Kind.DIVIDE_ASSIGNMENT,
    Kind.REMAINDER_ASSIGNMENT,
    Kind.PLUS_ASSIGNMENT,
    Kind.MINUS_ASSIGNMENT,
    Kind.LEFT_SHIFT_ASSIGNMENT,
    Kind.RIGHT_SHIFT_ASSIGNMENT,
    Kind.UNSIGNED_RIGHT_SHIFT_ASSIGNMENT,
    Kind.AND_ASSIGNMENT,
    Kind.XOR_ASSIGNMENT,
    Kind.OR_ASSIGNMENT);

  public static final ImmutableSet<Kind> RELATIONAL_EXPRESSION = ImmutableSet.of(
    Kind.LESS_THAN,
    Kind.GREATER_THAN,
    Kind.LESS_THAN_OR_EQUAL_TO,
    Kind.GREATER_THAN_OR_EQUAL_TO,
    Kind.INSTANCE_OF,
    Kind.RELATIONAL_IN);

  public static final ImmutableSet<Kind> POSTFIX_EXPRESSION = ImmutableSet.of(
    Kind.POSTFIX_INCREMENT,
    Kind.POSTFIX_DECREMENT);

  public static final ImmutableSet<Kind> PREFIX_EXPRESSION = ImmutableSet.of(
    Kind.DELETE,
    Kind.VOID,
    Kind.TYPEOF,
    Kind.PREFIX_INCREMENT,
    Kind.PREFIX_DECREMENT,
    Kind.UNARY_PLUS,
    Kind.UNARY_MINUS,
    Kind.BITWISE_COMPLEMENT,
    Kind.LOGICAL_COMPLEMENT);

  public static final ImmutableSet<Kind> EQUALITY_EXPRESSION = ImmutableSet.of(
    Kind.EQUAL_TO,
    Kind.NOT_EQUAL_TO,
    Kind.STRICT_EQUAL_TO,
    Kind.STRICT_NOT_EQUAL_TO);

  public static final ImmutableSet<Kind> ITERATION_STATEMENTS = ImmutableSet.of(
    Kind.DO_WHILE_STATEMENT,
    Kind.WHILE_STATEMENT,
    Kind.FOR_IN_STATEMENT,
    Kind.FOR_OF_STATEMENT,
    Kind.FOR_STATEMENT);

  public static final ImmutableSet<Kind> FUNCTION_NODES = ImmutableSet.of(
    Kind.FUNCTION_EXPRESSION,
    Kind.FUNCTION_DECLARATION,
    Kind.METHOD,
    Kind.SET_METHOD,
    Kind.GET_METHOD,
    Kind.GENERATOR_METHOD,
    Kind.GENERATOR_DECLARATION,
    Kind.GENERATOR_FUNCTION_EXPRESSION,
    Kind.ARROW_FUNCTION);

  public static Kind[] assignmentExpressionArray() {
    return ASSIGNMENT_EXPRESSION.toArray(new Kind[ASSIGNMENT_EXPRESSION.size()]);
  }

  public static boolean isAssignmentExpression(AstNode astNode) {
    return ASSIGNMENT_EXPRESSION.contains(astNode.getType());
  }

  public static Kind[] postfixExpressionArray() {
    return POSTFIX_EXPRESSION.toArray(new Kind[POSTFIX_EXPRESSION.size()]);
  }

  public static boolean isPostfixExpression(AstNodeType type) {
    return POSTFIX_EXPRESSION.contains(type);
  }

  public static boolean isPostfixExpression(AstNode astNodeType) {
    return POSTFIX_EXPRESSION.contains(astNodeType.getType());
  }

  public static Kind[] relationalExpressionArray() {
    return RELATIONAL_EXPRESSION.toArray(new Kind[RELATIONAL_EXPRESSION.size()]);
  }

  public static boolean isRelationalExpression(AstNodeType type) {
    return RELATIONAL_EXPRESSION.contains(type);
  }

  public static Kind[] prefixExpressionArray() {
    return PREFIX_EXPRESSION.toArray(new Kind[PREFIX_EXPRESSION.size()]);
  }

  public static boolean isPrefixExpression(AstNode astNode) {
    return PREFIX_EXPRESSION.contains(astNode.getType());
  }

  public static Kind[] equalityExpressionArray() {
    return EQUALITY_EXPRESSION.toArray(new Kind[EQUALITY_EXPRESSION.size()]);
  }

  public static boolean isEqualityExpression(AstNode astNode) {
    return EQUALITY_EXPRESSION.contains(astNode.getType());
  }

  public static boolean isEqualityExpression(AstNodeType type) {
    return EQUALITY_EXPRESSION.contains(type);
  }

  public static Kind[] functionNodesArray() {
    return FUNCTION_NODES.toArray(new Kind[FUNCTION_NODES.size()]);
  }

  public static boolean isFunction(AstNode astNode) {
    return FUNCTION_NODES.contains(astNode.getType());
  }

  public static Kind[] iterationStatementsArray() {
    return ITERATION_STATEMENTS.toArray(new Kind[ITERATION_STATEMENTS.size()]);
  }

  public static boolean isIterationStatement(AstNode astNode) {
    return ITERATION_STATEMENTS.contains(astNode.getType());
  }
  
  public static String asString(Tree tree) {
    List<Token> tokens = ((JavaScriptTree) tree).getTokens();
    StringBuilder sb = new StringBuilder();
    Token prevToken = null;
    for (Token token : tokens) {
      if (prevToken != null && !areAdjacent(prevToken, token)) {
        sb.append(" ");
      }
      sb.append(token.getOriginalValue());
      prevToken = token;
    }
    return sb.toString();
  }

  private static boolean areAdjacent(Token prevToken, Token token) {
    return prevToken.getColumn() + prevToken.getOriginalValue().length() == token.getColumn();
  }
}

