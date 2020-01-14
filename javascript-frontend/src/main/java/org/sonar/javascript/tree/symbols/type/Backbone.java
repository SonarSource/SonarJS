/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
package org.sonar.javascript.tree.symbols.type;

import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;

public class Backbone {

  private Backbone() {
  }

  public static boolean isModel(CallExpressionTree tree) {
    return isModelExtendMethod(tree.callee());
  }


  private static boolean isModelExtendMethod(ExpressionTree tree) {
    if (tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree expr = (DotMemberExpressionTree) tree;

      if ("extend".equals(expr.property().name())) {
        if (expr.object().types().contains(Type.Kind.BACKBONE_MODEL)) {
          return true;
        }
        if (expr.object().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
          DotMemberExpressionTree subExpr = (DotMemberExpressionTree) expr.object();
          return Utils.identifierWithName(subExpr.object(), "Backbone") && "Model".equals(subExpr.property().name());
        }
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

        if (pairProperty.key() instanceof IdentifierTree && ((IdentifierTree) pairProperty.key()).name().equals(propertyName)) {
          return pairProperty;
        }
      }
    }
    return null;
  }
}
