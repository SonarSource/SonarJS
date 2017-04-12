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

import org.sonar.check.Rule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "EmptyBlock")
public class EmptyBlockCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Either remove or fill this block of code.";

  @Override
  public void visitBlock(BlockTree tree) {
    Tree parent = tree.parent();

    if (!parent.is(KindSet.FUNCTION_KINDS, Kind.CATCH_BLOCK) && tree.statements().isEmpty() && !hasComment(tree.closeCurlyBraceToken())) {
      addIssue(tree, MESSAGE);
    }
    super.visitBlock(tree);
  }

  private static boolean hasComment(SyntaxToken closingBrace) {
    return !closingBrace.trivias().isEmpty();
  }

}
