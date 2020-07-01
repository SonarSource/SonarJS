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

import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;

/**
 * Extend this class to implement SeCheck (check base on Symbolic Execution)
 * if the issues should be raised in case of problem on each path
 */
abstract class AbstractAllPathSeCheck<T extends Tree> extends SeCheck {

  private Map<T, Boolean> problemMap = new HashMap<>();

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    T tree = getTree(element);

    if (tree != null) {
      boolean isProblem = isProblem(tree, currentState);
      if (!isProblem) {
        problemMap.put(tree, false);
      } else if (!problemMap.containsKey(tree)) {
        problemMap.put(tree, true);
      }
    }
  }

  abstract T getTree(Tree element);

  abstract boolean isProblem(T tree, ProgramState currentState);

  @Override
  public void startOfExecution(Scope functionScope) {
    problemMap.clear();
  }

  @Override
  public void endOfExecution(Scope functionScope) {
    for (Entry<T, Boolean> entry : problemMap.entrySet()) {
      if (entry.getValue()) {
        raiseIssue(entry.getKey());
      }
    }
  }

  abstract void raiseIssue(T tree);

}
