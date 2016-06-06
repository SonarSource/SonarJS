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

import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S1264",
  name = "A \"while\" loop should be used instead of a \"for\" loop",
  priority = Priority.MINOR,
  tags = {Tags.CLUMSY})
@ActivatedByDefault
@SqaleConstantRemediation("5min")
public class ForHidingWhileCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Replace this \"for\" loop with a \"while\" loop";

  @Override
  public void visitForStatement(ForStatementTree tree) {
    if (tree.init() == null && tree.update() == null) {
      addIssue(tree.forKeyword(), MESSAGE);
    }

    super.visitForStatement(tree);
  }
}
