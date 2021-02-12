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
package org.sonar.javascript.utils;

import com.sonar.sslr.api.typed.ActionParser;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Iterator;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.Configuration;
import org.sonar.javascript.parser.JavaScriptParser;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.SymbolModelImpl;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.sslr.grammar.GrammarRuleKey;

import static org.assertj.core.api.Assertions.assertThat;

public abstract class JavaScriptTreeModelTest {

  protected final ActionParser<Tree> p = JavaScriptParserBuilder.createParser();

  /**
   * Parse the given string and return the first descendant of the given kind.
   *
   * @param s                  the string to parse
   * @param descendantToReturn the node kind to seek in the generated tree
   * @return the node found for the given kind, null if not found.
   */
  @SuppressWarnings("unchecked")
  protected <T extends Tree> T parse(String s, Kind descendantToReturn) throws Exception {
    Tree node = p.parse(s);
    checkFullFidelity(node, s);
    return (T) getFirstDescendant((JavaScriptTree) node, descendantToReturn);
  }

  @SuppressWarnings("unchecked")
  protected <T extends Tree> T parse(String s, Kind descendantToReturn, GrammarRuleKey root) throws Exception {
    Tree node = new JavaScriptParser(root).parse(s);
    checkFullFidelity(node, s);
    return (T) getFirstDescendant((JavaScriptTree) node, descendantToReturn);
  }

  protected SymbolModelImpl symbolModel(InputFile file) {
    try {
      return symbolModel(file, null);
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  protected ScriptTree parse(File file) {
    try {
      String content = new String(Files.readAllBytes(file.toPath()));
      return (ScriptTree) p.parse(content);
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  protected SymbolModelImpl symbolModel(InputFile file, Configuration configuration) throws IOException {
    ScriptTree root = (ScriptTree) p.parse(file.contents());
    return (SymbolModelImpl) new JavaScriptVisitorContext(root, file, configuration).getSymbolModel();
  }

  protected JavaScriptVisitorContext context(InputFile file) throws IOException {
    ScriptTree root = (ScriptTree) p.parse(file.contents());
    return new JavaScriptVisitorContext(root, file, null);
  }

  protected Tree getFirstDescendant(JavaScriptTree node, Kind descendantToReturn) {
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

  protected static void checkFullFidelity(Tree tree, String s) {
    assertThat(SourceBuilder.build(tree)).isEqualTo(s);
  }
}
