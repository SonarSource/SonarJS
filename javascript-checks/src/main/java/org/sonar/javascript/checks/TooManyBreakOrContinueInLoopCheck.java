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

import java.util.Stack;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.LabelledStatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.google.common.base.Objects;
import com.sonar.sslr.api.AstNode;

@Rule(
  key = "TooManyBreakOrContinueInLoop",
  name = "Loops should not contain more than a single \"break\" or \"continue\" statement",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNIT_TESTABILITY)
@SqaleConstantRemediation("30min")
public class TooManyBreakOrContinueInLoopCheck extends SquidCheck<LexerlessGrammar> {

  private static class JumpTarget {
    private final String label;
    private int jumps;

    /**
     * Creates unlabeled target.
     */
    public JumpTarget() {
      this.label = null;
    }

    /**
     * Creates labeled target.
     */
    public JumpTarget(String label) {
      this.label = label;
    }
  }

  private Stack<JumpTarget> jumpTargets;

  private static final GrammarRuleKey[] FUNCTION_NODES = {
    Kind.FUNCTION_EXPRESSION,
    Kind.FUNCTION_DECLARATION,
    Kind.GENERATOR_DECLARATION,
    Kind.GENERATOR_FUNCTION_EXPRESSION};

  @Override
  public void init() {
    subscribeTo(CheckUtils.iterationStatementsArray());
    subscribeTo(
      Kind.BREAK_STATEMENT,
      Kind.CONTINUE_STATEMENT,
      Kind.SWITCH_STATEMENT,
      Kind.LABELLED_STATEMENT);
    subscribeTo(FUNCTION_NODES);
  }

  @Override
  public void visitFile(AstNode astNode) {
    jumpTargets = new Stack<JumpTarget>();
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(Kind.LABELLED_STATEMENT)) {
      String label = ((LabelledStatementTree) astNode).label().name();
      jumpTargets.push(new JumpTarget(label));
    } else if (astNode.is(Kind.BREAK_STATEMENT, Kind.CONTINUE_STATEMENT)) {
      AstNode labelNode = astNode.getFirstChild(Kind.LABEL_IDENTIFIER);
      String label = labelNode == null ? null : labelNode.getTokenValue();
      for (int i = jumpTargets.size() - 1; i >= 0; i--) {
        JumpTarget jumpTarget = jumpTargets.get(i);
        jumpTarget.jumps++;
        if (Objects.equal(label, jumpTarget.label)) {
          break;
        }
      }
    } else {
      jumpTargets.push(new JumpTarget());
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (astNode.isNot(Kind.BREAK_STATEMENT, Kind.CONTINUE_STATEMENT)) {
      JumpTarget jumpTarget = jumpTargets.pop();
      if (CheckUtils.isIterationStatement(astNode) && jumpTarget.jumps > 1) {
        getContext().createLineViolation(this, "Reduce the total number of \"break\" and \"continue\" statements in this loop to use one at most.", astNode);
      }
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    jumpTargets = null;
  }

}
