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

import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.Multimap;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.FunctionReturns;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@Rule(key = "S3516")
public class InvariantReturnCheck extends SeCheck {

  private static final String MESSAGE = "Refactor this method to not always return the same value.";

  private Multimap<ReturnStatementTree, ValueConstraint> valuesPerReturn = ArrayListMultimap.create();

  @Override
  public void startOfExecution(Scope functionScope) {
    valuesPerReturn.clear();
  }

  @Override
  public void afterBlockElement(ProgramState currentState, Tree element) {
    if (element.parent().is(Kind.RETURN_STATEMENT)) {
      SymbolicValue value = currentState.peekStack();
      Constraint constraint = currentState.getConstraint(value);
      valuesPerReturn.put((ReturnStatementTree) element.parent(), new ValueConstraint(value, constraint));
    }
  }

  @Override
  public void endOfExecution(Scope functionScope) {
    if (valuesPerReturn.keySet().size() > 1) {
      Collection<ValueConstraint> returnedValues = valuesPerReturn.values();
      Set<Constraint> uniqueConstraints = returnedValues.stream().map(valueConstraint -> valueConstraint.constraint).collect(Collectors.toSet());

      if (uniqueConstraints.size() == 1) {
        Constraint onlyConstraint = uniqueConstraints.iterator().next();

        if (onlyConstraint.isSingleValue() && !isCallbackException()) {
          raiseIssue((FunctionTree) functionScope.tree());
          return;
        }
      }

      Set<SymbolicValue> uniqueSymbolicValues = returnedValues.stream().map(valueConstraint -> valueConstraint.value).collect(Collectors.toSet());
      Constraint reducedConstraint = uniqueConstraints.stream().reduce(Constraint.NO_POSSIBLE_VALUE, Constraint::or);

      if (uniqueSymbolicValues.size() == 1 && isImmutable(reducedConstraint)) {
        raiseIssue((FunctionTree) functionScope.tree());
      }
    }
  }

  private boolean isCallbackException() {
    for (ReturnStatementTree returnStatementTree : valuesPerReturn.keySet()) {
      ExpressionTree expression = returnStatementTree.expression();
      if (expression != null && !expression.is(Kind.BOOLEAN_LITERAL)) {
        return false;
      }
    }

    return true;
  }

  private static boolean isImmutable(Constraint constraint) {
    return constraint.isStricterOrEqualTo(Constraint.NUMBER_PRIMITIVE.or(Constraint.STRING_PRIMITIVE).or(Constraint.BOOLEAN_PRIMITIVE).or(Constraint.NULL_OR_UNDEFINED));
  }

  private void raiseIssue(FunctionTree tree) {
    if (containsImplicitReturnOfUndefined(tree)) {
      return;
    }

    PreciseIssue issue = addIssue(tree.firstToken(), MESSAGE);
    valuesPerReturn.keySet().forEach(issue::secondary);
  }

  private static boolean containsImplicitReturnOfUndefined(FunctionTree tree) {
    BlockTree body = (BlockTree) tree.body();
    FunctionReturns functionReturns = FunctionReturns.getFunctionReturns(body);
    return functionReturns.containsImplicitReturn() || functionReturns.containsReturnWithoutValue();
  }

  private static class ValueConstraint {
    SymbolicValue value;
    Constraint constraint;

    ValueConstraint(SymbolicValue value, Constraint constraint) {
      this.value = value;
      this.constraint = constraint;
    }
  }
}
