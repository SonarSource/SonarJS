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
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.javascript.checks.utils.BackboneCheckUtils;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S2508",
  name = "The names of model properties should not contains spaces",
  priority = Priority.CRITICAL,
  tags = {Tags.BACKBONE, Tags.BUG})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.DATA_RELIABILITY)
@SqaleConstantRemediation("5min")
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
