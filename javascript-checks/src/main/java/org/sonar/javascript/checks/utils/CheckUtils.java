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

import com.sonar.sslr.api.AstNodeType;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.grammar.GrammarRuleKey;

import java.util.Arrays;

public class CheckUtils {

  private CheckUtils() {
  }

  private static final AstNodeType[] ITERATION_STATEMENTS = {
    Kind.DO_WHILE_STATEMENT,
    Kind.WHILE_STATEMENT,
    Kind.FOR_IN_STATEMENT,
    Kind.FOR_OF_STATEMENT,
    Kind.FOR_STATEMENT};

  private static final GrammarRuleKey[] FUNCTION_NODES = {
    EcmaScriptGrammar.FUNCTION_EXPRESSION,
    EcmaScriptGrammar.FUNCTION_DECLARATION,
    EcmaScriptGrammar.METHOD,
    EcmaScriptGrammar.GENERATOR_METHOD,
    EcmaScriptGrammar.GENERATOR_DECLARATION,
    EcmaScriptGrammar.GENERATOR_EXPRESSION,
    EcmaScriptGrammar.ARROW_FUNCTION,
    EcmaScriptGrammar.ARROW_FUNCTION_NO_IN};

  public static GrammarRuleKey[] getFunctionNodes() {
    return Arrays.copyOf(FUNCTION_NODES, FUNCTION_NODES.length);
  }

  public static AstNodeType[] iterationStatements() {
    return Arrays.copyOf(ITERATION_STATEMENTS, FUNCTION_NODES.length);
  }

}

