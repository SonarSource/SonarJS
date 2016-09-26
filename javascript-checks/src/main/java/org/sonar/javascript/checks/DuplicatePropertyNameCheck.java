/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.checks;

import java.util.HashMap;
import java.util.Map;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "DuplicatePropertyName")
public class DuplicatePropertyNameCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Rename or remove duplicate property name '%s'.";

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    Map<String, Tree> keys = new HashMap<>();

    for (Tree property : tree.properties().elements()) {
      if (property.is(Tree.Kind.PAIR_PROPERTY)) {
        visitPairProperty(keys, (PairPropertyTree) property);
      }

      if (property.is(Kind.IDENTIFIER_REFERENCE)) {
        IdentifierTree identifier = (IdentifierTree) property;
        addKey(keys, identifier.name(), (IdentifierTree)property);
      }
    }
    super.visitObjectLiteral(tree);
  }

  private void visitPairProperty(Map<String, Tree> keys, PairPropertyTree pairProperty) {
    Tree key = pairProperty.key();
    if (key.is(Tree.Kind.STRING_LITERAL)) {
      String value = ((LiteralTree) key).value();
      value = value.substring(1, value.length() - 1);
      addKey(keys, value, pairProperty.key());
    }

    if (key.is(Kind.IDENTIFIER_NAME)) {
      addKey(keys, ((IdentifierTree) key).name(), pairProperty.key());
    }

    if (key.is(Tree.Kind.NUMERIC_LITERAL)) {
      addKey(keys, ((LiteralTree) key).value(), pairProperty.key());
    }
  }

  private void addKey(Map<String, Tree> keys, String key, Tree keyTree) {
    Tree duplicated = keys.get(EscapeUtils.unescape(key));
    if (duplicated != null) {
      addIssue(keyTree, String.format(MESSAGE, key)).secondary(duplicated);
    } else {
      keys.put(key, keyTree);
    }
  }

}
