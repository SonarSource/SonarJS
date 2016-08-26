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

import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

@Rule(key = "S3002")
public class UnaryPlusMinusWithObjectCheck extends SeCheck {

  private static final String MESSAGE = "Remove this use of unary \"%s\".";

  private static final EnumSet<Type> NOT_ALLOWED_TYPES = EnumSet.of(
    Type.OTHER_OBJECT,
    Type.ARRAY,
    Type.FUNCTION,
    Type.OBJECT
  );

  // For each unary +/- expression tree this map contains true if type is object in all execution paths, true if type is not object in at least one execution path
  private Map<UnaryExpressionTree, Boolean> objectTypes = new HashMap<>();

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element) {
    if (element.is(Kind.UNARY_MINUS, Kind.UNARY_PLUS)) {

      UnaryExpressionTree unaryExpression = (UnaryExpressionTree) element;

      Constraint constraint = currentState.getConstraint(currentState.peekStack());

      Type type = constraint.type();

      boolean objectType = type != null && NOT_ALLOWED_TYPES.contains(type);

      if (!objectType) {
        objectTypes.put(unaryExpression, false);

      } else if (!objectTypes.containsKey(unaryExpression)) {
        objectTypes.put(unaryExpression, true);
      }
    }
  }

  @Override
  public void endOfExecution(Scope functionScope) {
    for (Entry<UnaryExpressionTree, Boolean> entry : objectTypes.entrySet()) {
      if (entry.getValue() && !isDateException(entry.getKey())) {
        SyntaxToken operator = entry.getKey().operator();
        addIssue(operator, String.format(MESSAGE, operator.text()));
      }
    }
  }

  @Override
  public void startOfExecution(Scope functionScope) {
    objectTypes.clear();
  }

  private static boolean isDateException(Tree tree) {
    if (tree.is(Kind.UNARY_PLUS)) {
      String exprString = CheckUtils.asString(((UnaryExpressionTree) tree).expression());
      return exprString.contains("Date") || exprString.contains("date");
    }
    return false;
  }


}
