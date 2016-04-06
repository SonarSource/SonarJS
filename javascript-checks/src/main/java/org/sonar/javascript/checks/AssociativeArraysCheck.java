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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.expression.BracketMemberExpressionTreeImpl;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S3579",
  priority = Priority.MAJOR,
  name = "Array indexes should be numeric",
  tags = {Tags.SUSPICIOUS})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("10min")
public class AssociativeArraysCheck extends DoubleDispatchVisitorCheck {
  private static final String MESSAGE = "Make \"%s\" an object if it must have named properties; otherwise, use a numeric index here.";

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    if (tree.variable().is(Tree.Kind.BRACKET_MEMBER_EXPRESSION)) {
      BracketMemberExpressionTree arrayObject = (BracketMemberExpressionTree) tree.variable();
      if (arrayObject.object().types().containsOnly(Kind.ARRAY)) {
        ExpressionTree arrayIndex = ((BracketMemberExpressionTreeImpl) tree.variable()).property();
        if (arrayIndex.is(Tree.Kind.STRING_LITERAL)) {
          addIssue(arrayIndex, String.format(MESSAGE, CheckUtils.asString(arrayObject.object())));
        } else if (arrayIndex instanceof IdentifierTree) {
          if (arrayIndex.types().size() > 0 && !arrayIndex.types().contains(Kind.NUMBER)) {
            addIssue(arrayIndex, String.format(MESSAGE, CheckUtils.asString(arrayObject.object())));
          }
        }
      }
    }
    super.visitAssignmentExpression(tree);
  }
}
