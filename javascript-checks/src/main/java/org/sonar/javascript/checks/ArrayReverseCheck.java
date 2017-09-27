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

import java.util.List;
import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;

public class ArrayReverseCheck extends AbstractAnyPathSeCheck {

  private static final String REVERSE = "reverse";
  private static final String MESSAGE = "Move this array \"reverse\" operation to a separate statement.";

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    if (element.is(Tree.Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpression = (CallExpressionTree) element;
      if (callExpression.callee().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
        MemberExpressionTree memberExpression = (MemberExpressionTree) callExpression.callee();
        ExpressionTree object = memberExpression.object();
        if (!isReverseMethod(memberExpression.property())) {
          return;
        }
        if (!object.is(Tree.Kind.IDENTIFIER_REFERENCE)) {
          return;
        }
        ((IdentifierTree) object).symbol().ifPresent(objectSymbol -> {
          if (isArray(objectSymbol, currentState) && isBeingPassedElsewhere(objectSymbol, element))
            this.addUniqueIssue(element, MESSAGE);
        });

      }
    }
  }

  private boolean isBeingPassedElsewhere(Symbol objectSymbol, Tree element) {
    if (element.parent().is(Tree.Kind.INITIALIZED_BINDING_ELEMENT)) {
      return !sameSymbol(objectSymbol, retrieveAssignmentIdentifier(element));
    }
    if (element.parent().is(Tree.Kind.ASSIGNMENT)) {
      AssignmentExpressionTree assignment = (AssignmentExpressionTree) element.parent();
      if (assignment.variable().is(Tree.Kind.IDENTIFIER_REFERENCE)) {
        IdentifierTree identifier = (IdentifierTree) assignment.variable();
        return !sameSymbol(objectSymbol, identifier);
      }
    }
    if (element.parent().is(Tree.Kind.ARGUMENT_LIST)) {
      return true;
    }
    if (element.parent().parent() != null && element.parent().parent().is(Tree.Kind.ARROW_FUNCTION)) {
      return true;
    }
    return false;
  }

  private IdentifierTree retrieveAssignmentIdentifier(Tree element) {
    InitializedBindingElementTree bindingElement = (InitializedBindingElementTree) element.parent();
    List<IdentifierTree> bindingIdentifiers = bindingElement.left().bindingIdentifiers();
    return bindingIdentifiers.get(bindingIdentifiers.size() - 1);
  }

  private boolean sameSymbol(Symbol objectSymbol, IdentifierTree lastIdentifier) {
    Optional<Symbol> bindingSymbol = lastIdentifier.symbol();
    return bindingSymbol.map(symbol -> symbol.equals(objectSymbol)).orElse(false);
  }

  private boolean isArray(Symbol symbol, ProgramState currentState) {
    return currentState.getConstraint(symbol).isStricterOrEqualTo(Constraint.ARRAY);
  }

  public boolean isReverseMethod(ExpressionTree property) {
    if (property.is(Tree.Kind.PROPERTY_IDENTIFIER)) {
      IdentifierTree propertyIdentifier = (IdentifierTree) property;
      if (REVERSE.equals(propertyIdentifier.name())) {
        return true;
      }
    }
    return false;
  }
}
