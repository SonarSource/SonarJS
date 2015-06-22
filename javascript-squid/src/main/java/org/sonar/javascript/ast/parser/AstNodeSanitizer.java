/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.ast.parser;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.Token;

import java.util.List;

public class AstNodeSanitizer {

  private int toIndex;

  public void sanitize(AstNode astNode) {
    toIndex = 0;
    doSanitize(astNode);
  }

  private void doSanitize(AstNode astNode) {
    List<AstNode> children = astNode.getChildren();

    if (!children.isEmpty()) {
      // Compound nodes
      Token token = null;
      int fromIndex = -1;

      for (AstNode child : astNode.getChildren()) {
        doSanitize(child);

        if (token == null && child.hasToken()) {
          token = child.getToken();
        }

        if (fromIndex == -1) {
          fromIndex = child.getFromIndex();
        }
      }

      AstNodeReflector.setToken(astNode, token);
      astNode.setFromIndex(fromIndex);
      astNode.setToIndex(toIndex);
    } else if (astNode.hasToken()) {
      // Token wrapper nodes
      toIndex = astNode.getToIndex();
    } else {
      // Empty nodes
      astNode.setFromIndex(toIndex);
      astNode.setToIndex(toIndex);
    }
  }

}
