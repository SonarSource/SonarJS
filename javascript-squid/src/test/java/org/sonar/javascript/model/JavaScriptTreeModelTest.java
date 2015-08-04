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
package org.sonar.javascript.model;

import com.google.common.base.Charsets;
import com.google.common.collect.ImmutableList;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.Token;
import com.sonar.sslr.impl.Parser;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.ast.visitors.SubscriptionAstTreeVisitor;
import org.sonar.javascript.parser.EcmaScriptParser;
import org.sonar.plugins.javascript.api.VisitorTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import java.util.List;

import static org.fest.assertions.Assertions.assertThat;

public abstract class JavaScriptTreeModelTest extends VisitorTest {

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
    checkFullFidelity((Tree) node, s);
    return (T) (node.is(descendantToReturn) ? node : node.getFirstDescendant(descendantToReturn));
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

  private void checkFullFidelity(Tree tree, String s) {
    assertThat(SourceBuilder.build(tree)).isEqualTo(s);
  }

  private static class SourceBuilder extends SubscriptionAstTreeVisitor {

    private final StringBuilder stringBuilder = new StringBuilder();
    private int line = 1;
    private int column = 0;

    public static String build(Tree tree) {
      SourceBuilder writer = new SourceBuilder();
      writer.scanTree(tree);
      return writer.stringBuilder.toString();
    }

    @Override
    public List<Kind> nodesToVisit() {
      return ImmutableList.of(Tree.Kind.TOKEN);
    }

    @Override
    public void visitNode(Tree tree) {
      SyntaxToken token = (SyntaxToken) tree;
      int linesToInsert = token.line() - line;
      if (linesToInsert < 0) {
        throw new IllegalStateException("Illegal token line for " + token);
      } else if (linesToInsert > 0) {
        for (int i = 0; i < linesToInsert; i++) {
          stringBuilder.append("\n");
          line++;
        }
        column = 0;
      }
      int spacesToInsert = token.column() - column;
      for (int i = 0; i < spacesToInsert; i++) {
        stringBuilder.append(' ');
        column++;
      }
      String text = token.text();
      stringBuilder.append(text);
      column += text.length();
    }

  }
}
