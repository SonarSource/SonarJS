/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.se;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import java.util.ArrayList;
import java.util.Deque;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.se.sv.FunctionSymbolicValue;
import org.sonar.javascript.se.sv.FunctionWithTreeSymbolicValue;
import org.sonar.javascript.se.sv.InstanceOfSymbolicValue;
import org.sonar.javascript.se.sv.LogicalNotSymbolicValue;
import org.sonar.javascript.se.sv.RelationalSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.se.sv.TypeOfSymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;

/**
 * This class stores the stack of symbolic values corresponding to the order of expression evaluation.
 * Each {@link ProgramState} has corresponding instance of {@link ExpressionStack}.
 * Note that this class is immutable.
 */
public class ExpressionStack {

  private static final ExpressionStack EMPTY = new ExpressionStack();

  private final Deque<SymbolicValue> stack;

  private ExpressionStack() {
    this.stack = new LinkedList<>();
  }

  private ExpressionStack(Deque<SymbolicValue> stack) {
    this.stack = stack;
  }

  public static ExpressionStack emptyStack() {
    return EMPTY;
  }

  public ExpressionStack push(SymbolicValue newValue) {
    Deque<SymbolicValue> newStack = copy();
    newStack.push(newValue);
    return new ExpressionStack(newStack);
  }

  /**
   * This method executes expression: it pushes to the stack a new symbolic value based (if required) on popped symbolic values.
   * Note that as {@link ExpressionStack} is an immutable class,
   * this method will return new resulting instance of {@link ExpressionStack} while the calling this method instance will not be changed.
   *
   * @param expression to be executed
   * @param constraints
   * @return resulting {@link ExpressionStack}
   */
  public ExpressionStack execute(ExpressionTree expression, ProgramStateConstraints constraints) {
    Deque<SymbolicValue> newStack = copy();
    Kind kind = ((JavaScriptTree) expression).getKind();
    switch (kind) {
      case LOGICAL_COMPLEMENT:
        SymbolicValue negatedValue = newStack.pop();
        newStack.push(LogicalNotSymbolicValue.create(negatedValue));
        break;
      case TYPEOF:
        newStack.push(new TypeOfSymbolicValue(newStack.pop()));
        break;
      case NEW_EXPRESSION:
        executeNewExpression((NewExpressionTree) expression, newStack);
        break;
      case SPREAD_ELEMENT:
      case VOID:
      case AWAIT:
        pop(newStack, 1);
        pushUnknown(newStack);
        break;
      case DELETE:
        pop(newStack, 1);
        newStack.push(new SymbolicValueWithConstraint(Constraint.BOOLEAN_PRIMITIVE));
        break;
      case YIELD_EXPRESSION:
        if (((YieldExpressionTree) expression).argument() != null) {
          pop(newStack, 1);
        }
        pushUnknown(newStack);
        break;
      case BITWISE_COMPLEMENT:
        pop(newStack, 1);
        newStack.push(new SymbolicValueWithConstraint(Constraint.NUMBER_PRIMITIVE));
        break;
      case CALL_EXPRESSION:
        executeCallExpression((CallExpressionTree) expression, newStack, constraints);
        break;
      case FUNCTION_EXPRESSION:
      case GENERATOR_FUNCTION_EXPRESSION:
      case ARROW_FUNCTION:
        newStack.push(new FunctionWithTreeSymbolicValue((FunctionTree) expression));
        break;
      case THIS:
      case SUPER:
      case IMPORT:
      case NEW_TARGET:
      case JSX_SELF_CLOSING_ELEMENT:
      case JSX_STANDARD_ELEMENT:
      case JSX_SHORT_FRAGMENT_ELEMENT:
      case FLOW_CASTING_EXPRESSION:
        pushUnknown(newStack);
        break;
      case CLASS_EXPRESSION:
        newStack.push(new SymbolicValueWithConstraint(Constraint.OTHER_OBJECT));
        break;
      case EXPONENT_ASSIGNMENT:
      case LEFT_SHIFT_ASSIGNMENT:
      case RIGHT_SHIFT_ASSIGNMENT:
      case UNSIGNED_RIGHT_SHIFT_ASSIGNMENT:
      case AND_ASSIGNMENT:
      case XOR_ASSIGNMENT:
      case OR_ASSIGNMENT:
      case TAGGED_TEMPLATE:
      case EXPONENT:
        pop(newStack, 2);
        pushUnknown(newStack);
        break;
      case RELATIONAL_IN:
        pop(newStack, 2);
        newStack.push(new SymbolicValueWithConstraint(Constraint.BOOLEAN_PRIMITIVE));
        break;
      case INSTANCE_OF:
        SymbolicValue constructorValue = newStack.pop();
        SymbolicValue objectValue = newStack.pop();
        newStack.push(new InstanceOfSymbolicValue(objectValue, constructorValue));
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
      case PLUS_ASSIGNMENT:
      case PLUS:
      case MINUS:
      case DIVIDE:
      case REMAINDER:
      case MULTIPLY:
      case MULTIPLY_ASSIGNMENT:
      case DIVIDE_ASSIGNMENT:
      case REMAINDER_ASSIGNMENT:
      case MINUS_ASSIGNMENT:
      case BITWISE_AND:
      case BITWISE_XOR:
      case BITWISE_OR:
      case LEFT_SHIFT:
      case RIGHT_SHIFT:
      case UNSIGNED_RIGHT_SHIFT:

      case POSTFIX_DECREMENT:
      case POSTFIX_INCREMENT:
      case PREFIX_DECREMENT:
      case PREFIX_INCREMENT:
      case UNARY_MINUS:
      case UNARY_PLUS:

      case PROPERTY_IDENTIFIER:
      case BINDING_IDENTIFIER:
      case CONDITIONAL_AND:
      case CONDITIONAL_OR:
      case CONDITIONAL_EXPRESSION:

      case IDENTIFIER_REFERENCE:

      case NULL_LITERAL:
      case NUMERIC_LITERAL:
      case STRING_LITERAL:
      case BOOLEAN_LITERAL:
      case REGULAR_EXPRESSION_LITERAL:
      case OBJECT_LITERAL:
      case ARRAY_LITERAL:
      case TEMPLATE_LITERAL:
      case BRACKET_MEMBER_EXPRESSION:
      case DOT_MEMBER_EXPRESSION:
        break;
      default:
        throw new IllegalArgumentException("Unexpected kind of expression to execute: " + kind);
    }
    return new ExpressionStack(newStack);
  }

