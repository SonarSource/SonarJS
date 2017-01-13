/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import com.google.common.base.Charsets;
import com.sonar.sslr.api.typed.ActionParser;
import java.io.File;
import java.util.Iterator;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.SymbolModelImpl;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.assertj.core.api.Assertions.assertThat;

public abstract class JavaScriptTreeModelTest {

  protected final ActionParser<Tree> p = JavaScriptParserBuilder.createParser(Charsets.UTF_8);

  /**
   * Parse the given string and return the first descendant of the given kind.
   *
   * @param s                  the string to parse
   * @param descendantToReturn the node kind to seek in the generated tree
   * @return the node found for the given kind, null if not found.
   */
  protected <T extends Tree> T parse(String s, Kind descendantToReturn) throws Exception {
    Tree node = p.parse(s);
    checkFullFidelity(node, s);
    return (T) getFirstDescendant((JavaScriptTree) node, descendantToReturn);
  }

  protected SymbolModelImpl symbolModel(File file) {
    ScriptTree root = (ScriptTree) p.parse(file);
    return (SymbolModelImpl) new JavaScriptVisitorContext(root, file, null).getSymbolModel();
  }

  protected JavaScriptVisitorContext context(File file) {
    ScriptTree root = (ScriptTree) p.parse(file);
    return new JavaScriptVisitorContext(root, file, null);
  }

  private Tree getFirstDescendant(JavaScriptTree node, Kind descendantToReturn) {
    if (node.is(descendantToReturn)) {
      return node;
    }
    if (node.isLeaf()) {
      return null;
    }
    Iterator<Tree> childrenIterator = node.childrenIterator();
    while (childrenIterator.hasNext()) {
      Tree child = childrenIterator.next();
      if (child != null) {
        Tree childDescendant = getFirstDescendant((JavaScriptTree) child, descendantToReturn);
        if (childDescendant != null) {
          return childDescendant;
        }
      }
    }
    return null;
  }

  /**
   * Return the concatenation of all the given node tokens value.
   */
  protected String expressionToString(Tree node) {
    return SourceBuilder.build(node).trim();
  }

  private static void checkFullFidelity(Tree tree, String s) {
    assertThat(SourceBuilder.build(tree)).isEqualTo(s);
  }
}
