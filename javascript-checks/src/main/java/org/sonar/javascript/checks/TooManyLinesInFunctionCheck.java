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

import java.util.Iterator;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S138",
  name = "Functions should not have too many lines",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("20min")
public class TooManyLinesInFunctionCheck extends AbstractFunctionSizeCheck {

  private static final String MESSAGE = "This function has %s lines, which is greater than the %s lines authorized. Split it into smaller functions.";

  private static final int DEFAULT = 100;

  @RuleProperty(
    key = "max",
    description = "Maximum authorized lines in a function",
    defaultValue = "" + DEFAULT)
  public int max = DEFAULT;

  public static int getNumberOfLine(Tree tree) {
    Iterator<Tree> childrenIterator = ((JavaScriptTree) tree).childrenIterator();
    while (childrenIterator.hasNext()) {
      Tree child = childrenIterator.next();
      if (child != null && child.is(Kind.BLOCK)) {
        int firstLine = ((BlockTree) child).openCurlyBrace().line();
        int lastLine = ((BlockTree) child).closeCurlyBrace().line();

        return lastLine - firstLine + 1;
      }
    }
    throw new IllegalStateException("No block child found for current tree.");

  }

  @Override
  void checkFunction(Tree functionTree) {
    int nbLines = getNumberOfLine(functionTree);
    if (nbLines > max) {
      String message = String.format(MESSAGE, nbLines, max);
      addLineIssue(functionTree, message);
    }
  }
}
