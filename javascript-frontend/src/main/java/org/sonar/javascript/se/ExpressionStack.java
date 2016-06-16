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
import org.sonar.javascript.se.sv.TypeOfSymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;

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
    Deque<SymbolicValue> newStack = copy();
    newStack.push(pushedValue);
    return new ExpressionStack(newStack);
  }

  public ExpressionStack execute(ExpressionTree expression) {
    Deque<SymbolicValue> newStack = copy();
    Kind kind = ((JavaScriptTree) expression).getKind();
    switch (kind) {
      case IDENTIFIER_REFERENCE:
        if (SymbolicExecution.isUndefined((IdentifierTree) expression)) {
          newStack.push(SpecialSymbolicValue.UNDEFINED);
          break;
        }
        throw new IllegalArgumentException("Unexpected kind of expression to execute: " + kind);
      case IDENTIFIER_NAME:
      case BINDING_IDENTIFIER:
        break;
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
        newStack.push(LogicalNotSymbolicValue.create(negatedValue));
        break;
      case EQUAL_TO:
        newStack.push(EqualToSymbolicValue.createEqual(newStack.pop(), newStack.pop()));
        break;
      case NOT_EQUAL_TO:
        newStack.push(EqualToSymbolicValue.createNotEqual(newStack.pop(), newStack.pop()));
        break;
      case STRICT_EQUAL_TO:
        newStack.push(EqualToSymbolicValue.createStrictEqual(newStack.pop(), newStack.pop()));
        break;
      case STRICT_NOT_EQUAL_TO:
        newStack.push(EqualToSymbolicValue.createStrictNotEqual(newStack.pop(), newStack.pop()));
        break;
      case TYPEOF:
        newStack.push(new TypeOfSymbolicValue(newStack.pop()));
        break;
      case NEW_EXPRESSION:
      case DOT_MEMBER_EXPRESSION:
      case SPREAD_ELEMENT:
      case YIELD_EXPRESSION:
      case POSTFIX_DECREMENT:
      case POSTFIX_INCREMENT:
      case PREFIX_DECREMENT:
      case PREFIX_INCREMENT:
      case UNARY_MINUS:
      case UNARY_PLUS:
      case BITWISE_COMPLEMENT:
      case DELETE:
      case VOID:
        pop(newStack, 1);
        pushUnknown(newStack);
        break;
      case CALL_EXPRESSION:
        pop(newStack, ((CallExpressionTree) expression).arguments().parameters().size() + 1);
        pushUnknown(newStack);
        break;
      case CONDITIONAL_EXPRESSION:
        SymbolicValue result = newStack.pop();
        newStack.pop();
        newStack.push(result);
        break;
      case REGULAR_EXPRESSION_LITERAL:
      case FUNCTION_EXPRESSION:
      case GENERATOR_FUNCTION_EXPRESSION:
      case THIS:
      case SUPER:
      case ARROW_FUNCTION:
      case OBJECT_LITERAL:
      case JSX_SELF_CLOSING_ELEMENT:
      case JSX_STANDARD_ELEMENT:
        pushUnknown(newStack);
        break;
      case ARRAY_LITERAL:
        pop(newStack, ((ArrayLiteralTree) expression).elements().size());
        pushUnknown(newStack);
        break;
      case TEMPLATE_LITERAL:
        pop(newStack, ((TemplateLiteralTree) expression).expressions().size());
        pushUnknown(newStack);
        break;
      case EXPONENT_ASSIGNMENT:
      case MULTIPLY_ASSIGNMENT:
      case DIVIDE_ASSIGNMENT:
      case REMAINDER_ASSIGNMENT:
      case PLUS_ASSIGNMENT:
      case MINUS_ASSIGNMENT:
      case LEFT_SHIFT_ASSIGNMENT:
      case RIGHT_SHIFT_ASSIGNMENT:
      case UNSIGNED_RIGHT_SHIFT_ASSIGNMENT:
      case AND_ASSIGNMENT:
      case XOR_ASSIGNMENT:
      case OR_ASSIGNMENT:
      case BRACKET_MEMBER_EXPRESSION:
      case TAGGED_TEMPLATE:
      case MULTIPLY:
      case EXPONENT:
      case DIVIDE:
      case REMAINDER:
      case PLUS:
      case MINUS:
      case LEFT_SHIFT:
      case RIGHT_SHIFT:
      case UNSIGNED_RIGHT_SHIFT:
      case RELATIONAL_IN:
      case INSTANCE_OF:
      case LESS_THAN:
      case GREATER_THAN:
      case LESS_THAN_OR_EQUAL_TO:
      case GREATER_THAN_OR_EQUAL_TO:
      case BITWISE_AND:
      case BITWISE_XOR:
      case BITWISE_OR:
        pop(newStack, 2);
        pushUnknown(newStack);
        break;
      case COMMA_OPERATOR:
        SymbolicValue commaResult = newStack.pop();
        newStack.pop();
        newStack.push(commaResult);
        break;
      case ASSIGNMENT:
        SymbolicValue assignedValue = newStack.pop();
        newStack.pop();
        newStack.push(assignedValue);
        break;
      default:
        throw new IllegalArgumentException("Unexpected kind of expression to execute: " + kind);
    }
    return new ExpressionStack(newStack);
  }

  private Deque<SymbolicValue> copy() {
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

  private static void pop(Deque<SymbolicValue> newStack, int n) {
    for (int i = 0; i < n; i++) {
      newStack.pop();
    }
  }

  private static void pushUnknown(Deque<SymbolicValue> newStack) {
    newStack.push(UnknownSymbolicValue.UNKNOWN);
  }

  public ExpressionStack removeLastValue() {
    Deque<SymbolicValue> newStack = copy();
    newStack.pop();
    return new ExpressionStack(newStack);
  }

}
