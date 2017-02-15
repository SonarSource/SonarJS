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

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.points.MemberProgramPoint;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;

import static org.sonar.javascript.se.Constraint.NULL_OR_UNDEFINED;

@Rule(key = "S2259")
public class NullDereferenceCheck extends SeCheck {

  private static final String MESSAGE = "TypeError can be thrown as \"%s\" might be null or undefined here.";
  private static final String EXPRESSION_MESSAGE = "TypeError can be thrown as this expression might be null or undefined here.";

  private Set<Symbol> hasIssue;

  @Override
  public void startOfExecution(Scope functionScope) {
    hasIssue = new HashSet<>();
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    if (programPoint instanceof MemberProgramPoint) {
      final Optional<ProgramState> result = programPoint.execute(currentState);
      if (!result.isPresent()) {
        final ExpressionTree memberOwner = ((MemberExpressionTree) element).object();
        Symbol symbol = getSymbol(memberOwner);
        addUniqueIssue(memberOwner, symbol);
      }
    } else if (isForOfExpression(element)) {
      Symbol symbol = getSymbol((ExpressionTree) element);
      Constraint constraint = currentState.getConstraint(symbol);
      if (symbol != null && constraint != null && constraint.isStricterOrEqualTo(NULL_OR_UNDEFINED)) {
        addUniqueIssue(element, symbol);
      }
    }
  }

  private void addUniqueIssue(Tree element, @Nullable Symbol symbol) {
    if (symbol == null) {
      addIssue(element, EXPRESSION_MESSAGE);
    } else if (!hasIssue.contains(symbol)) {
      addIssue(element, String.format(MESSAGE, symbol.name()));
      hasIssue.add(symbol);
    }
  }

  private static Symbol getSymbol(ExpressionTree object) {
    if (object.is(Kind.IDENTIFIER_REFERENCE)) {
      return ((IdentifierTree) object).symbol();
    }
    return null;
  }

  private static boolean isForOfExpression(Tree element) {
    final JavaScriptTree parent = ((JavaScriptTree) element).getParent();
    return parent.is(Kind.FOR_OF_STATEMENT) && element.equals(((ForObjectStatementTree) parent).expression());
  }

}
