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
package org.sonar.javascript.checks;

import com.sonar.sslr.api.AstNode;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.HashSet;
import java.util.Set;
import java.util.Stack;

@Rule(
  key = "SameNameForFunctionAndVariable",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class SameNameForFunctionAndVariableCheck extends SquidCheck<LexerlessGrammar> {

  private Stack<Set<String>> variablesStack;
  private Stack<Set<String>> functionsStack;

  private static final GrammarRuleKey[] FUNCTION_NODES = {
    Kind.FUNCTION_DECLARATION,
    EcmaScriptGrammar.FUNCTION_EXPRESSION,
    Kind.GENERATOR_DECLARATION,
    Kind.FUNCTION_EXPRESSION};

  private static final GrammarRuleKey[] CONST_AND_VAR_NODES = {
    Kind.VARIABLE_DECLARATION,
    EcmaScriptGrammar.VARIABLE_DECLARATION_NO_IN,
    EcmaScriptGrammar.LEXICAL_BINDING,
    EcmaScriptGrammar.LEXICAL_BINDING_NO_IN};

  @Override
  public void init() {
    subscribeTo(CONST_AND_VAR_NODES);
    subscribeTo(FUNCTION_NODES);
  }

  @Override
  public void visitFile(AstNode astNode) {
    variablesStack = new Stack<Set<String>>();
    variablesStack.add(new HashSet<String>());
    functionsStack = new Stack<Set<String>>();
    functionsStack.add(new HashSet<String>());
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(Kind.FUNCTION_DECLARATION, Kind.GENERATOR_DECLARATION)) {
      String functionName = astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER, Kind.BINDING_IDENTIFIER).getTokenValue();
      check(astNode, variablesStack.peek(), functionName);
      functionsStack.peek().add(functionName);
    } else if (astNode.is(CONST_AND_VAR_NODES)) {
      String variableName = astNode.getTokenValue();
      check(astNode, functionsStack.peek(), variableName);
      variablesStack.peek().add(variableName);
    }

    if (astNode.is(FUNCTION_NODES)) {
      variablesStack.add(new HashSet<String>());
      functionsStack.add(new HashSet<String>());
    }
  }

  private void check(AstNode astNode, Set<String> names, String name) {
    if (names.contains(name)) {
      getContext().createLineViolation(this, "Refactor the code to avoid using \"" + name + "\" for both a variable and a function.", astNode);
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(FUNCTION_NODES)) {
      variablesStack.pop();
      functionsStack.pop();
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    variablesStack = null;
    functionsStack = null;
  }

}