  private static void executeNewExpression(NewExpressionTree newExpressionTree, Deque<SymbolicValue> newStack) {
    int arguments = newExpressionTree.argumentClause() == null ? 0 : newExpressionTree.argumentClause().arguments().size();
    pop(newStack, arguments);
    SymbolicValue constructor = newStack.pop();
    if (constructor instanceof FunctionSymbolicValue) {
      newStack.push(((FunctionSymbolicValue) constructor).instantiate());
    } else {
      newStack.push(new SymbolicValueWithConstraint(Constraint.OBJECT));
    }
  }

  private static void executeCallExpression(CallExpressionTree expression, Deque<SymbolicValue> newStack, ProgramStateConstraints constraints) {
    int argumentsNumber = expression.argumentClause().arguments().size();
    List<SymbolicValue> argumentValues = new ArrayList<>();

    for (int i = 0; i < argumentsNumber; i++) {
      argumentValues.add(newStack.pop());
    }

    argumentValues = Lists.reverse(argumentValues);

    SymbolicValue callee = newStack.pop();
    if (callee instanceof FunctionSymbolicValue) {
      newStack.push(((FunctionSymbolicValue) callee).call(argumentValues));
    } else if (callee instanceof FunctionWithTreeSymbolicValue) {
      FunctionTree functionTreeToExecute = ((FunctionWithTreeSymbolicValue) callee).getFunctionTree();
      if (functionTreeToExecute.body().is(Kind.BLOCK)) {
        runNestedSymbolicExecution(newStack, constraints, argumentValues, functionTreeToExecute);
      } else {
        pushUnknown(newStack);
      }
    } else {
      pushUnknown(newStack);
    }
  }

  private static void runNestedSymbolicExecution(Deque<SymbolicValue> newStack, ProgramStateConstraints constraints, List<SymbolicValue> argumentValues,
    FunctionTree functionTreeToExecute) {
    Scope scopeToExecute = functionTreeToExecute.scope();
    List<Constraint> argumentConstraints = argumentValues.stream().map(constraints::getConstraint).collect(Collectors.toList());
    ControlFlowGraph cfg = ControlFlowGraph.build((BlockTree) functionTreeToExecute.body());
    SymbolicExecution symbolicExecution = new SymbolicExecution(scopeToExecute, cfg, ImmutableList.of(), functionTreeToExecute.asyncToken() != null);
    ProgramState initialProgramState = initialProgramStateWithParameterConstraints(functionTreeToExecute, argumentConstraints);
    symbolicExecution.visitCfg(initialProgramState);
    newStack.push(new SymbolicValueWithConstraint(symbolicExecution.getReturnConstraint()));
  }

  private static ProgramState initialProgramStateWithParameterConstraints(FunctionTree functionTree, List<Constraint> argumentConstraints) {
    ProgramState initialProgramState = ProgramState.emptyState();

    Iterator<Constraint> arguments = argumentConstraints.iterator();
    for (Tree parameter : functionTree.parameterList()) {
      if (!parameter.is(Kind.BINDING_IDENTIFIER)) {
        return ProgramState.emptyState();
      }

      Constraint constraint = arguments.hasNext() ? arguments.next() : Constraint.UNDEFINED;
      // Kind.BINDING_IDENTIFIER always has symbol
      initialProgramState = initialProgramState.newSymbolicValue(((IdentifierTree) parameter).symbol().get(), constraint);
    }

    return initialProgramState;
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
    return apply(Deque::pop);
  }

  /**
   * This method allows to perform one or more operations on a copy of the internal stack.
   * It thus guarantees ExpressionStack immutability.
   *
   * @param action the operation to perform on the internal stack
   * @return a new instance of ExpressionStack containing the copy of the internal stack modified by the operation
   */
  public ExpressionStack apply(Consumer<Deque<SymbolicValue>> action) {
    final Deque<SymbolicValue> newStack = copy();
    action.accept(newStack);
    return new ExpressionStack(newStack);
  }

  @Override
  public String toString() {
    return stack.toString();
  }

}
