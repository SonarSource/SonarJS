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

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import javax.annotation.CheckForNull;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;

public class AngularJS {

  private static final Set<String> MODULE_METHODS = ImmutableSet.of(
    "provider",
    "factory",
    "service",
    "value",
    "constant",
    "decorator",
    "animation",
    "filter",
    "controller",
    "directive",
    "component",
    "config",
    "run"
  );

  private AngularJS() {
  }

  @CheckForNull
  public static boolean isModule(CallExpressionTree tree) {
    if (tree.callee().is(Kind.DOT_MEMBER_EXPRESSION)) {
      MemberExpressionTree callee = (MemberExpressionTree) tree.callee();
      return isAngularModule(callee) || isAngularModuleMethod(callee);
    }
    return false;
  }

  /**
   * True for "angular.module" call
   */
  private static boolean isAngularModule(MemberExpressionTree tree) {
    return "angular".equals(getIdentifierName(tree.object())) && "module".equals(getIdentifierName(tree.property()));
  }

  private static boolean isAngularModuleMethod(MemberExpressionTree tree) {
    return tree.object().types().contains(Type.Kind.ANGULAR_MODULE) && MODULE_METHODS.contains(getIdentifierName(tree.property()));
  }

  private static String getIdentifierName(ExpressionTree tree) {
    if (tree.is(Kind.PROPERTY_IDENTIFIER, Kind.IDENTIFIER_REFERENCE)) {
      return ((IdentifierTree) tree).name();
    } else {
      return null;
    }
  }
}
