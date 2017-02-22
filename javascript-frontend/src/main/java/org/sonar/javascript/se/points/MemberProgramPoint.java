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
package org.sonar.javascript.se.points;

import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ExpressionStack;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.sv.ObjectSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;

public class MemberProgramPoint implements ProgramPoint {

  private final Tree element;

  public MemberProgramPoint(Tree element) {
    this.element = element;
  }

  public static boolean originatesFrom(Tree element) {
    return element.is(Tree.Kind.BRACKET_MEMBER_EXPRESSION, Tree.Kind.DOT_MEMBER_EXPRESSION);
  }

  @Override
  public Optional<ProgramState> execute(final ProgramState state) {
    final SymbolicValue objectValue;
    final ExpressionStack expressionStack = state.getStack();
    final ExpressionStack newExpressionStack;
    Optional<ProgramState> newState;

    if (element.is(Tree.Kind.BRACKET_MEMBER_EXPRESSION)) {
      objectValue = state.peekStack(1);
      newState = state.constrain(objectValue, Constraint.NOT_NULLY);
      if(!newState.isPresent()) {
        return newState;
      }
      newExpressionStack = expressionStack.apply(stack -> {
        // popping the array index
        stack.pop();
        stack.pop();
        stack.push(UnknownSymbolicValue.UNKNOWN);
      });

    } else {
      objectValue = state.peekStack(0);
      newState = state.constrain(objectValue, Constraint.NOT_NULLY);
      if(!newState.isPresent()) {
        return newState;
      }
      newExpressionStack = expressionStack.apply(stack -> {
        stack.pop();
        stack.push(resolvePropertyValue(newState.get(), objectValue));
      });
    }

    return Optional.of(newState.get().withStack(newExpressionStack));
  }

  private SymbolicValue resolvePropertyValue(ProgramState state, SymbolicValue objectValue) {
    String propertyName = ((DotMemberExpressionTree) element).property().name();

    if (objectValue instanceof ObjectSymbolicValue) {
      SymbolicValue value = ((ObjectSymbolicValue) objectValue).getPropertyValue(propertyName);
      if (!UnknownSymbolicValue.UNKNOWN.equals(value)) {
        return value;
      }
    }

    Type type = state.getConstraint(objectValue).type();

    if (type != null) {
      return type.getPropertyValue(propertyName);
    } else {
      return UnknownSymbolicValue.UNKNOWN;
    }
  }

}
