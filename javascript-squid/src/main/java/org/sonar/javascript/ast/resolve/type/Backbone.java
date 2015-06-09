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
package org.sonar.javascript.ast.resolve.type;

import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;

import javax.annotation.Nullable;

public class Backbone {

  private Backbone() {
  }

  public static boolean isModel(ExpressionTree tree) {
    return tree.is(Tree.Kind.CALL_EXPRESSION) && isModelExtendMethod(((CallExpressionTree) tree).callee());
  }


  private static boolean isModelExtendMethod(ExpressionTree tree) {
    if (tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      MemberExpressionTree expr = (MemberExpressionTree) tree;

      if (isExpressionIdentifierNamed(expr.property(), "extend") && expr.object().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
        MemberExpressionTree subExpr = (MemberExpressionTree) expr.object();
        return isExpressionIdentifierNamed(subExpr.object(), "Backbone") && isExpressionIdentifierNamed(subExpr.property(), "Model");
      }

    }
    return false;
  }

  /**
   * @return the pair property with the given name within the given object literal, null if not found
   */
  @Nullable
  public static PairPropertyTree getModelProperty(ObjectLiteralTree objectLiteral, String propertyName) {
    for (Tree property : objectLiteral.properties()) {

      if (property.is(Tree.Kind.PAIR_PROPERTY)) {
        PairPropertyTree pairProperty = (PairPropertyTree) property;

        if (isExpressionIdentifierNamed(pairProperty.key(), propertyName)) {
          return pairProperty;
        }
      }
    }
    return null;
  }


  private static boolean isExpressionIdentifierNamed(ExpressionTree tree, String value) {
    return tree instanceof IdentifierTree && ((IdentifierTree) tree).name().equals(value);
  }
}
