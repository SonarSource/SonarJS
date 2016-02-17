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

import com.google.common.collect.Lists;
import java.util.ArrayList;
import java.util.List;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S3499",
  name = "Shorthand object properties should be grouped at the beginning or end of an object declaration",
  priority = Priority.MINOR,
  tags = {Tags.CONVENTION, Tags.ES2015})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("1min")
public class ShorthandPropertiesNotGroupedCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE_PATTERN = "Group all shorthand properties at the %s of this object declaration";
  private static final String MESSAGE = "Group all shorthand properties at either the beginning or end of this object declaration.";

  private static final String SECONDARY_MESSAGE_PATTERN = "Move to the %s.";
  private static final String SECONDARY_MESSAGE = "Group at beginning or end.";

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    // list keeps true for shorthand property
    List<Boolean> isShorthandPropertyList = new ArrayList<>();
    int shorthandPropertiesNumber = 0;

    for (Tree propertyTree : tree.properties()) {
      boolean isShorthandProperty = isShorthand(propertyTree);
      isShorthandPropertyList.add(isShorthandProperty);
      shorthandPropertiesNumber += isShorthandProperty ? 1 : 0;
    }

    if (shorthandPropertiesNumber > 0) {
      int numberOfShorthandAtBeginning = getNumberOfTrueAtBeginning(isShorthandPropertyList);
      int numberOfShorthandAtEnd = getNumberOfTrueAtBeginning(Lists.reverse(isShorthandPropertyList));

      boolean allAtBeginning = numberOfShorthandAtBeginning == shorthandPropertiesNumber;
      boolean allAtEnd = numberOfShorthandAtEnd == shorthandPropertiesNumber;

      int propertiesNumber = tree.properties().size();

      if (!allAtBeginning && numberOfShorthandAtBeginning > numberOfShorthandAtEnd) {
        raiseIssuePattern(tree, numberOfShorthandAtBeginning, propertiesNumber, "beginning");

      } else if (!allAtEnd && numberOfShorthandAtEnd > numberOfShorthandAtBeginning) {
        raiseIssuePattern(tree, 0, propertiesNumber - numberOfShorthandAtEnd, "end");

      } else if (!allAtBeginning && !allAtEnd) {
        raiseIssue(tree, 0, propertiesNumber, MESSAGE, SECONDARY_MESSAGE);
      }

    }

    super.visitObjectLiteral(tree);
  }

  private void raiseIssuePattern(ObjectLiteralTree tree, int begin, int end, String place) {
    raiseIssue(tree, begin, end, String.format(MESSAGE_PATTERN, place), String.format(SECONDARY_MESSAGE_PATTERN, place));
  }

  private void raiseIssue(ObjectLiteralTree tree, int begin, int end, String primaryMessage, String secondaryMessage) {
    PreciseIssue preciseIssue = newIssue(tree.openCurlyBrace(), primaryMessage);
    for (int i = begin; i < end; i++) {
      if (isShorthand(tree.properties().get(i))) {
        preciseIssue.secondary(tree.properties().get(i), secondaryMessage);
      }
    }
  }

  private static boolean isShorthand(Tree propertyTree) {
    return propertyTree.is(Kind.IDENTIFIER_REFERENCE);
  }

  private static int getNumberOfTrueAtBeginning(List<Boolean> list) {
    int numberOfTrueAtBeginning = 0;
    for (Boolean element : list) {
      if (element) {
        numberOfTrueAtBeginning++;
      } else {
        break;
      }
    }
    return numberOfTrueAtBeginning;
  }
}
