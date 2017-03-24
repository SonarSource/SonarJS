/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
 * mailto:info AT sonarsource DOT com
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

import java.util.EnumSet;
import javax.annotation.CheckForNull;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.FinallyBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ThrowStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S1143")
public class JumpStatementInFinallyCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this \"%s\" statement from this \"finally\" block.";

  private static final EnumSet<Kind> SAFE_PARENTS_FOR_RETURN;
  private static final EnumSet<Kind> SAFE_PARENTS_FOR_CONTINUE;
  private static final EnumSet<Kind> SAFE_PARENTS_FOR_BREAK;

  static {
    SAFE_PARENTS_FOR_RETURN = EnumSet.of(
      Kind.SCRIPT,
      Kind.TRY_STATEMENT,
      Kind.CLASS_DECLARATION,
      Kind.CLASS_EXPRESSION);
    SAFE_PARENTS_FOR_RETURN.addAll(KindSet.FUNCTION_KINDS.getSubKinds());

    SAFE_PARENTS_FOR_CONTINUE = EnumSet.copyOf(KindSet.LOOP_KINDS.getSubKinds());
    SAFE_PARENTS_FOR_CONTINUE.addAll(SAFE_PARENTS_FOR_RETURN);

    SAFE_PARENTS_FOR_BREAK = EnumSet.of(
      Kind.SWITCH_STATEMENT);
    SAFE_PARENTS_FOR_BREAK.addAll(SAFE_PARENTS_FOR_CONTINUE);

  }

  @Override
  public void visitReturnStatement(ReturnStatementTree tree) {
    check(tree, tree.returnKeyword(), SAFE_PARENTS_FOR_RETURN);
    super.visitReturnStatement(tree);
  }

  @Override
  public void visitContinueStatement(ContinueStatementTree tree) {
    check(tree, tree.continueKeyword(), SAFE_PARENTS_FOR_CONTINUE);
  }

  @Override
  public void visitBreakStatement(BreakStatementTree tree) {
    EnumSet<Kind> safeParents = tree.label() == null ? SAFE_PARENTS_FOR_BREAK : SAFE_PARENTS_FOR_RETURN;
    check(tree, tree.breakKeyword(), safeParents);
  }

  @Override
  public void visitThrowStatement(ThrowStatementTree tree) {
    check(tree, tree.throwKeyword(), SAFE_PARENTS_FOR_RETURN);
    super.visitThrowStatement(tree);
  }

  private void check(StatementTree jumpStatement, SyntaxToken token, EnumSet<Kind> safeParents) {
    Tree parent = parent(jumpStatement);

    while (!safeParents.contains(((JavaScriptTree) parent).getKind())) {
      SyntaxToken finallyKeyword = getFinallyKeywordForFinallyBlock(parent);
      if (finallyKeyword != null) {
        addIssue(token, String.format(MESSAGE, token.text()))
          .secondary(finallyKeyword);
        return;
      }
      parent = parent(parent);
    }
  }

  private static Tree parent(Tree tree) {
    return ((JavaScriptTree) tree).getParent();
  }

  @CheckForNull
  private static SyntaxToken getFinallyKeywordForFinallyBlock(Tree tree) {
    if (tree.is(Kind.BLOCK)) {
      Tree parent = parent(tree);

      if (parent.is(Kind.FINALLY_BLOCK)) {
        return ((FinallyBlockTree) parent).finallyKeyword();
      }
    }

    return null;
  }

}
