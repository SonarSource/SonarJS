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

import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Multimap;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@JavaScriptRule
@Rule(key = "S3800")
public class FunctionReturnTypeCheck extends SeCheck {

  private static final String MESSAGE = "Refactor this function to always return the same type.";

  private static final Map<Constraint, String> TYPES = ImmutableMap.<Constraint, String>builder()
    .put(Constraint.STRING_PRIMITIVE, "String")
    .put(Constraint.NUMBER_PRIMITIVE, "Number")
    .put(Constraint.BOOLEAN_PRIMITIVE, "Boolean")
    .put(Constraint.FUNCTION, "Function")
    .put(Constraint.REGEXP, "RegExp")
    .put(Constraint.ARRAY, "Array")
    .put(Constraint.DATE, "Date")
    .put(Constraint.OTHER_OBJECT, "Object")
    .build();

  private static final Constraint UNKNOWN_TYPE = Constraint.ANY_VALUE;

  private Multimap<ReturnStatementTree, Constraint> returnedValueConstraintsByReturnStatement = ArrayListMultimap.create();

  @Override
  public void startOfExecution(Scope functionScope) {
    returnedValueConstraintsByReturnStatement.clear();
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    if (element.is(Kind.RETURN_STATEMENT)) {
      ReturnStatementTree returnStatement = (ReturnStatementTree) element;
      if (returnStatement.expression() != null) {
        SymbolicValue symbolicValue = currentState.peekStack();
        Constraint typeConstraint = toTypeConstraint(currentState.getConstraint(symbolicValue));
        if (!UNKNOWN_TYPE.equals(typeConstraint)) {
          returnedValueConstraintsByReturnStatement.put(returnStatement, typeConstraint);
        }
      }
    }
  }

  // Returns Constraint.ANY_VALUE if we can not define the type corresponding to this constraint or don't want to distinguish it (for "null" and "undefined")
  private static Constraint toTypeConstraint(Constraint constraint) {
    for (Constraint typeConstraint : TYPES.keySet()) {
      if (constraint.isStricterOrEqualTo(typeConstraint)) {
        return typeConstraint;
      }
    }

    return UNKNOWN_TYPE;
  }

  @Override
  public void endOfExecution(Scope functionScope) {
    Set<Constraint> returnedTypes = new HashSet<>(returnedValueConstraintsByReturnStatement.values());

    if (returnedTypes.size() > 1) {
      raiseIssue(functionScope.tree());
    }
  }

  private void raiseIssue(Tree functionTree) {
    SyntaxToken firstFunctionToken = functionTree.firstToken();
    PreciseIssue issue = addIssue(firstFunctionToken, MESSAGE);

    for (ReturnStatementTree returnStatement : returnedValueConstraintsByReturnStatement.keySet()) {
      Set<Constraint> returnedTypes = new HashSet<>(returnedValueConstraintsByReturnStatement.get(returnStatement));

      if (!returnedTypes.isEmpty()) {
        List<String> typeNames = returnedTypes.stream().map(TYPES::get).collect(Collectors.toList());
        Collections.sort(typeNames);

        String typesForSecondaryMessage = String.join(" or ", typeNames);
        issue.secondary(returnStatement.returnKeyword(), "Returns " + typesForSecondaryMessage);
      }
    }
  }

}
