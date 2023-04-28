/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import static java.util.Collections.emptyList;
import static java.util.stream.Collectors.toList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.sonar.plugins.javascript.eslint.EslintRule.containsRuleWithKey;
import static org.sonar.plugins.javascript.eslint.EslintRule.findFirstRuleWithKey;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.JavaScriptLanguage;

class EslintRuleTest {

  @Test
  void should_search_rules() {
    assertThat(containsRuleWithKey(rules(), "key1")).isFalse();
    assertThat(containsRuleWithKey(rules("key1"), "key1")).isTrue();
    assertThat(containsRuleWithKey(rules("key1", "key2"), "key3")).isFalse();
  }

  @Test
  void should_find_first_rule() {
    assertThat(findFirstRuleWithKey(rules(), "key1")).isNull();
    assertThat(findFirstRuleWithKey(rules("key1"), "key1")).isNotNull();
    assertThat(findFirstRuleWithKey(rules("key1", "key2"), "key3")).isNull();
  }

  @Test
  void should_convert_to_string() {
    assertThat(rules("key1")).extracting(EslintRule::toString).contains("key1");
  }

  @Test
  void should_throw_when_invalid_lang() {
    assertThatThrownBy(() ->
        new EslintRule("key", List.of(), List.of(InputFile.Type.MAIN), "invalid")
      )
      .isInstanceOf(IllegalArgumentException.class);
  }

  private static List<EslintRule> rules(String... keys) {
    return Arrays
      .stream(keys)
      .map(key -> new EslintRule(key, emptyList(), emptyList(), JavaScriptLanguage.KEY))
      .collect(toList());
  }
}
