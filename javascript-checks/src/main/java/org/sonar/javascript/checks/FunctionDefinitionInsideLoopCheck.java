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
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.Stack;

@Rule(
  key = "FunctionDefinitionInsideLoop",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class FunctionDefinitionInsideLoopCheck extends SquidCheck<LexerlessGrammar> {

  private Stack<Integer> stack;

  @Override
  public void init() {
    subscribeTo(
        EcmaScriptGrammar.ITERATION_STATEMENT,
        EcmaScriptGrammar.FUNCTION_EXPRESSION,
        EcmaScriptGrammar.FUNCTION_DECLARATION);
  }

  @Override
  public void visitFile(AstNode astNode) {
    stack = new Stack<Integer>();
    stack.push(0);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.ITERATION_STATEMENT)) {
      stack.push(stack.pop() + 1);
    } else {
      if (stack.peek() > 0) {
        getContext().createLineViolation(this, "Define this function outside of a loop.", astNode);
      }
      stack.add(0);
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.ITERATION_STATEMENT)) {
      stack.push(stack.pop() - 1);
    } else {
      stack.pop();
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    stack = null;
  }

}
