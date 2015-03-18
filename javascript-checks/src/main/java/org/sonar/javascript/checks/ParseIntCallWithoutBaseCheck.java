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
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.CallExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

@Rule(
  key = "S2427",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG})
public class ParseIntCallWithoutBaseCheck extends BaseTreeVisitor {

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (isParseIntCall(tree.callee()) && tree.arguments().parameters().size() == 1) {
      getContext().addIssue(this, tree, "Add the base to this \"parseInt\" call.");
    }
    super.visitCallExpression(tree);
  }

  private boolean isParseIntCall(ExpressionTree callee) {
    return callee.is(Kind.IDENTIFIER_REFERENCE) && "parseInt".equals(((IdentifierTree) callee).name());
  }

}
