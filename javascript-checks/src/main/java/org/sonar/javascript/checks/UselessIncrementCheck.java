/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.ast.visitors.SyntacticEquivalence;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.AssignmentExpressionTree;
import org.sonar.javascript.model.interfaces.expression.UnaryExpressionTree;

@Rule(
  key = "S2123",
  tags = {"bug"},
  priority = Priority.CRITICAL)
public class UselessIncrementCheck extends BaseTreeVisitor {

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree assignment) {
    if (assignment.expression().is(Tree.Kind.POSTFIX_INCREMENT, Tree.Kind.POSTFIX_DECREMENT)) {
      UnaryExpressionTree postfix = (UnaryExpressionTree) assignment.expression();
      if (SyntacticEquivalence.areEquivalent(assignment.variable(), postfix.expression())) {
        String type = postfix.is(Tree.Kind.POSTFIX_INCREMENT) ? "increment" : "decrement";
        String message = String.format("Remove this %s or correct the code not to waste it.", type);
        getContext().addIssue(this, postfix, message);
      }
    }
    super.visitAssignmentExpression(assignment);
  }

}
