/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S101")
public class ClassNameCheck extends DoubleDispatchVisitorCheck {

  private static final String DEFAULT_FORMAT = "^[A-Z][a-zA-Z0-9]*$";

  @RuleProperty(
      key = "format",
      description = "Regular expression used to check the class names against.",
      defaultValue = "" + DEFAULT_FORMAT)
  public String format = DEFAULT_FORMAT;

  @Override
  public void visitClass(ClassTree tree) {
    if (tree.is(Kind.CLASS_DECLARATION)) {
      IdentifierTree className = tree.name();
      if (className != null) {
        String name = className.name();
        if (!name.matches(format)) {
          addIssue(className, String.format("Rename class \"%s\" to match the regular expression %s.", name, format));
        }
      }
    }
    super.visitClass(tree);
  }
}
