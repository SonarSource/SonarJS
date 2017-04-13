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
package org.sonar.javascript.checks;

import com.google.common.collect.LinkedListMultimap;
import com.google.common.collect.ListMultimap;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
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
    checkProperties(tree.properties());
    super.visitObjectLiteral(tree);
  }

  @Override
  public void visitClass(ClassTree tree) {
    checkProperties(tree.elements());
    super.visitClass(tree);
  }

  private void checkProperties(List<Tree> properties) {
    ListMultimap<String, Tree> keys = LinkedListMultimap.create();

    for (Tree property : properties) {
      Tree propertyNameTree = getPropertyNameTree(property);
      if (propertyNameTree != null) {
        String propertyName = getPropertyName(propertyNameTree);
        if (propertyName != null) {
          keys.put(EscapeUtils.unescape(propertyName), property);
        }
      }
    }

    checkKeys(keys);
  }

  private void checkKeys(ListMultimap<String, Tree> keys) {
    for (String key : keys.keySet()) {
      List<Tree> properties = keys.get(key);
      if (properties.size() > 1 && !getterSetter(properties)) {
        Tree duplicatedProperty = getPropertyNameTree(properties.remove(0));

        for (Tree property : properties) {
          Tree propertyKey = getPropertyNameTree(property);
          addIssue(propertyKey, String.format(MESSAGE, getPropertyName(propertyKey))).secondary(duplicatedProperty);
        }

      }
    }
  }

  private static boolean getterSetter(List<Tree> value) {
    if (value.size() == 2) {
      return (value.get(0).is(Kind.GET_METHOD) && value.get(1).is(Kind.SET_METHOD))
        || (value.get(1).is(Kind.GET_METHOD) && value.get(0).is(Kind.SET_METHOD));
    }

    return false;
  }

  @Nullable
  private static Tree getPropertyNameTree(Tree property) {
    if (property.is(Kind.METHOD, Kind.GENERATOR_METHOD)) {
      return ((MethodDeclarationTree) property).name();

    } else if (property.is(Kind.GET_METHOD, Kind.SET_METHOD)) {
      return ((AccessorMethodDeclarationTree) property).name();

    } else if (property.is(Kind.FIELD)) {
      return ((FieldDeclarationTree) property).propertyName();

    } else if (property.is(Kind.PAIR_PROPERTY)) {
      return ((PairPropertyTree) property).key();

    } else if (property.is(Kind.IDENTIFIER_REFERENCE)) {
      return property;
    }

    return null;
  }

  @Nullable
  private static String getPropertyName(Tree propertyKey) {
    if (propertyKey.is(Tree.Kind.STRING_LITERAL)) {
      String value = ((LiteralTree) propertyKey).value();
      return value.substring(1, value.length() - 1);
    }

    if (propertyKey.is(Kind.IDENTIFIER_NAME, Kind.IDENTIFIER_REFERENCE)) {
      return ((IdentifierTree) propertyKey).name();
    }

    if (propertyKey.is(Tree.Kind.NUMERIC_LITERAL)) {
      return ((LiteralTree) propertyKey).value();
    }

    return null;
  }

}
