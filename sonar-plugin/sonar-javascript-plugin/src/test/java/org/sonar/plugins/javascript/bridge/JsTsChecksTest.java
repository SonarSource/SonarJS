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
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.TestUtils.checkFactory;
import static org.sonar.plugins.javascript.api.CustomRuleRepository.Language.JAVASCRIPT;
import static org.sonar.plugins.javascript.api.CustomRuleRepository.Language.TYPESCRIPT;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.sonar.api.rule.RuleKey;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;
import org.sonar.plugins.javascript.bridge.JsTsChecks;

class JsTsChecksTest {

  @Test
  void test() {
    JsTsChecks checks = new JsTsChecks(checkFactory(CheckList.TS_REPOSITORY_KEY, "S3923"));

    assertThat(checks.ruleKeyByEslintKey("no-all-duplicated-branches", TYPESCRIPT))
      .isEqualTo(RuleKey.of("typescript", "S3923"));
    assertThat(checks.ruleKeyByEslintKey("unknown-rule-key", JAVASCRIPT)).isNull();
  }

  @Test
  void should_add_custom_check() {
    JsTsChecks checks = new JsTsChecks(
      checkFactory("repo", "customcheck"),
      new CustomRuleRepository[] { new TsRepository(), new JsRepository() }
    );
    assertThat(checks.eslintBasedChecks()).hasSize(1);
    assertThat(checks.ruleKeyByEslintKey("key", TYPESCRIPT))
      .isEqualTo(RuleKey.parse("repo:customcheck"));
  }

  @Test
  void should_add_custom_active_checks() {
    JsTsChecks checks = new JsTsChecks(
      checkFactory(
        List.of(RuleKey.of("repo", "customcheck"), RuleKey.of("js-repo", "customcheck"))
      ),
      new CustomRuleRepository[] { new TsRepository(), new JsRepository() }
    );
    assertThat(checks.eslintBasedChecks()).hasSize(2);
    assertThat(checks.ruleKeyByEslintKey("key", JAVASCRIPT))
      .isEqualTo(RuleKey.parse("js-repo:customcheck"));
    assertThat(checks.ruleKeyByEslintKey("key", TYPESCRIPT))
      .isEqualTo(RuleKey.parse("repo:customcheck"));
  }

  @Test
  void test_equals() {
    var js1 = new JsTsChecks.LanguageAndRepository(JAVASCRIPT, "javascript");
    var js2 = new JsTsChecks.LanguageAndRepository(JAVASCRIPT, "javascript");
    var js3 = new JsTsChecks.LanguageAndRepository(JAVASCRIPT, "custom");
    var ts = new JsTsChecks.LanguageAndRepository(TYPESCRIPT, "typescript");
    assertThat(js1.equals(js1)).isTrue();
    assertThat(js1.equals(js2)).isTrue();
    assertThat(js1.equals(null)).isFalse();
    assertThat(js1.equals(js3)).isFalse();
    assertThat(js1.equals(ts)).isFalse();
    assertThat(js1.hashCode() == js2.hashCode()).isTrue();
    assertThat(js1).hasToString("language='js', repository='javascript'");
  }

  public static class TsRepository implements CustomRuleRepository {

    @Override
    public Set<Language> languages() {
      return EnumSet.of(TYPESCRIPT);
    }

    @Override
    public String repositoryKey() {
      return "repo";
    }

    @Override
    public List<Class<? extends JavaScriptCheck>> checkClasses() {
      return Collections.singletonList(CustomTsCheck.class);
    }
  }

  public static class JsRepository implements CustomRuleRepository {

    @Override
    public String repositoryKey() {
      return "js-repo";
    }

    @Override
    public List<Class<? extends JavaScriptCheck>> checkClasses() {
      return Collections.singletonList(CustomTsCheck.class);
    }
  }

  @TypeScriptRule
  @JavaScriptRule
  @Rule(key = "customcheck")
  public static class CustomTsCheck implements EslintBasedCheck {

    @Override
    public String eslintKey() {
      return "key";
    }
  }
}
