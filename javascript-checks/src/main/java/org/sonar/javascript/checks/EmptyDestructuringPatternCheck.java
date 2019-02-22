/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S3799")
public class EmptyDestructuringPatternCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Change this pattern to not be empty.";

  @Override
  public void visitArrayBindingPattern(ArrayBindingPatternTree tree) {
    if (tree.elements().isEmpty()) {
      addIssue(tree, MESSAGE);
    }

    super.visitArrayBindingPattern(tree);
  }

  @Override
  public void visitObjectBindingPattern(ObjectBindingPatternTree tree) {
    if (tree.elements().isEmpty()) {
      addIssue(tree, MESSAGE);
    }

    super.visitObjectBindingPattern(tree);
  }
}
