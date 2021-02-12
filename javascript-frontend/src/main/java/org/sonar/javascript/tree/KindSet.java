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
package org.sonar.javascript.tree;

import com.google.common.collect.ImmutableSet;
import java.util.Arrays;
import java.util.Set;
import org.sonar.plugins.javascript.api.tree.Kinds;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

public enum KindSet implements Kinds {

  ASSIGNMENT_KINDS(
    Kind.ASSIGNMENT,
    Kind.EXPONENT_ASSIGNMENT,
    Kind.MULTIPLY_ASSIGNMENT,
    Kind.DIVIDE_ASSIGNMENT,
    Kind.REMAINDER_ASSIGNMENT,
    Kind.PLUS_ASSIGNMENT,
    Kind.MINUS_ASSIGNMENT,
    Kind.LEFT_SHIFT_ASSIGNMENT,
    Kind.RIGHT_SHIFT_ASSIGNMENT,
    Kind.UNSIGNED_RIGHT_SHIFT_ASSIGNMENT,
    Kind.AND_ASSIGNMENT,
    Kind.XOR_ASSIGNMENT,
    Kind.OR_ASSIGNMENT),

  INC_DEC_KINDS(
    Tree.Kind.POSTFIX_INCREMENT,
    Tree.Kind.PREFIX_INCREMENT,
    Tree.Kind.POSTFIX_DECREMENT,
    Tree.Kind.PREFIX_DECREMENT),

  EQUALITY_KINDS(
    Kind.EQUAL_TO,
    Kind.STRICT_EQUAL_TO,
    Kind.NOT_EQUAL_TO,
    Kind.STRICT_NOT_EQUAL_TO),

  COMPARISON_KINDS(
    Kind.GREATER_THAN,
    Kind.GREATER_THAN_OR_EQUAL_TO,
    Kind.LESS_THAN,
    Kind.LESS_THAN_OR_EQUAL_TO),

  FUNCTION_KINDS(
    Kind.FUNCTION_DECLARATION,
    Kind.FUNCTION_EXPRESSION,
    Kind.METHOD,
    Kind.GENERATOR_METHOD,
    Kind.GENERATOR_FUNCTION_EXPRESSION,
    Kind.GENERATOR_DECLARATION,
    Kind.GET_METHOD,
    Kind.SET_METHOD,
    Kind.ARROW_FUNCTION),

  LOOP_KINDS(
    Kind.DO_WHILE_STATEMENT,
    Kind.WHILE_STATEMENT,
    Kind.FOR_IN_STATEMENT,
    Kind.FOR_OF_STATEMENT,
    Kind.FOR_STATEMENT),

  LITERAL_KINDS(
    Kind.NULL_LITERAL,
    Kind.NUMERIC_LITERAL,
    Kind.STRING_LITERAL,
    Kind.BOOLEAN_LITERAL,
    Kind.REGULAR_EXPRESSION_LITERAL,
    Kind.TEMPLATE_LITERAL,
    Kind.ARRAY_LITERAL,
    Kind.OBJECT_LITERAL);

  private Set<Kind> subKinds;

  KindSet(Kind... kinds) {
    subKinds = ImmutableSet.copyOf(Arrays.asList(kinds));
  }

  public Set<Kind> getSubKinds() {
    return subKinds;
  }

  @Override
  public boolean contains(Kinds other) {
    return this.equals(other) || (other instanceof Kind && subKinds.contains(other));
  }

}
