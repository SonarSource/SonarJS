/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
  void should_unescape_known_sequences() {
    String plainText = "foo";
    assertThat(EscapeUtils.unescape(plainText)).isSameAs(plainText);
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

  @Test
  void should_preserve_incomplete_or_invalid_escape_sequences() {
    assertThat(EscapeUtils.unescape("\\")).isEqualTo("\\");
    assertThat(EscapeUtils.unescape("foo\\")).isEqualTo("foo\\");
    assertThat(EscapeUtils.unescape("\\u00")).isEqualTo("\\u00");
    assertThat(EscapeUtils.unescape("\\x0")).isEqualTo("\\x0");
    assertThat(EscapeUtils.unescape("\\u00GG")).isEqualTo("\\u00GG");
    assertThat(EscapeUtils.unescape("\\xGG")).isEqualTo("\\xGG");
  }
}
