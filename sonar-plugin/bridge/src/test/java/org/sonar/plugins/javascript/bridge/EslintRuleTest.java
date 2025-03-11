/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.sonar.plugins.javascript.bridge.EslintRule.findFirstRuleWithKey;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.api.AnalysisMode;

class EslintRuleTest {

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
      new EslintRule(
        "key",
        List.of(),
        List.of(InputFile.Type.MAIN),
        singletonList(AnalysisMode.DEFAULT),
        emptyList(),
        "invalid"
      )
    ).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void getters() {
    var rule = new EslintRule(
      "key",
      List.of(),
      List.of(InputFile.Type.MAIN),
      singletonList(AnalysisMode.DEFAULT),
      emptyList(),
      "js"
    );
    assertThat(rule.getKey()).isEqualTo("key");
    assertThat(rule.getConfigurations()).isEmpty();
    assertThat(rule.getAnalysisModes()).containsExactly(AnalysisMode.DEFAULT);
  }

  private static List<EslintRule> rules(String... keys) {
    return Arrays.stream(keys)
      .map(key ->
        new EslintRule(
          key,
          emptyList(),
          emptyList(),
          singletonList(AnalysisMode.DEFAULT),
          emptyList(),
          "js"
        )
      )
      .toList();
  }
}
