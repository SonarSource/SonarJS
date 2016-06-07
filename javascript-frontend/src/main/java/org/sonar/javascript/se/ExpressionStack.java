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
package org.sonar.javascript.se;

import java.util.Deque;
import java.util.LinkedList;
import java.util.Objects;
import javax.annotation.Nullable;
import org.sonar.javascript.se.sv.EqualToSymbolicValue;
import org.sonar.javascript.se.sv.LiteralSymbolicValue;
import org.sonar.javascript.se.sv.LogicalNotSymbolicValue;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;

class ExpressionStack {

  private static final ExpressionStack EMPTY = new ExpressionStack();

  private final Deque<SymbolicValue> stack;

  public static ExpressionStack emptyStack() {
    return EMPTY;
  }

  private ExpressionStack() {
    this.stack = new LinkedList<>();
  }

  private ExpressionStack(Deque<SymbolicValue> stack) {
    this.stack = stack;
  }

  public ExpressionStack push(@Nullable SymbolicValue newValue) {
    SymbolicValue pushedValue = newValue;
    if (pushedValue == null) {
      pushedValue = UnknownSymbolicValue.UNKNOWN;
    }
    LinkedList<SymbolicValue> newStack = copy();
    newStack.push(pushedValue);
    return new ExpressionStack(newStack);
  }

  public ExpressionStack execute(ExpressionTree expression) {
    Deque<SymbolicValue> newStack = copy();
    Kind kind = ((JavaScriptTree) expression).getKind();
    switch (kind) {
      case IDENTIFIER_REFERENCE:
      case BINDING_IDENTIFIER:
        throw new IllegalArgumentException("Unexpected kind of expression to execute: " + kind);
      case NULL_LITERAL:
        newStack.push(SpecialSymbolicValue.NULL);
        break;
      case NUMERIC_LITERAL:
      case STRING_LITERAL:
      case BOOLEAN_LITERAL:
        newStack.push(LiteralSymbolicValue.get((LiteralTree) expression));
        break;
      case LOGICAL_COMPLEMENT:
        SymbolicValue negatedValue = newStack.pop();
        newStack.push(new LogicalNotSymbolicValue(negatedValue));
        break;
      case EQUAL_TO:
        newStack.push(EqualToSymbolicValue.equal(newStack.pop(), newStack.pop()));
        break;
      case NOT_EQUAL_TO:
        newStack.push(EqualToSymbolicValue.notEqual(newStack.pop(), newStack.pop()));
        break;
      case STRICT_EQUAL_TO:
        newStack.push(EqualToSymbolicValue.strictEqual(newStack.pop(), newStack.pop()));
        break;
      case STRICT_NOT_EQUAL_TO:
        newStack.push(EqualToSymbolicValue.strictNotEqual(newStack.pop(), newStack.pop()));
        break;
      case TYPEOF:
      case NEW_EXPRESSION:
        newStack.pop();
        newStack.push(UnknownSymbolicValue.UNKNOWN);
        break;
      case CALL_EXPRESSION:
        newStack.pop();
        CallExpressionTree callExpressionTree = (CallExpressionTree) expression;
        int numberOfArguments = callExpressionTree.arguments().parameters().size();
        for (int i = 0; i < numberOfArguments; i++) {
          newStack.pop();
        }
        newStack.push(UnknownSymbolicValue.UNKNOWN);
        break;
      case CONDITIONAL_EXPRESSION:
        SymbolicValue result = newStack.pop();
        newStack.pop();
        newStack.push(result);
        break;
      default:
        newStack.push(UnknownSymbolicValue.UNKNOWN);
    }
    return new ExpressionStack(newStack);
  }

  private LinkedList<SymbolicValue> copy() {
    return new LinkedList<>(stack);
  }

  public SymbolicValue peek() {
    return stack.peek();
  }

  public int size() {
    return stack.size();
  }

  @Override
  public int hashCode() {
    return stack.hashCode();
  }

  @Override
  public boolean equals(Object obj) {
    if (obj instanceof ExpressionStack) {
      ExpressionStack other = (ExpressionStack) obj;
      return Objects.equals(this.stack, other.stack);
    }
    return false;
  }

}
