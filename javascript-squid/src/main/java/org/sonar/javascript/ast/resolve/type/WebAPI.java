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
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import java.util.List;

public class WebAPI {

  private static final String WINDOW = "window";
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



  private WebAPI(){
  }

  public static boolean isWindow(ExpressionTree tree){
    // window
    if (tree instanceof IdentifierTree && ((IdentifierTree) tree).name().equals(WINDOW)){
      return true;
    }

    // window.open(...)
    if (tree instanceof CallExpressionTree && ((CallExpressionTree) tree).callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)){
      DotMemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree) tree).callee();
      if (callee.object().types().contains(Type.Kind.WINDOW) && Utils.identifierWithName(callee.property(), "open")){
        return true;
      }
    }


    if (tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)){
      DotMemberExpressionTree memberAccess = (DotMemberExpressionTree) tree;

      // window.frames
      if (memberAccess.object().types().contains(Type.Kind.WINDOW) && Utils.identifierWithName(memberAccess.property(), "frames")){
        return true;
      }

      // document.getElementById("frameId").contentWindow
      if (memberAccess.object().types().contains(Type.Kind.DOM_ELEMENT) && Utils.identifierWithName(memberAccess.property(), "contentWindow")){
        return true;
      }
    }

    // window.frames[1]
    if (tree.is(Tree.Kind.BRACKET_MEMBER_EXPRESSION) && ((BracketMemberExpressionTree) tree).object().types().contains(Type.Kind.WINDOW)){
      return true;
    }

    return false;
  }



  public static boolean isDocument(IdentifierTree tree) {
    return tree.name().equals(DOCUMENT);
  }

  public static boolean isElement(ExpressionTree tree) {
    // todo (Lena): code duplication here

    if (tree.is(Tree.Kind.CALL_EXPRESSION) && ((CallExpressionTree) tree).callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)){
      DotMemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree) tree).callee();
      if (callee.object().types().contains(Type.Kind.DOCUMENT) && callee.property() instanceof IdentifierTree){
        IdentifierTree property = (IdentifierTree) callee.property();
        if (DOCUMENT_METHODS_TO_GET_ELEMENT.contains(property.name())){
          return true;
        }
      }
    }

    if (tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)){
      DotMemberExpressionTree callee = (DotMemberExpressionTree) tree;
      if (callee.object().types().contains(Type.Kind.DOCUMENT) && callee.property() instanceof IdentifierTree){
        IdentifierTree property = (IdentifierTree) callee.property();
        if (DOCUMENT_PROPERTIES_TO_GET_ELEMENT.contains(property.name())){
          return true;
        }
      }
    }

    return false;
  }

  public static boolean isElementList(ExpressionTree tree) {
    if (tree.is(Tree.Kind.CALL_EXPRESSION) && ((CallExpressionTree) tree).callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)){
      DotMemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree) tree).callee();
      if (callee.object().types().contains(Type.Kind.DOCUMENT) && callee.property() instanceof IdentifierTree){
        IdentifierTree property = (IdentifierTree) callee.property();
        if (DOCUMENT_METHODS_TO_GET_ELEMENTS.contains(property.name())){
          return true;
        }
      }
    }

    return false;
  }


}
