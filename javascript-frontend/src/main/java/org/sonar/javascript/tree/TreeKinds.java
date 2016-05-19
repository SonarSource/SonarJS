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
package org.sonar.javascript.tree;

import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

public class TreeKinds {

  private static final Kind[] ASSIGNMENT_KINDS = {
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
    Kind.OR_ASSIGNMENT
  };

  private static final Kind[] INC_DEC_KINDS = {
    Tree.Kind.POSTFIX_INCREMENT,
    Tree.Kind.PREFIX_INCREMENT,
    Tree.Kind.POSTFIX_DECREMENT,
    Tree.Kind.PREFIX_DECREMENT
  };

  private TreeKinds() {
    // This class has only static methods
  }

  public static boolean isAssignment(Tree tree) {
    return tree.is(ASSIGNMENT_KINDS);
  }

  public static boolean isIncrementOrDecrement(Tree tree) {
    return tree.is(INC_DEC_KINDS);
  }

}
