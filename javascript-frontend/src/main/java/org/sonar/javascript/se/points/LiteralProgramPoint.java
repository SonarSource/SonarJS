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
package org.sonar.javascript.se.points;

import java.util.Deque;
import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ExpressionStack;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.LiteralSymbolicValue;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateLiteralTree;

public class LiteralProgramPoint implements ProgramPoint {

  private Tree tree;

  public LiteralProgramPoint(Tree tree) {
    this.tree = tree;
  }

  public static boolean originatesFrom(Tree element) {
    return isUndefined(element) || element.is(KindSet.LITERAL_KINDS);
  }

  @Override
  public Optional<ProgramState> execute(ProgramState state) {
    ExpressionStack stack = state.getStack();

    ExpressionStack stackAfterExecution = stack.apply(newStack -> {
      SymbolicValue value = SpecialSymbolicValue.UNDEFINED;

      if (tree.is(Kind.NULL_LITERAL)) {
        value = SpecialSymbolicValue.NULL;

      } else if (tree.is(Kind.NUMERIC_LITERAL, Kind.STRING_LITERAL, Kind.BOOLEAN_LITERAL, Kind.REGULAR_EXPRESSION_LITERAL)) {
        value = LiteralSymbolicValue.get((LiteralTree) tree);

      } else if (tree.is(Kind.ARRAY_LITERAL)) {
        pop(newStack, ((ArrayLiteralTree) tree).elements().size());
        value = new SymbolicValueWithConstraint(Constraint.ARRAY);

      } else if (tree.is(Kind.OBJECT_LITERAL)) {
        popObjectLiteralProperties(newStack, (ObjectLiteralTree) tree);
        value = new SymbolicValueWithConstraint(Constraint.OTHER_OBJECT);

      } else if (tree.is(Kind.TEMPLATE_LITERAL)) {
        pop(newStack, ((TemplateLiteralTree) tree).expressions().size());
        value = new SymbolicValueWithConstraint(Constraint.STRING_PRIMITIVE);

      }

      newStack.push(value);
    });

    return Optional.of(state.withStack(stackAfterExecution));
  }

  static boolean isUndefined(Tree element) {
    return element.is(Kind.IDENTIFIER_REFERENCE) && "undefined".equals(((IdentifierTree) element).name());
  }

  private static void pop(Deque<SymbolicValue> newStack, int n) {
    for (int i = 0; i < n; i++) {
      newStack.pop();
    }
  }

  private static void popObjectLiteralProperties(Deque<SymbolicValue> newStack, ObjectLiteralTree objectLiteralTree) {
    for (Tree property : objectLiteralTree.properties()) {
      if (property.is(Kind.PAIR_PROPERTY)) {
        Tree key = ((PairPropertyTree) property).key();
        if (key.is(Kind.STRING_LITERAL, Kind.NUMERIC_LITERAL, Kind.COMPUTED_PROPERTY_NAME)) {
          newStack.pop();
        }
      }
      if (!property.is(Kind.GENERATOR_METHOD, Kind.METHOD, Kind.SET_METHOD, Kind.GET_METHOD)) {
        newStack.pop();
      }
    }
  }
}
