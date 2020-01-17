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

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.function.IntFunction;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;

@JavaScriptRule
@Rule(key = "S3782")
public class ArgumentTypesCheck extends SeCheck {

  private static final String MESSAGE = "Change this argument to the documented type%s.";

  private static final Map<Constraint, String> CONSTRAINT_TO_STRING_MAP = ImmutableMap.<Constraint, String>builder()
    .put(Constraint.ANY_NUMBER, "Number")
    .put(Constraint.ANY_STRING, "String")
    .put(Constraint.OBJECT, "Object")
    .put(Constraint.ARRAY, "Array")
    .put(Constraint.FUNCTION, "Function")
    .put(Constraint.REGEXP, "Regexp")
    .put(Constraint.ANY_STRING.or(Constraint.REGEXP), "String or RegExp")
    .put(Constraint.ANY_STRING.or(Constraint.FUNCTION), "String or Function")
    .put(Constraint.ANY_STRING.or(Constraint.ARRAY), "String or Array")
    .put(Constraint.OBJECT.or(Constraint.NULL), "Object or Null")
    .build();

  private Map<Tree, Optional<String>> hasIssue = new HashMap<>();

  @Override
  public void startOfExecution(Scope functionScope) {
    hasIssue.clear();
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    if (element.is(Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpression = (CallExpressionTree) element;

      SeparatedList<ExpressionTree> arguments = callExpression.argumentClause().arguments();
      SymbolicValue calleeValue = currentState.peekStack(arguments.size());

      if (calleeValue instanceof BuiltInFunctionSymbolicValue) {
        IntFunction<Constraint> signature = ((BuiltInFunctionSymbolicValue) calleeValue).signature();
        if (signature != null) {
          check(signature, currentState, arguments);
        }
      }

    }
  }

  private void check(IntFunction<Constraint> signature, ProgramState currentState, List<ExpressionTree> arguments) {
    List<SymbolicValue> argumentValues = new ArrayList<>();

    for (int i = 0; i < arguments.size(); i++) {
      argumentValues.add(currentState.peekStack(i));
    }

    argumentValues = Lists.reverse(argumentValues);
    for (int i = 0; i < argumentValues.size(); i++) {
      Tree argumentTree = arguments.get(i);
      String errorMessage = errorMessage(signature.apply(i), currentState, argumentValues.get(i));
      if (errorMessage == null) {
        hasIssue.put(argumentTree, Optional.empty());

      } else if (!hasIssue.containsKey(argumentTree)) {
        hasIssue.put(argumentTree, Optional.of(errorMessage));
      }
    }
  }

  @Nullable
  private static String errorMessage(@Nullable Constraint argumentConstraint, ProgramState currentState, SymbolicValue argumentValue) {
    if (argumentConstraint != null) {

      Constraint actualConstraint = currentState.getConstraint(argumentValue);
      if (extendSignatureArgumentConstraint(argumentConstraint).isIncompatibleWith(actualConstraint)) {
        String type = CONSTRAINT_TO_STRING_MAP.get(argumentConstraint);
        // untested condition. To avoid having null in message.
        type = type == null ? "" : (": " + type);
        return String.format(MESSAGE, type);
      }
    }

    return null;
  }

  @Override
  public void endOfExecution(Scope functionScope) {
    for (Entry<Tree, Optional<String>> entry : hasIssue.entrySet()) {
      Optional<String> value = entry.getValue();
      if (value.isPresent()) {
        addIssue(entry.getKey(), value.get());
      }
    }
  }

  private static Constraint extendSignatureArgumentConstraint(Constraint constraint) {
    if (Constraint.REGEXP.isStricterOrEqualTo(constraint)) {
      return constraint.or(Constraint.ANY_STRING).or(Constraint.ANY_NUMBER);

    } else if (Constraint.STRING_PRIMITIVE.isStricterOrEqualTo(constraint)) {
      return constraint.or(Constraint.ANY_NUMBER).or(Constraint.DATE);

    } else if (Constraint.NUMBER_PRIMITIVE.isStricterOrEqualTo(constraint)) {
      return constraint.or(Constraint.DATE);
    }

    return constraint;
  }

}
