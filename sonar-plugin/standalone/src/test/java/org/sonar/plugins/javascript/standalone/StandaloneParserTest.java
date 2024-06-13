/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.standalone;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.api.estree.ESTree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.sonar.plugins.javascript.api.estree.ESTree.Program;

class StandaloneParserTest {

  private static StandaloneParser parser;

  @BeforeAll
  static void setUp() {
    parser = new StandaloneParser();
  }

  @AfterAll
  static void tearDown() {
    parser.close();
  }

  @Test
  void should_parse_multiple_time() {
    Program firstSample = parser.parse("var a = 42;");
    assertThat(firstSample.body()).hasSize(1);
    var firstElement = firstSample.body().get(0);
    assertThat(firstElement).isInstanceOfSatisfying(ESTree.VariableDeclaration.class, v -> {
      assertThat(v.declarations()).hasSize(1);
      var declaration = v.declarations().get(0);
      assertThat(declaration).isInstanceOfSatisfying(ESTree.VariableDeclarator.class, d -> {
        assertThat(d.id()).isInstanceOfSatisfying(ESTree.Identifier.class, i -> assertThat(i.name()).isEqualTo("a"));
        assertThat(d.init().get()).isInstanceOfSatisfying(ESTree.SimpleLiteral.class, l -> assertThat(l.value()).isEqualTo(42));
      });
    });
    Program secondSample = parser.parse("let x;");
    assertThat(secondSample.body()).hasSize(1);
  }

  @Test
  void should_throw_exception_when_fail_to_parse_code() {
    assertThatThrownBy(() -> parser.parse("..."))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Failed to parse the code");
  }

}
