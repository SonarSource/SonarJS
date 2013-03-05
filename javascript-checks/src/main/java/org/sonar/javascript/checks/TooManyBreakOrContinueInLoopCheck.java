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
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.Stack;

@Rule(
  key = "TooManyBreakOrContinueInLoop",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class TooManyBreakOrContinueInLoopCheck extends SquidCheck<LexerlessGrammar> {

  private Stack<Stack<Integer>> scope;
  private Stack<Integer> stack;

  @Override
  public void init() {
    subscribeTo(
        EcmaScriptGrammar.FUNCTION_EXPRESSION,
        EcmaScriptGrammar.FUNCTION_DECLARATION,
        EcmaScriptGrammar.ITERATION_STATEMENT,
        EcmaScriptGrammar.BREAK_STATEMENT,
        EcmaScriptGrammar.CONTINUE_STATEMENT,
        EcmaScriptGrammar.SWITCH_STATEMENT);
  }

  @Override
  public void visitFile(AstNode astNode) {
    stack = new Stack<Integer>();
    scope = new Stack<Stack<Integer>>();
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.FUNCTION_EXPRESSION, EcmaScriptGrammar.FUNCTION_DECLARATION)) {
      // enter new scope
      scope.push(stack);
      stack = new Stack<Integer>();
    } else if (astNode.is(EcmaScriptGrammar.ITERATION_STATEMENT) || astNode.is(EcmaScriptGrammar.SWITCH_STATEMENT)) {
      stack.push(0);
    } else if (astNode.is(EcmaScriptGrammar.BREAK_STATEMENT) || astNode.is(EcmaScriptGrammar.CONTINUE_STATEMENT)) {
      stack.push(stack.pop() + 1);
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.ITERATION_STATEMENT)) {
      int count = stack.pop();
      if (stack.isEmpty()) {
        if (count > 1) {
          getContext().createLineViolation(this, "Refactor this loop to prevent having more than one 'break' or 'continue' statement.", astNode);
        }
      } else {
        stack.push(stack.pop() + count);
      }
    } else if (astNode.is(EcmaScriptGrammar.SWITCH_STATEMENT)) {
      stack.pop();
    } else if (astNode.is(EcmaScriptGrammar.FUNCTION_EXPRESSION, EcmaScriptGrammar.FUNCTION_DECLARATION)) {
      // leave scope
      stack = scope.pop();
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    stack = null;
    scope = null;
  }

}
