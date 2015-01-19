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
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import javax.annotation.Nullable;
import java.util.List;

@Rule(
  key = "AssignmentWithinCondition",
  priority = Priority.MAJOR)
// FIXME: SONARJS-309 Fix and re-introduce the rule
//@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class AssignmentWithinConditionCheck extends SquidCheck<LexerlessGrammar> {

  private List<AstNodeType> stack;

  private static final AstNodeType[] SCOPES = {
    EcmaScriptGrammar.CONDITION,
    EcmaScriptGrammar.FUNCTION_BODY,
    Kind.ARROW_FUNCTION,
    Kind.LESS_THAN,
    Kind.GREATER_THAN,
    Kind.LESS_THAN_OR_EQUAL_TO,
    Kind.GREATER_THAN_OR_EQUAL_TO,
    Kind.INSTANCE_OF,
    Kind.RELATIONAL_IN,
    Kind.EQUAL_TO,
    Kind.NOT_EQUAL_TO,
    Kind.STRICT_EQUAL_TO,
    Kind.STRICT_NOT_EQUAL_TO,
  };

  @Override
  public void init() {
    subscribeTo(
      EcmaScriptGrammar.EXPRESSION,
      EcmaScriptGrammar.EXPRESSION_NO_IN);
    subscribeTo(CheckUtils.assignmentExpressionArray());
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
    } else if (CheckUtils.isAssignmentExpression(astNode) && inExpression() && !exclusion()) {
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
    return EcmaScriptGrammar.EXPRESSION.equals(t) || EcmaScriptGrammar.EXPRESSION_NO_IN.equals(t) || EcmaScriptGrammar.CONDITION.equals(t);
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
    return CheckUtils.isEqualityExpression(node) || CheckUtils.isRelationalExpression(node);
  }

  private boolean isTargetedExpression(AstNode astNode) {
    return astNode.is(EcmaScriptGrammar.EXPRESSION, EcmaScriptGrammar.EXPRESSION_NO_IN)
      && astNode.getParent().isNot(Kind.EXPRESSION_STATEMENT, EcmaScriptGrammar.CONDITION, Kind.FOR_STATEMENT);
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
