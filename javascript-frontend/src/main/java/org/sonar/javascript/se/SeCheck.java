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
package org.sonar.javascript.se;

import com.google.common.collect.ImmutableList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

public class SeCheck extends SubscriptionVisitorCheck {

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of();
  }

  public void checkConditions(Map<Tree, Collection<Truthiness>> conditions) {
    // do nothing by default
  }

  public void beforeBlockElement(ProgramState currentState, Tree element) {
    // do nothing by default
  }

  public void afterBlockElement(ProgramState currentState, Tree element) {
    // do nothing by default
  }

  /**
   * Method is called when the execution finished before reaching limit
   */
  public void endOfExecution() {
    // do nothing by default
  }
  public void startOfExecution() {
    // do nothing by default
  }

}
