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
package org.sonar.plugins.javascript.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.api.CustomRuleRepository.Language.JAVASCRIPT;

import org.junit.jupiter.api.Test;
import org.sonar.api.rule.RuleKey;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.TestUtils;

class JavaScriptChecksTest {

  @Test
  void should_detect_unknown_rule_key() throws Exception {
    JsTsChecks checks = new JsTsChecks(
      TestUtils.checkFactory(CheckList.JS_REPOSITORY_KEY, "S3923")
    );

    assertThat(checks.ruleKeyByEslintKey("S3923", JAVASCRIPT))
      .isEqualTo(RuleKey.of("javascript", "S3923"));
    assertThat(checks.ruleKeyByEslintKey("unknown-rule-key", JAVASCRIPT)).isNull();
  }
}
