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

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.api.CustomRuleRepository.Language.JAVASCRIPT;

import org.junit.jupiter.api.Test;
import org.sonar.api.rule.RuleKey;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.TestUtils;
import org.sonar.plugins.javascript.api.CustomRuleRepository;

class JavaScriptChecksTest {

  @Test
  void should_detect_unknown_rule_key() throws Exception {
    JsTsChecks checks = new JsTsChecks(
      TestUtils.checkFactory(CheckList.JS_REPOSITORY_KEY, "S3923")
    );

    assertThat(checks.ruleKeyByEslintKey("no-all-duplicated-branches", JAVASCRIPT))
      .isEqualTo(RuleKey.of("javascript", "S3923"));
    assertThat(checks.ruleKeyByEslintKey("unknown-rule-key", JAVASCRIPT)).isNull();
  }
}
