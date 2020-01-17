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
package org.sonar.javascript.checks.utils;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Kinds;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.visitors.JavaScriptFile;

public class CheckUtils {

  private CheckUtils() {
  }

  public static String asString(Tree tree) {
    if (tree.is(Kind.TOKEN)) {
      return ((SyntaxToken) tree).text();

    } else {
      StringBuilder sb = new StringBuilder();
      Iterator<Tree> treeIterator = ((JavaScriptTree) tree).childrenIterator();
      SyntaxToken prevToken = null;

      while (treeIterator.hasNext()) {
        Tree child = treeIterator.next();

        if (child != null) {
          appendChild(sb, prevToken, child);
          prevToken = child.lastToken();
        }
      }
      return sb.toString();
    }
  }

  private static void appendChild(StringBuilder sb, @Nullable SyntaxToken prevToken, Tree child) {
    if (prevToken != null) {
      SyntaxToken firstToken = child.firstToken();
      if (isSpaceRequired(prevToken, firstToken)) {
        sb.append(" ");
      }
    }
    sb.append(asString(child));
  }

  private static boolean isSpaceRequired(SyntaxToken prevToken, SyntaxToken token) {
    return (token.line() > prevToken.line()) || (prevToken.column() + prevToken.text().length() < token.column());
  }

  public static ExpressionTree removeParenthesis(ExpressionTree expressionTree) {
    if (expressionTree.is(Tree.Kind.PARENTHESISED_EXPRESSION)) {
      return removeParenthesis(((ParenthesisedExpressionTree) expressionTree).expression());
    }
    return expressionTree;
  }

  public static Tree parentIgnoreParentheses(Tree tree) {
    Tree parent = tree.parent();

    if (parent.is(Kind.PARENTHESISED_EXPRESSION)) {
      return parentIgnoreParentheses(parent);
    }

    return parent;
  }

  public static ControlFlowGraph buildControlFlowGraph(Tree tree) {
    Tree parent = tree;
    while (!parent.is(Kind.SCRIPT)) {
      if (parent.is(Kind.BLOCK) && (parent.parent()).is(KindSet.FUNCTION_KINDS)) {
        return ControlFlowGraph.build((BlockTree) parent);
      }
      parent = parent.parent();
    }
    return ControlFlowGraph.build((ScriptTree) parent);
  }

  public static boolean isDescendant(Tree tree, Tree potentialParent) {
    Tree parent = tree;
    while (parent != null) {
      if (parent.equals(potentialParent)) {
        return true;
      }
      parent = parent.parent();
    }
    return false;
  }

  @Nullable
  public static Tree getFirstAncestor(Tree tree, Kinds... kind) {
    Tree ancestor = tree.parent();
    while (ancestor != null) {
      if (ancestor.is(kind)) {
        return ancestor;
      }
      ancestor = ancestor.parent();
    }
    return null;
  }

  public static List<String> readLines(JavaScriptFile file) {
    try (BufferedReader reader = newBufferedReader(file)) {
      return reader.lines().collect(Collectors.toList());

    } catch (IOException e) {
      throw new IllegalStateException("Unable to read file " + file.toString(), e);
    }
  }

  private static BufferedReader newBufferedReader(JavaScriptFile file) throws IOException {
    return new BufferedReader(new StringReader(file.contents()));
  }

}
