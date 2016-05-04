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

import java.util.Collection;
import java.util.Map;
import java.util.Map.Entry;
import org.sonar.api.server.rule.RulesDefinition.SubCharacteristics;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.Truthiness;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S2583",
  name = "Conditions should not unconditionally evaluate to \"true\" or to \"false\"",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG, Tags.CERT, Tags.CWE, Tags.MISRA})
@SqaleSubCharacteristic(SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("15min")
@ActivatedByDefault
public class AlwaysTrueOrFalseConditionCheck extends SeCheck {

  @Override
  public void checkConditions(Map<Tree, Collection<Truthiness>> conditions) {
    for (Entry<Tree, Collection<Truthiness>> entry : conditions.entrySet()) {
      Collection<Truthiness> results = entry.getValue();
      if (results.size() == 1 && !Truthiness.UNKNOWN.equals(results.iterator().next())) {
        String result = Truthiness.TRUTHY.equals(results.iterator().next()) ? "true" : "false";
        addIssue(entry.getKey(), String.format("Change this condition so that it does not always evaluate to \"%s\".", result));
      }
    }
  }

}
