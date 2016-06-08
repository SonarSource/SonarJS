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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3616",
  name = "Do not use the comma operator within a switch case",
  priority = Priority.MAJOR,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleConstantRemediation("5min")
public class NoCommaOperatorInSwitchCaseCheck extends DoubleDispatchVisitorCheck {
  
  @Override
  public void visitCaseClause(CaseClauseTree tree) {
    ExpressionTree expression = tree.expression();
    if (expression.is(Kind.COMMA_OPERATOR)) {
      addIssue(expression, getMessage());
    }
    
    super.visitCaseClause(tree);
  }

  /**
   * Gets the value of property "name" of annotation "@Rule" on this class.
   * <p>
   * TODO move this method to superclass
   */
  private String getMessage() {
    return getClass().getAnnotation(Rule.class).name();
  }
  
}
