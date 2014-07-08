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

import com.google.common.collect.Lists;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

import javax.annotation.Nullable;
import java.util.List;

@Rule(
  key = "AssignmentWithinCondition",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class AssignmentWithinConditionCheck extends SquidCheck<LexerlessGrammar> {

  private List<AstNodeType> stack;

  private static final AstNodeType[] SCOPES = {
    EcmaScriptGrammar.CONDITION,
    EcmaScriptGrammar.FUNCTION_BODY,
    EcmaScriptGrammar.RELATIONAL_EXPRESSION,
    EcmaScriptGrammar.RELATIONAL_EXPRESSION_NO_IN,
    EcmaScriptGrammar.EQUALITY_EXPRESSION,
    EcmaScriptGrammar.EQUALITY_EXPRESSION_NO_IN
  };

  @Override
  public void init() {
    subscribeTo(
      EcmaScriptGrammar.ASSIGNMENT_EXPRESSION,
      EcmaScriptGrammar.EXPRESSION,
      EcmaScriptGrammar.EXPRESSION_NO_IN);
    subscribeTo(SCOPES);
  }

  @Override
  public void visitFile(@Nullable AstNode astNode) {
    stack = Lists.newArrayList();
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (isTargetedExpression(astNode) || astNode.is(SCOPES)) {
      stack.add(astNode.getType());
    } else if (astNode.is(EcmaScriptGrammar.ASSIGNMENT_EXPRESSION) && inExpression() && !exclusion()) {
      getContext().createLineViolation(this, "Extract the assignment out of this expression.", astNode);
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (isTargetedExpression(astNode) || astNode.is(SCOPES)) {
      pop();
    }
  }

  private boolean inExpression() {
    AstNodeType t = peek(0);
    return t == EcmaScriptGrammar.EXPRESSION || t == EcmaScriptGrammar.EXPRESSION_NO_IN || t == EcmaScriptGrammar.CONDITION;
  }

  /**
   * <pre>
   *   while ((line = nextLine()) != null)
   * </pre>
   */
  private boolean exclusion() {
    AstNodeType t = peek(1);
    return (peek(2) == EcmaScriptGrammar.CONDITION) && isExcludedExpression(t);
  }

  private boolean isExcludedExpression(AstNodeType node) {
    return node == EcmaScriptGrammar.EQUALITY_EXPRESSION || node == EcmaScriptGrammar.EQUALITY_EXPRESSION_NO_IN
      || node == EcmaScriptGrammar.RELATIONAL_EXPRESSION || node == EcmaScriptGrammar.RELATIONAL_EXPRESSION_NO_IN;
  }

  private boolean isTargetedExpression(AstNode astNode) {
    return astNode.is(EcmaScriptGrammar.EXPRESSION, EcmaScriptGrammar.EXPRESSION_NO_IN)
      && astNode.getParent().isNot(EcmaScriptGrammar.EXPRESSION_STATEMENT, EcmaScriptGrammar.CONDITION, EcmaScriptGrammar.FOR_STATEMENT);
  }

  private void pop() {
    stack.remove(stack.size() - 1);
  }

  @Nullable
  private AstNodeType peek(int i) {
    if (i < stack.size()) {
      return stack.get(stack.size() - 1 - i);
    } else {
      return null;
    }
  }

}
