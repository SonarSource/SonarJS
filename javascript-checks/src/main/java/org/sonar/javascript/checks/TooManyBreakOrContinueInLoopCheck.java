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

import com.google.common.base.Objects;
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

import java.util.Stack;

@Rule(
  key = "TooManyBreakOrContinueInLoop",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class TooManyBreakOrContinueInLoopCheck extends SquidCheck<LexerlessGrammar> {

  private static class JumpTarget {
    private final String label;
    private int jumps;

    /** Creates unlabeled target. */
    public JumpTarget() {
      this.label = null;
    }

    /** Creates labeled target. */
    public JumpTarget(String label) {
      this.label = label;
    }
  }

  private Stack<JumpTarget> jumpTargets;

  private static final GrammarRuleKey[] FUNCTION_NODES = {
    EcmaScriptGrammar.FUNCTION_EXPRESSION,
    EcmaScriptGrammar.FUNCTION_DECLARATION,
    EcmaScriptGrammar.GENERATOR_DECLARATION,
    EcmaScriptGrammar.GENERATOR_EXPRESSION};

  @Override
  public void init() {
    subscribeTo(
        EcmaScriptGrammar.ITERATION_STATEMENT,
        EcmaScriptGrammar.BREAK_STATEMENT,
        EcmaScriptGrammar.CONTINUE_STATEMENT,
        EcmaScriptGrammar.SWITCH_STATEMENT,
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
      String label = astNode.getFirstChild(Kind.IDENTIFIER).getTokenValue();
      jumpTargets.push(new JumpTarget(label));
    } else if (astNode.is(EcmaScriptGrammar.BREAK_STATEMENT, EcmaScriptGrammar.CONTINUE_STATEMENT)) {
      AstNode labelNode = astNode.getFirstChild(EcmaScriptTokenType.IDENTIFIER);
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
    if (astNode.isNot(EcmaScriptGrammar.BREAK_STATEMENT, EcmaScriptGrammar.CONTINUE_STATEMENT)) {
      JumpTarget jumpTarget = jumpTargets.pop();
      if (astNode.is(EcmaScriptGrammar.ITERATION_STATEMENT) && (jumpTarget.jumps > 1)) {
        getContext().createLineViolation(this, "Reduce the total number of \"break\" and \"continue\" statements in this loop to use one at most.", astNode);
      }
    }
  }

  @Override
  public void leaveFile(AstNode astNode) {
    jumpTargets = null;
  }

}
