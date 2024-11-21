/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.javascript.checks;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EscapeUtilsTest {

  @Test
  void test() {
    assertThat(EscapeUtils.unescape("foo")).isEqualTo("foo");
    assertThat(EscapeUtils.unescape("\\u000B")).isEqualTo("\u000B");
    assertThat(EscapeUtils.unescape("\\x0B")).isEqualTo("\u000B");

    assertThat(EscapeUtils.unescape("\\b")).isEqualTo("\b");
    assertThat(EscapeUtils.unescape("\\t")).isEqualTo("\t");
    assertThat(EscapeUtils.unescape("\\n")).isEqualTo("\n");
    assertThat(EscapeUtils.unescape("\\v")).isEqualTo("\u000B");
    assertThat(EscapeUtils.unescape("\\f")).isEqualTo("\f");
    assertThat(EscapeUtils.unescape("\\r")).isEqualTo("\r");
    assertThat(EscapeUtils.unescape("\\\"")).isEqualTo("\"");
    assertThat(EscapeUtils.unescape("\\\'")).isEqualTo("\'");
    assertThat(EscapeUtils.unescape("\\\\")).isEqualTo("\\");
    assertThat(EscapeUtils.unescape("\\|")).isEqualTo("|");
  }
}
