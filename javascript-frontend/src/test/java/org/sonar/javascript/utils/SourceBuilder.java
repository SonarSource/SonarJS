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
package org.sonar.javascript.utils;

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;

public class SourceBuilder extends SubscriptionVisitor {

  private final StringBuilder stringBuilder = new StringBuilder();
  private int line = 1;
  private int column = 0;

  public static String build(Tree tree) {
    SourceBuilder writer = new SourceBuilder();
    writer.scanTree(tree);
    return writer.stringBuilder.toString();
  }

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(Tree.Kind.TOKEN);
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
