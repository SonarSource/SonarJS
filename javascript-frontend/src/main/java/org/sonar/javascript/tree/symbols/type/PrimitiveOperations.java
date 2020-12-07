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
package org.sonar.javascript.tree.symbols.type;

import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;

public class PrimitiveOperations {

  private static Map<OperationKey, Type> binaryOperationsResults = new HashMap<>();

  static {
    // +
    put(Kind.NUMBER, Kind.NUMBER, Tree.Kind.PLUS, PrimitiveType.NUMBER);
    put(Kind.STRING, Kind.NUMBER, Tree.Kind.PLUS, PrimitiveType.STRING);
    put(Kind.NUMBER, Kind.STRING, Tree.Kind.PLUS, PrimitiveType.STRING);
    put(Kind.STRING, Kind.STRING, Tree.Kind.PLUS, PrimitiveType.STRING);

    // &&
    put(Kind.STRING, Kind.STRING, Tree.Kind.CONDITIONAL_AND, PrimitiveType.STRING);
    put(Kind.NUMBER, Kind.NUMBER, Tree.Kind.CONDITIONAL_AND, PrimitiveType.NUMBER);
    put(Kind.BOOLEAN, Kind.BOOLEAN, Tree.Kind.CONDITIONAL_AND, PrimitiveType.BOOLEAN);

    // ||
    put(Kind.STRING, Kind.STRING, Tree.Kind.CONDITIONAL_OR, PrimitiveType.STRING);
    put(Kind.NUMBER, Kind.NUMBER, Tree.Kind.CONDITIONAL_OR, PrimitiveType.NUMBER);
    put(Kind.BOOLEAN, Kind.BOOLEAN, Tree.Kind.CONDITIONAL_OR, PrimitiveType.BOOLEAN);

  }

  private static final EnumSet<Tree.Kind> COMPARATIVE_OPERATORS = EnumSet.of(
    Tree.Kind.LESS_THAN,
    Tree.Kind.GREATER_THAN,
    Tree.Kind.LESS_THAN_OR_EQUAL_TO,
    Tree.Kind.GREATER_THAN_OR_EQUAL_TO,
    Tree.Kind.EQUAL_TO,
    Tree.Kind.NOT_EQUAL_TO,
    Tree.Kind.STRICT_EQUAL_TO,
    Tree.Kind.STRICT_NOT_EQUAL_TO
  );

  private static final EnumSet<Tree.Kind> ARITHMETIC_OPERATORS = EnumSet.of(
    Tree.Kind.MINUS,
    Tree.Kind.MULTIPLY,
    Tree.Kind.DIVIDE,
    Tree.Kind.REMAINDER
  );

  private static final EnumSet<Tree.Kind> NUMBER_UNARY_OPERATORS = EnumSet.of(
    Tree.Kind.PREFIX_DECREMENT,
    Tree.Kind.PREFIX_INCREMENT,
    Tree.Kind.POSTFIX_DECREMENT,
    Tree.Kind.POSTFIX_INCREMENT,
    Tree.Kind.UNARY_MINUS,
    Tree.Kind.UNARY_PLUS,
    Tree.Kind.BITWISE_COMPLEMENT
  );

  private PrimitiveOperations() {
  }

  private static void put(Type.Kind leftOperandType, Type.Kind rightOperandType, Tree.Kind operation, Type result) {
    binaryOperationsResults.put(new OperationKey(leftOperandType, rightOperandType, operation), result);
  }

  @Nullable
  static Type getType(ExpressionTree leftOperand, ExpressionTree rightOperand, Tree.Kind operationKind) {
    if (COMPARATIVE_OPERATORS.contains(operationKind)) {
      return PrimitiveType.BOOLEAN;

    } else if (ARITHMETIC_OPERATORS.contains(operationKind)) {
      return PrimitiveType.NUMBER;

    } else {
      return getType(leftOperand.types().getUniqueKnownType(), rightOperand.types().getUniqueKnownType(), operationKind);
    }
  }

  @Nullable
  static Type getType(UnaryExpressionTree expressionTree) {
    Tree.Kind kind = ((JavaScriptTree) expressionTree).getKind();
    if (NUMBER_UNARY_OPERATORS.contains(kind)) {
      return PrimitiveType.NUMBER;

    } else if (expressionTree.is(Tree.Kind.TYPEOF)) {
      return PrimitiveType.STRING;

    } else if (expressionTree.is(Tree.Kind.DELETE, Tree.Kind.LOGICAL_COMPLEMENT)) {
      return PrimitiveType.BOOLEAN;
    }

    return null;
  }

  @Nullable
  static Type getType(@Nullable Type leftOperandType, @Nullable Type rightOperandType, Tree.Kind operationKind) {
    if (leftOperandType != null && rightOperandType != null) {
      return binaryOperationsResults.get(new OperationKey(leftOperandType.kind(), rightOperandType.kind(), operationKind));
    }
    return null;
  }


  private static class OperationKey {
    Type.Kind leftOperandType;
    Type.Kind rightOperandType;
    Tree.Kind operation;

    public OperationKey(Type.Kind leftOperandType, Type.Kind rightOperandType, Tree.Kind operation) {
      this.leftOperandType = leftOperandType;
      this.rightOperandType = rightOperandType;
      this.operation = operation;
    }

    @Override
    public boolean equals(@Nullable Object o) {
      if (this == o) {
        return true;
      }
      if (o == null || getClass() != o.getClass()) {
        return false;
      }

      OperationKey that = (OperationKey) o;
      return leftOperandType == that.leftOperandType && rightOperandType == that.rightOperandType && operation == that.operation;
    }

    @Override
    public int hashCode() {
      int result = leftOperandType.hashCode();
      result = 31 * result + rightOperandType.hashCode();
      result = 31 * result + operation.hashCode();
      return result;
    }
  }

}
