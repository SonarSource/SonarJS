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

import com.google.common.base.Preconditions;
import java.util.Deque;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Objects;
import javax.annotation.Nullable;
import org.sonar.javascript.se.sv.LiteralSymbolicValue;
import org.sonar.javascript.se.sv.LogicalNotSymbolicValue;
import org.sonar.javascript.se.sv.PlusSymbolicValue;
import org.sonar.javascript.se.sv.RelationalSymbolicValue;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.se.sv.TypeOfSymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;

/**
 * This class stores the stack of symbolic values corresponding to the order of expression evaluation.
 * Each {@link ProgramState} has corresponding instance of {@link ExpressionStack}.
 * Note that this class is immutable.
 */
public class ExpressionStack {

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

  /**
   * This method executes expression: it pushes to the stack a new symbolic value based (if required) on popped symbolic values.
   * Note that as {@link ExpressionStack} is an immutable class,
   * this method will return new resulting instance of {@link ExpressionStack} while the calling this method instance will not be changed.
   *
   * @param expression to be executed
   * @return resulting {@link ExpressionStack}
   */
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
      case CONDITIONAL_AND:
      case CONDITIONAL_OR:
      case CONDITIONAL_EXPRESSION:
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
      case TYPEOF:
        newStack.push(new TypeOfSymbolicValue(newStack.pop()));
        break;
      case NEW_EXPRESSION:
        NewExpressionTree newExpressionTree = (NewExpressionTree) expression;
        int arguments = newExpressionTree.arguments() == null ? 0 : newExpressionTree.arguments().parameters().size();
        pop(newStack, arguments + 1);
        newStack.push(new SymbolicValueWithConstraint(Constraint.OBJECT));
        break;
      case DOT_MEMBER_EXPRESSION:
      case SPREAD_ELEMENT:
      case VOID:
      case AWAIT:
        pop(newStack, 1);
        pushUnknown(newStack);
        break;
      case DELETE:
        pop(newStack, 1);
        newStack.push(new SymbolicValueWithConstraint(Constraint.BOOLEAN));
        break;
      case YIELD_EXPRESSION:
        if (((YieldExpressionTree) expression).argument() != null) {
          pop(newStack, 1);
        }
        pushUnknown(newStack);
        break;
      case POSTFIX_DECREMENT:
      case POSTFIX_INCREMENT:
      case PREFIX_DECREMENT:
      case PREFIX_INCREMENT:
      case UNARY_MINUS:
      case UNARY_PLUS:
      case BITWISE_COMPLEMENT:
        pop(newStack, 1);
        newStack.push(new SymbolicValueWithConstraint(Constraint.NUMBER));
        break;
      case CALL_EXPRESSION:
        pop(newStack, ((CallExpressionTree) expression).arguments().parameters().size() + 1);
        pushUnknown(newStack);
        break;
      case FUNCTION_EXPRESSION:
      case GENERATOR_FUNCTION_EXPRESSION:
      case ARROW_FUNCTION:
        newStack.push(new SymbolicValueWithConstraint(Constraint.FUNCTION));
        break;
      case REGULAR_EXPRESSION_LITERAL:
      case THIS:
      case SUPER:
      case NEW_TARGET:
      case JSX_SELF_CLOSING_ELEMENT:
      case JSX_STANDARD_ELEMENT:
        pushUnknown(newStack);
        break;
      case CLASS_EXPRESSION:
        newStack.push(new SymbolicValueWithConstraint(Constraint.OTHER_OBJECT));
        break;
      case OBJECT_LITERAL:
        popObjectLiteralProperties((ObjectLiteralTree)expression, newStack);
        newStack.push(new SymbolicValueWithConstraint(Constraint.OTHER_OBJECT));
        break;
      case ARRAY_LITERAL:
        pop(newStack, ((ArrayLiteralTree) expression).elements().size());
        newStack.push(new SymbolicValueWithConstraint(Constraint.ARRAY));
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
      case EXPONENT:
      case RELATIONAL_IN:
      case INSTANCE_OF:
        pop(newStack, 2);
        pushUnknown(newStack);
        break;
      case EQUAL_TO:
      case NOT_EQUAL_TO:
      case STRICT_EQUAL_TO:
      case STRICT_NOT_EQUAL_TO:
      case LESS_THAN:
      case GREATER_THAN:
      case LESS_THAN_OR_EQUAL_TO:
      case GREATER_THAN_OR_EQUAL_TO:
        SymbolicValue rightOperand = newStack.pop();
        SymbolicValue leftOperand = newStack.pop();
        newStack.push(RelationalSymbolicValue.create(kind, leftOperand, rightOperand));
        break;
      case PLUS:
        newStack.push(new PlusSymbolicValue(newStack.pop(), newStack.pop()));
        break;
      case MINUS:
      case DIVIDE:
      case REMAINDER:
      case MULTIPLY:
      case BITWISE_AND:
      case BITWISE_XOR:
      case BITWISE_OR:
      case LEFT_SHIFT:
      case RIGHT_SHIFT:
      case UNSIGNED_RIGHT_SHIFT:
        pop(newStack, 2);
        newStack.push(new SymbolicValueWithConstraint(Constraint.NUMBER));
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
      case ARRAY_ASSIGNMENT_PATTERN:
      case OBJECT_ASSIGNMENT_PATTERN:
        newStack.push(UnknownSymbolicValue.UNKNOWN);
        break;
      default:
        throw new IllegalArgumentException("Unexpected kind of expression to execute: " + kind);
    }
    return new ExpressionStack(newStack);
  }

  private static void popObjectLiteralProperties(ObjectLiteralTree objectLiteralTree, Deque<SymbolicValue> newStack) {
    for (Tree property : objectLiteralTree.properties()) {
      if (property.is(Kind.PAIR_PROPERTY)) {
        Tree key = ((PairPropertyTree) property).key();
        if (key.is(Kind.STRING_LITERAL, Kind.NUMERIC_LITERAL, Kind.COMPUTED_PROPERTY_NAME)) {
          newStack.pop();
        }
      }
      if (!(property instanceof MethodDeclarationTree)) {
        newStack.pop();
      }
    }
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

  public boolean isEmpty() {
    return stack.isEmpty();
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

  // if n == 0 returns peek
  public SymbolicValue peek(int n) {
    Preconditions.checkArgument(n < stack.size());

    Iterator<SymbolicValue> iterator = stack.iterator();
    int i = 0;
    while (i < n) {
      iterator.next();
      i++;
    }

    return iterator.next();
  }

  private static void pushUnknown(Deque<SymbolicValue> newStack) {
    newStack.push(UnknownSymbolicValue.UNKNOWN);
  }

  public ExpressionStack removeLastValue() {
    Deque<SymbolicValue> newStack = copy();
    newStack.pop();
    return new ExpressionStack(newStack);
  }

  @Override
  public String toString() {
    return stack.toString();
  }

}
