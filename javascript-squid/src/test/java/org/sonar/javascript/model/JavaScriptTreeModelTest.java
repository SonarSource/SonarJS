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
package org.sonar.javascript.model;

import com.google.common.base.Charsets;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.Token;
import com.sonar.sslr.impl.Parser;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.javascript.parser.EcmaScriptParser;

public abstract class JavaScriptTreeModelTest {

  protected static final Parser p = EcmaScriptParser.create(new EcmaScriptConfiguration(Charsets.UTF_8));

  /**
   * Parse the given string and return the first descendant of the given kind.
   *
   * @param s the string to parse
   * @param descendantToReturn the node kind to seek in the generated tree
   *
   * @return the node found for the given kind, null if not found.
   */
  protected <T extends Tree> T parse(String s, Kind descendantToReturn) throws Exception {
    AstNode node = p.parse(s);
    return (T) (node.is(descendantToReturn) ? node : node.getFirstDescendant(descendantToReturn));
  }

  /**
   * Parse the given string and return the parent node of the generated AST
   *
   * @param s the string to parse
   *
   * @return return the parent node of the generated AST
   */
  protected AstNode parse(String s) throws Exception {
    return p.parse(s);
  }

  /**
   * Return the concatenation of all the given node tokens value, with a space between each token.
   */
  protected String expressionToString(Tree node) {
    StringBuilder builder = new StringBuilder();
    for (Token t : ((AstNode) node).getTokens()) {
      builder.append(t.getValue() + " ");
    }
    return builder.toString().trim();
  }
}
