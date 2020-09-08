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
package org.sonar.javascript.checks;

import org.apache.commons.lang.StringUtils;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.symbols.type.Backbone;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S2508")
public class SpaceInModelPropertyNameCheck extends DoubleDispatchVisitorCheck {

  private static final String SET = "set";
  private static final String MESSAGE = "Rename this property to remove the spaces.";

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (tree.types().contains(Type.Kind.BACKBONE_MODEL) && !tree.argumentClause().arguments().isEmpty()) {
      visitDefaults(tree);
    }

    if (tree.callee().is(Kind.DOT_MEMBER_EXPRESSION) && isBackboneSetMethod((DotMemberExpressionTree) tree.callee())) {
      visitSetMethodCall(tree);
    }

    super.visitCallExpression(tree);
  }

  private void visitSetMethodCall(CallExpressionTree tree) {
    Tree firstArgument = tree.argumentClause().arguments().get(0);

    if (firstArgument.is(Kind.OBJECT_LITERAL)) {
      checkForSpaceInPropertyNames((ObjectLiteralTree) firstArgument);
    }

    if (firstArgument.is(Kind.STRING_LITERAL)) {
      checkString(firstArgument);
    }

  }

  private void visitDefaults(CallExpressionTree tree) {
    Tree parameter = tree.argumentClause().arguments().get(0);

    if (parameter.is(Kind.OBJECT_LITERAL)) {
      PairPropertyTree defaultsProp = Backbone.getModelProperty((ObjectLiteralTree) parameter, "defaults");

      if (defaultsProp != null && defaultsProp.value().is(Kind.OBJECT_LITERAL)) {
        checkForSpaceInPropertyNames((ObjectLiteralTree) defaultsProp.value());
      }
    }
  }

  private static boolean isBackboneSetMethod(DotMemberExpressionTree dotExpr) {
    return CheckUtils.asString(dotExpr.property()).equals(SET) && dotExpr.object().types().contains(Type.Kind.BACKBONE_MODEL_OBJECT);
  }

  private void checkForSpaceInPropertyNames(ObjectLiteralTree objectLiteral) {
    for (Tree attribute : objectLiteral.properties()) {
      if (attribute.is(Kind.PAIR_PROPERTY)) {
        Tree key = ((PairPropertyTree) attribute).key();
        checkString(key);
      }
    }
  }

  private void checkString(Tree key) {
    if (key.is(Kind.STRING_LITERAL) && StringUtils.contains(((LiteralTree) key).value(), ' ')) {
      addIssue(key, MESSAGE);
    }
  }

}
