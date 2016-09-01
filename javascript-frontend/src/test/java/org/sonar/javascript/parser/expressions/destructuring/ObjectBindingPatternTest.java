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
package org.sonar.javascript.parser.expressions.destructuring;

import org.junit.Test;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class ObjectBindingPatternTest {


  @Test
  public void test() {
    assertThat(Kind.OBJECT_BINDING_PATTERN)
      .matches("{ }")
      .matches("{ identifier }")
      .matches("{ identifier = init() }")
      .matches("{ identifier : identifier}")
      .matches("{ identifier , identifier }")
      .matches("{ identifier , }")
      .matches("{ identifier , ... restId }")
      .matches("{ identifier1 , identifier2, ... restId }")
      .matches("{ ... restId }")

      .notMatches("{ identifier , ... restId , }")
      .notMatches("{ identifier , , identifier }")
      .notMatches("{ identifier , identifier , , }")
      .notMatches("{ identifier1 , ... restId , identifier2 }")
    ;
  }

}
