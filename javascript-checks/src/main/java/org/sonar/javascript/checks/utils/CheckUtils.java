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
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.parser.EcmaScriptGrammar;

public class CheckUtils {

  private CheckUtils() {
  }

  public static final ImmutableSet<Kind> ITERATION_STATEMENTS = ImmutableSet.of(
    Kind.DO_WHILE_STATEMENT,
    Kind.WHILE_STATEMENT,
    Kind.FOR_IN_STATEMENT,
    Kind.FOR_OF_STATEMENT,
    Kind.FOR_STATEMENT);

  public static final ImmutableSet<AstNodeType> FUNCTION_NODES = ImmutableSet.<AstNodeType>of(
    Kind.FUNCTION_EXPRESSION,
    EcmaScriptGrammar.FUNCTION_DECLARATION,
    EcmaScriptGrammar.METHOD,
    EcmaScriptGrammar.GENERATOR_METHOD,
    EcmaScriptGrammar.GENERATOR_DECLARATION,
    Kind.GENERATOR_FUNCTION_EXPRESSION,
    EcmaScriptGrammar.ARROW_FUNCTION,
    EcmaScriptGrammar.ARROW_FUNCTION_NO_IN);

  public static AstNodeType[] functionNodesArray() {
    return FUNCTION_NODES.toArray(new AstNodeType[FUNCTION_NODES.size()]);
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
}

