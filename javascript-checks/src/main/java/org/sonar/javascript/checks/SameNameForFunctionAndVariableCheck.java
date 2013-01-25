/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptGrammar;

import java.util.HashSet;
import java.util.Set;
import java.util.Stack;

@Rule(
  key = "SameNameForFunctionAndVariable",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class SameNameForFunctionAndVariableCheck extends SquidCheck<EcmaScriptGrammar> {

  private Stack<Set<String>> variablesStack;
  private Stack<Set<String>> functionsStack;

  @Override
  public void init() {
    EcmaScriptGrammar g = getContext().getGrammar();
    subscribeTo(g.variableDeclaration, g.variableDeclarationNoIn, g.functionDeclaration, g.functionExpression);
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
    if (astNode.is(getContext().getGrammar().functionDeclaration)) {
      String functionName = astNode.getFirstChild(getContext().getGrammar().identifier).getTokenValue();
      check(astNode, variablesStack.peek(), functionName);
      functionsStack.peek().add(functionName);
    } else if (astNode.is(getContext().getGrammar().variableDeclaration, getContext().getGrammar().variableDeclarationNoIn)) {
      String variableName = astNode.getTokenValue();
      check(astNode, functionsStack.peek(), variableName);
      variablesStack.peek().add(variableName);
    }

    if (astNode.is(getContext().getGrammar().functionDeclaration, getContext().getGrammar().functionExpression)) {
      variablesStack.add(new HashSet<String>());
      functionsStack.add(new HashSet<String>());
    }
  }

  private void check(AstNode astNode, Set<String> names, String name) {
    if (names.contains(name)) {
      getContext().createLineViolation(this, "Refactor the code to avoid using '" + name + "' for both a variable and a function.", astNode);
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(getContext().getGrammar().functionDeclaration, getContext().getGrammar().functionExpression)) {
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
