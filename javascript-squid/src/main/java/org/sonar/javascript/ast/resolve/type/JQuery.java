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

import com.google.common.collect.ImmutableList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import java.util.Arrays;
import java.util.List;

public class JQuery {

  public static final String JQUERY_OBJECT_ALIASES = "sonar.javascript.jQueryObjectAliases";
  public static final String JQUERY_OBJECT_ALIASES_DEFAULT_VALUE = "$, jQuery";

  private static final List<String> SELECTOR_METHODS = ImmutableList.of(
      "first"
      // add 110 other methods
  );

  private List<String> jQueryAliases = null;

  public JQuery(String[] jQueryAliases){
    this.jQueryAliases = Arrays.asList(jQueryAliases);
  }

  private boolean isJQueryObject(String name){
    return jQueryAliases.contains(name);
  }

  private boolean isDirectJQuerySelectorObject(ExpressionTree expressionTree) {
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


  protected boolean isJQuerySelectorObject(ExpressionTree expressionTree) {
    if (isDirectJQuerySelectorObject(expressionTree)){
      return true;
    }

    if (expressionTree.is(Tree.Kind.CALL_EXPRESSION) && ((CallExpressionTree)expressionTree).callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)){
      DotMemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree)expressionTree).callee();

      return isJQuerySelectorObject(callee.object()) && isJQuerySelectorMethod(callee.property());
    }
    return false;
  }

  private boolean isJQuerySelectorMethod(ExpressionTree property) {
    return property instanceof IdentifierTree && SELECTOR_METHODS.contains(((IdentifierTree) property).name());
  }


}
