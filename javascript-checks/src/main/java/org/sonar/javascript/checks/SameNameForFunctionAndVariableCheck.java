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

import java.util.HashSet;
import java.util.Set;
import java.util.Stack;

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.FunctionDeclarationTree;
import org.sonar.javascript.model.interfaces.expression.FunctionExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.Tags;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "SameNameForFunctionAndVariable",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD, Tags.PITFALL})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class SameNameForFunctionAndVariableCheck extends SquidCheck<LexerlessGrammar> {

  private Stack<Set<String>> variablesStack;
  private Stack<Set<String>> functionsStack;

  private static final GrammarRuleKey[] FUNCTION_NODES = {
    Kind.FUNCTION_DECLARATION,
    Kind.FUNCTION_EXPRESSION,
    Kind.GENERATOR_DECLARATION,
    Kind.GENERATOR_FUNCTION_EXPRESSION};

  private static final GrammarRuleKey[] CONST_AND_VAR_NODES = {
    Kind.VAR_DECLARATION,
    Kind.LET_DECLARATION,
    Kind.CONST_DECLARATION};

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
      checkFunctionName(astNode, ((FunctionDeclarationTree) astNode).name());

    } else if (astNode.is(Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION)) {
      checkFunctionName(astNode, ((FunctionExpressionTree) astNode).name());

    } else if (astNode.is(CONST_AND_VAR_NODES)) {
      for (IdentifierTree identifier : ((VariableDeclarationTreeImpl) astNode).variableIdentifiers()) {
        String variableName = identifier.name();
        check((AstNode) identifier, functionsStack.peek(), variableName);
        variablesStack.peek().add(variableName);
      }
    }

    if (astNode.is(FUNCTION_NODES)) {
      variablesStack.add(new HashSet<String>());
      functionsStack.add(new HashSet<String>());
    }
  }

  private void checkFunctionName(AstNode functionNode, IdentifierTree nameIdentifier) {
    if (nameIdentifier != null) {
      String functionName = nameIdentifier.name();

      check(functionNode, variablesStack.peek(), functionName);
      functionsStack.peek().add(functionName);
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
