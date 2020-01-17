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
package org.sonar.javascript.checks;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.tree.impl.declaration.ParameterListTreeImpl;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "DuplicateFunctionArgument")
public class DuplicateFunctionArgumentCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Rename the duplicated function parameter \"%s\".";

  @Override
  public void visitParameterList(ParameterListTree tree) {
    Map<String, List<IdentifierTree>> duplicatedParameters = new HashMap<>();

    for (IdentifierTree identifier : ((ParameterListTreeImpl) tree).parameterIdentifiers()) {
      String value = identifier.name();
      String unescaped = EscapeUtils.unescape(value);

      if (!duplicatedParameters.containsKey(unescaped)) {
        duplicatedParameters.put(unescaped, new ArrayList<>());
      }

      duplicatedParameters.get(unescaped).add(identifier);
    }

    for (List<IdentifierTree> sameNameParameters : duplicatedParameters.values()) {
      if (sameNameParameters.size() > 1) {
        for (IdentifierTree duplicatingParameter : sameNameParameters.subList(1, sameNameParameters.size())) {
          String message = String.format(MESSAGE, duplicatingParameter.name());
          addIssue(duplicatingParameter, message).secondary(sameNameParameters.get(0));
        }
      }
    }

    super.visitParameterList(tree);
  }

}
