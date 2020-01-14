/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@JavaScriptRule
@Rule(key = "S2583")
public class ConditionalUnreachableCodeCheck extends AbstractAlwaysTrueOrFalseConditionCheck {

  private static final String MESSAGE = "Change this condition so that it does not always evaluate to \"%s\"; some subsequent code is never executed.";

  @Override
  protected void conditionWithDeadCode(Tree condition, boolean isTruthy, Set<Tree> deadCode) {
    String result = isTruthy ? "true" : "false";
    PreciseIssue preciseIssue = addIssue(condition, String.format(MESSAGE, result));
    deadCode.forEach(deadCodeTree -> preciseIssue.secondary(deadCodeTree, "Never reached"));
  }

}
