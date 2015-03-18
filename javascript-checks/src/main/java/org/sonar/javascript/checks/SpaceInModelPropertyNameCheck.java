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

import org.apache.commons.lang.StringUtils;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.checks.utils.BackboneCheckUtils;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.CallExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;
import org.sonar.javascript.model.interfaces.expression.ObjectLiteralTree;
import org.sonar.javascript.model.interfaces.expression.PairPropertyTree;

@Rule(
  key = "S2508",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG, Tags.BACKBONE})
public class SpaceInModelPropertyNameCheck extends BaseTreeVisitor {

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (BackboneCheckUtils.isModelCreation(tree) && !tree.arguments().parameters().isEmpty()) {
      Tree parameter = tree.arguments().parameters().get(0);

      if (parameter.is(Kind.OBJECT_LITERAL)) {
        PairPropertyTree defaultsProp = BackboneCheckUtils.getModelProperty((ObjectLiteralTree) parameter, "defaults");

        if (defaultsProp != null && defaultsProp.value().is(Kind.OBJECT_LITERAL)) {
          checkForSpaceInPropertyNames((ObjectLiteralTree) defaultsProp.value());
        }
      }
    }
    super.visitCallExpression(tree);
  }

  private void checkForSpaceInPropertyNames(ObjectLiteralTree objectLiteral) {
    for (Tree attribute : objectLiteral.properties()) {
      checkSpaceInKey(attribute);
    }
  }

  private void checkSpaceInKey(Tree attribute) {
    if (attribute.is(Kind.PAIR_PROPERTY)) {
      ExpressionTree key = ((PairPropertyTree) attribute).key();

      if (key.is(Kind.STRING_LITERAL) && StringUtils.indexOf(((LiteralTree) key).value(), ' ') >= 0) {
        getContext().addIssue(this, key, "Rename this property to remove the spaces.");
      }
    }
  }

}
