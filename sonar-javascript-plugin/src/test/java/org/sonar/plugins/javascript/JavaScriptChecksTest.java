/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.plugins.javascript;

import com.google.common.collect.ImmutableList;
import java.util.List;
import org.junit.Test;
import org.sonar.api.rule.RuleKey;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptCheck;

import static org.assertj.core.api.Assertions.assertThat;

public class JavaScriptChecksTest {

  static CustomRuleRepository eslintCheckRepository = new CustomRuleRepository() {
    @Override
    public String repositoryKey() {
      return "javascript";
    }

    @Override
    public List<Class<? extends JavaScriptCheck>> checkClasses() {
      return ImmutableList.of(EslintCheck.class);
    }
  };

  static CustomRuleRepository legacyCheckRepository = new CustomRuleRepository() {
    @Override
    public String repositoryKey() {
      return "javascript";
    }

    @Override
    public List<Class<? extends JavaScriptCheck>> checkClasses() {
      return ImmutableList.of(JavaScriptSensorTest.OctalNumberCheck.class, EslintCheck.class);
    }
  };

  @Test
  public void should_detect_unknown_rule_key() throws Exception {
    JavaScriptChecks checks = new JavaScriptChecks(TestUtils.checkFactory(CheckList.JS_REPOSITORY_KEY, "S3923"));

    assertThat(checks.ruleKeyByEslintKey("no-all-duplicated-branches")).isEqualTo(RuleKey.of("javascript", "S3923"));
    assertThat(checks.ruleKeyByEslintKey("unknown-rule-key")).isNull();
  }

  @Test
  public void test_has_custom_checks() throws Exception {
    JavaScriptChecks checks = new JavaScriptChecks(TestUtils.checkFactory(CheckList.JS_REPOSITORY_KEY, "S3923"));
    assertThat(checks.hasLegacyCustomChecks()).isFalse();

    checks = new JavaScriptChecks(TestUtils.checkFactory(CheckList.JS_REPOSITORY_KEY, "S3923"), JavaScriptSensorTest.OctalNumberCheck.repository());
    assertThat(checks.hasLegacyCustomChecks()).isTrue();

    checks = new JavaScriptChecks(TestUtils.checkFactory(CheckList.JS_REPOSITORY_KEY, "S3923"), new CustomRuleRepository[] {eslintCheckRepository, eslintCheckRepository});
    assertThat(checks.hasLegacyCustomChecks()).isFalse();

    // various combinations to complete coverage
    checks = new JavaScriptChecks(TestUtils.checkFactory(CheckList.JS_REPOSITORY_KEY, "S3923"), new CustomRuleRepository[] {eslintCheckRepository, legacyCheckRepository});
    assertThat(checks.hasLegacyCustomChecks()).isTrue();

    checks = new JavaScriptChecks(TestUtils.checkFactory(CheckList.JS_REPOSITORY_KEY, "S3923"), new CustomRuleRepository[] {legacyCheckRepository, legacyCheckRepository});
    assertThat(checks.hasLegacyCustomChecks()).isTrue();
  }

  static class EslintCheck implements EslintBasedCheck {

    @Override
    public String eslintKey() {
      return "xxx";
    }
  }

}
