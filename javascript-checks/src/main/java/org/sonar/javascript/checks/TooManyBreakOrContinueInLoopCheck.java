/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.checks;

import com.google.common.base.Objects;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.LabelledStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleLinearRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "TooManyBreakOrContinueInLoop",
  name = "Loops should not contain more than a single \"break\" or \"continue\" statement",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleLinearRemediation(
  coeff = "20min",
  effortToFixDescription = "per extra \"break\" or \"continue\" statement"
)
public class TooManyBreakOrContinueInLoopCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Reduce the total number of \"break\" and \"continue\" statements in this loop to use one at most.";

  private static class JumpTarget {
    private final String label;
    private List<Tree> jumps = new ArrayList<>();

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

  private Deque<JumpTarget> jumpTargets = new ArrayDeque<>();

  @Override
  public void visitScript(ScriptTree tree) {
    jumpTargets.clear();
    super.visitScript(tree);
  }

  @Override
  public void visitBreakStatement(BreakStatementTree tree) {
    increaseNumberOfJumpInScopes(tree.breakKeyword(), tree.label());
    super.visitBreakStatement(tree);
  }

  @Override
  public void visitContinueStatement(ContinueStatementTree tree) {
    increaseNumberOfJumpInScopes(tree.continueKeyword(), tree.label());
    super.visitContinueStatement(tree);
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    enterScope();
    super.visitFunctionExpression(tree);
    leaveScope();
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    enterScope();
    super.visitFunctionDeclaration(tree);
    leaveScope();
  }

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    enterScope();
    super.visitSwitchStatement(tree);
    leaveScope();
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    enterScope();
    super.visitForStatement(tree);
    leaveScopeAndCheckNumberOfJump(tree.forKeyword());
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    enterScope();
    super.visitForObjectStatement(tree);
    leaveScopeAndCheckNumberOfJump(tree.forKeyword());
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    enterScope();
    super.visitWhileStatement(tree);
    leaveScopeAndCheckNumberOfJump(tree.whileKeyword());
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    enterScope();
    super.visitDoWhileStatement(tree);
    leaveScopeAndCheckNumberOfJump(tree.doKeyword());
  }

  @Override
  public void visitLabelledStatement(LabelledStatementTree tree) {
    jumpTargets.push(new JumpTarget(tree.label().name()));
    super.visitLabelledStatement(tree);
    leaveScope();
  }

  private void enterScope() {
    jumpTargets.push(new JumpTarget());
  }

  private void leaveScope() {
    jumpTargets.pop();
  }

  private void increaseNumberOfJumpInScopes(SyntaxToken jump, IdentifierTree label) {
    for (JumpTarget jumpTarget : jumpTargets) {
      String labelName = label == null ? null : label.name();
      jumpTarget.jumps.add(jump);

      if (Objects.equal(labelName, jumpTarget.label)) {
        break;
      }
    }
  }

  private void leaveScopeAndCheckNumberOfJump(SyntaxToken loopKeyword) {
    List<Tree> jumps = jumpTargets.pop().jumps;
    int jumpStatementNumber = jumps.size();
    if (jumpStatementNumber > 1) {
      PreciseIssue issue = addIssue(loopKeyword, MESSAGE).cost((double) jumpStatementNumber - 1);
      for (Tree jump : jumps) {
        issue.secondary(new IssueLocation(jump));
      }
    }
  }

}
