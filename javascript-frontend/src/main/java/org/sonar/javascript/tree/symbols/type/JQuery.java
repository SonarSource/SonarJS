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

import com.google.common.collect.ImmutableList;
import java.util.Arrays;
import java.util.List;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

public class JQuery {

  public static final String JQUERY_OBJECT_ALIASES = "sonar.javascript.jQueryObjectAliases";
  public static final String JQUERY_OBJECT_ALIASES_DEFAULT_VALUE = "$, jQuery";

  private static final List<String> SELECTOR_METHODS = ImmutableList.of(
    // TODO (Lena): Here should be 110 jquery API methods, returning jQuery object
  );

  private List<String> jQueryAliases = null;

  public JQuery(String[] jQueryAliases) {
    this.jQueryAliases = Arrays.asList(jQueryAliases);
  }

  public boolean isJQueryObject(IdentifierTree identifierTree) {
    // if identifier has symbol, it means this symbol was created by user and it's not jQuery object
    return jQueryAliases.contains(identifierTree.name());
  }

  private boolean isDirectJQuerySelectorObject(ExpressionTree expressionTree) {
    if (expressionTree.is(Tree.Kind.CALL_EXPRESSION)) {
      ExpressionTree callee = ((CallExpressionTree) expressionTree).callee();
      return callee.is(Tree.Kind.IDENTIFIER_REFERENCE) && isJQueryObject((IdentifierTree) callee);
    }

    return false;
  }


  protected boolean isSelectorObject(ExpressionTree expressionTree) {
    if (isDirectJQuerySelectorObject(expressionTree)) {
      return true;
    }

    if (expressionTree.is(Tree.Kind.CALL_EXPRESSION) && ((CallExpressionTree) expressionTree).callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {

      DotMemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree) expressionTree).callee();
      return isSelectorObject(callee.object()) && isJQuerySelectorMethod(callee.property());

    }

    return false;
  }

  private static boolean isJQuerySelectorMethod(IdentifierTree property) {
    return SELECTOR_METHODS.contains(property.name());
  }

}
