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

import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;

import java.util.Arrays;
import java.util.List;

public abstract class AbstractJQueryCheck extends BaseTreeVisitor {

  private List<String> jQueryAliases = null;

  // todo(Lena): PROPERTY_PREFIX ("sonar.javascript") is duplicated from JavaScriptPlugin
  public static final String JQUERY_OBJECT_ALIASES = "sonar.javascript.jQueryObjectAliases";
  public static final String JQUERY_OBJECT_ALIASES_DEFAULT_VALUE = "$, jQuery";

  protected boolean isJQueryObject(String name){
    if (jQueryAliases == null){
      jQueryAliases = Arrays.asList(getContext().getPropertyValues(JQUERY_OBJECT_ALIASES));
    }
    return jQueryAliases.contains(name);
  }

  /**
   *
   * @param expressionTree expression to check for jQuery selector
   * @return true if expressionTree is one level jQuery selector, like $("#id"); false for other cases (including $("#id").next())
   */
  protected boolean isSelector(ExpressionTree expressionTree) {
    if (expressionTree.is(Tree.Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpressionTree = (CallExpressionTree)expressionTree;
      ExpressionTree callee = callExpressionTree.callee();
      if (callee.is(Tree.Kind.IDENTIFIER_REFERENCE)) {
        String calleeName = ((IdentifierTree) callee).identifierToken().text();
        return isJQueryObject(calleeName);
      }
      return false;
    }
    return false;
  }

  /**
   *
   * @param expressionTree expression to check for jQuery selector
   * @return true if expressionTree is jQuery selector, like $("#id") or $("#id").next(); false for other cases.
   */
  // todo(Lena) This method doesn't check that method in a chain returns selector. For example, it will return true for $("#id").val(), which is not selector .
  protected boolean isMultiLevelSelector(ExpressionTree expressionTree) {
    if (isSelector(expressionTree)){
      return true;
    } else if (expressionTree.is(Tree.Kind.CALL_EXPRESSION)){
      ExpressionTree callee = ((CallExpressionTree)expressionTree).callee();
      return callee.is(Tree.Kind.DOT_MEMBER_EXPRESSION) && isMultiLevelSelector(((MemberExpressionTree) callee).object());
    }
    return false;
  }

}
