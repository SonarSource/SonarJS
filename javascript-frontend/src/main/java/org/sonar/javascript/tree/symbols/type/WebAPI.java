/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import java.util.List;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

public class WebAPI {

  private static final String DOCUMENT = "document";

  private static final List<String> DOCUMENT_METHODS_TO_GET_ELEMENT = ImmutableList.of(
    "getElementById",
    "elementFromPoint",
    "createElement",
    "createElementNS"
  );

  private static final List<String> DOCUMENT_METHODS_TO_GET_ELEMENTS = ImmutableList.of(
    "getElementsByClassName",
    "getElementsByName",
    "getElementsByTagName",
    "getElementsByTagNameNS"
  );

  private static final List<String> DOCUMENT_PROPERTIES_TO_GET_ELEMENT = ImmutableList.of(
    "activeElement",
    "documentElement",
    "pointerLockElement"
  );


  private WebAPI() {
  }

  public static boolean isWindow(ExpressionTree tree) {

    // window.open(...)
    if (tree instanceof CallExpressionTree && ((CallExpressionTree) tree).callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree) tree).callee();
      if (Utils.isPropertyAccess(callee, Type.Kind.WINDOW, "open")) {
        return true;
      }
    }

    // window.frames
    // document.getElementById("frameId").contentWindow
    if (tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree memberAccess = (DotMemberExpressionTree) tree;

      if (Utils.isPropertyAccess(memberAccess, Type.Kind.WINDOW, "frames") || Utils.isPropertyAccess(memberAccess, Type.Kind.DOM_ELEMENT, "contentWindow")) {
        return true;
      }
    }

    // also it's possible to have "window" type by calling "window[1]" or "window[frameName]",
    // but you never know for sure is it indeed window or something else.

    return false;
  }

  public static boolean isDocument(IdentifierTree tree) {
    return tree.name().equals(DOCUMENT);
  }

  public static boolean isElement(ExpressionTree tree) {

    if (tree.is(Tree.Kind.CALL_EXPRESSION) && ((CallExpressionTree) tree).callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree) tree).callee();
      if (isDocumentUsed(callee, DOCUMENT_METHODS_TO_GET_ELEMENT)) {
        return true;
      }
    }

    return tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION) && isDocumentUsed((DotMemberExpressionTree) tree, DOCUMENT_PROPERTIES_TO_GET_ELEMENT);

  }

  private static boolean isDocumentUsed(DotMemberExpressionTree usage, List<String> propertiesToGetElement) {
    return usage.object().types().contains(Type.Kind.DOCUMENT) && propertiesToGetElement.contains(usage.property().name());
  }

  public static boolean isElementList(ExpressionTree tree) {
    if (tree.is(Tree.Kind.CALL_EXPRESSION) && ((CallExpressionTree) tree).callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree) tree).callee();

      if (callee.object().types().contains(Type.Kind.DOCUMENT) && DOCUMENT_METHODS_TO_GET_ELEMENTS.contains(callee.property().name())) {
        return true;
      }
    }

    return false;
  }


}
