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
package org.sonar.javascript.tree.symbols.type;

import com.google.common.collect.ImmutableMap;
import java.util.Map;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;

public class BuiltInMethods {

  private BuiltInMethods() {
  }

  private static final Map<String, Type> STRING_METHOD_RETURN_TYPES = ImmutableMap.<String, Type>builder()
    .put("charAt", PrimitiveType.STRING)
    .put("charCodeAt", PrimitiveType.NUMBER)
    .put("concat", PrimitiveType.STRING)
    .put("indexOf", PrimitiveType.NUMBER)
    .put("lastIndexOf", PrimitiveType.NUMBER)
    .put("localeCompare", PrimitiveType.NUMBER)
    .put("replace", PrimitiveType.STRING)
    .put("search", PrimitiveType.NUMBER)
    .put("slice", PrimitiveType.STRING)
    // fixme. Unique object should be created for each "split" call
    .put("split", ArrayType.create())
    .put("substr", PrimitiveType.STRING)
    .put("substring", PrimitiveType.STRING)
    .put("toLocaleLowerCase", PrimitiveType.STRING)
    .put("toLocaleUpperCase", PrimitiveType.STRING)
    .put("toLowerCase", PrimitiveType.STRING)
    .put("toString", PrimitiveType.STRING)
    .put("toUpperCase", PrimitiveType.STRING)
    .put("trim", PrimitiveType.STRING)
    .put("valueOf", PrimitiveType.STRING)
    .build();

  @Nullable
  public static Type inferType(CallExpressionTree tree) {
    if (tree.callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      MemberExpressionTree callee = (MemberExpressionTree) tree.callee();

      if (callee.property().is(Tree.Kind.PROPERTY_IDENTIFIER)) {
        String methodName = ((IdentifierTree) callee.property()).name();
        return inferStringMethodReturnType(callee.object(), methodName);
      }
    }

    return null;

  }

  @Nullable
  private static Type inferStringMethodReturnType(ExpressionTree object, String methodName) {
    if (object.types().contains(Kind.STRING)) {
      return STRING_METHOD_RETURN_TYPES.get(methodName);
    }

    return null;
  }

}
