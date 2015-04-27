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
package org.sonar.javascript.ast.resolve;

import com.google.common.collect.ImmutableList;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.CallExpressionTree;
import org.sonar.javascript.model.interfaces.expression.DotMemberExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.expression.MemberExpressionTree;

import java.util.List;

public class TypeInferring {
  public static final String DOCUMENT = "document";

  public static final List<String> HTML_ELEMENT_PROPERTIES = ImmutableList.of(
      "body",
      "head",
      "documentElement"
  );
  public static final List<String> HTML_ELEMENT_METHODS = ImmutableList.of(
      "getElementById",
      "getElementByClassName",
      "getElementByName",
      "getElementByTagName",
      "querySelectorAll"
  );

  public static final List<String> HTML_ELEMENT_COLLECTIONS = ImmutableList.of(
      "anchors",
      "embeds",
      "forms",
      "images",
      "links",
      "scripts"
  );

  public static boolean isHTMLElement(Tree tree) {
    if (tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      MemberExpressionTree memberExpressionTree = (MemberExpressionTree) tree;
      ExpressionTree object = memberExpressionTree.object();
      if (object.is(Tree.Kind.IDENTIFIER_REFERENCE) && ((IdentifierTree) object).name().equals(DOCUMENT)) {
        ExpressionTree property = memberExpressionTree.property();

        if (property.is(Tree.Kind.IDENTIFIER_NAME) && HTML_ELEMENT_PROPERTIES.contains(((IdentifierTree) property).name())) {
          return true;
        }
      }
    }

    if (tree.is(Tree.Kind.CALL_EXPRESSION) && ((CallExpressionTree) tree).callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      MemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree) tree).callee();
      ExpressionTree object = callee.object();
      if (object.is(Tree.Kind.IDENTIFIER_REFERENCE) && ((IdentifierTree) object).name().equals(DOCUMENT)) {
        ExpressionTree property = callee.property();
        if (property.is(Tree.Kind.IDENTIFIER_NAME) && HTML_ELEMENT_METHODS.contains(((IdentifierTree) property).name())) {
          return true;
        }
      }
    }

    if (tree.is(Tree.Kind.BRACKET_MEMBER_EXPRESSION) && ((MemberExpressionTree) tree).object().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      MemberExpressionTree callee = (DotMemberExpressionTree) ((MemberExpressionTree) tree).object();
      ExpressionTree object = callee.object();
      if (object.is(Tree.Kind.IDENTIFIER_REFERENCE) && ((IdentifierTree) object).name().equals(DOCUMENT)) {
        ExpressionTree property = callee.property();
        if (property.is(Tree.Kind.IDENTIFIER_NAME) && HTML_ELEMENT_COLLECTIONS.contains(((IdentifierTree) property).name())) {
          return true;
        }
      }
    }


    return false;
  }
}