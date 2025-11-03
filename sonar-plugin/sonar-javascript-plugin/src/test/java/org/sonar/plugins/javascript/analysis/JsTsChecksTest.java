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
package org.sonar.plugins.javascript.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.TestUtils.checkFactory;
import static org.sonar.plugins.javascript.api.Language.JAVASCRIPT;
import static org.sonar.plugins.javascript.api.Language.TYPESCRIPT;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.sonar.api.rule.RuleKey;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.checks.MainFileCheck;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.EslintHook;
import org.sonar.plugins.javascript.api.EslintHookRegistrar;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.Language;
import org.sonar.plugins.javascript.api.TypeScriptRule;

class JsTsChecksTest {

  @Test
  void test() {
    JsTsChecks checks = new JsTsChecks(checkFactory(CheckList.TS_REPOSITORY_KEY, "S3923"));

    assertThat(checks.ruleKeyByEslintKey("S3923", TYPESCRIPT)).isEqualTo(
      RuleKey.of("typescript", "S3923")
    );
    assertThat(checks.ruleKeyByEslintKey("unknown-rule-key", JAVASCRIPT)).isNull();
  }

  @Test
  void should_add_custom_check() {
    JsTsChecks checks = new JsTsChecks(
      checkFactory("repo", "customcheck"),
      new CustomRuleRepository[] { new TsRepository(), new JsRepository() }
    );
    assertThat(checks.all()).hasSize(1);
    assertThat(checks.ruleKeyByEslintKey("customcheck", TYPESCRIPT)).isEqualTo(
      RuleKey.parse("repo:customcheck")
    );
  }

  @Test
  void should_invoke_eslint_hook() {
    var hook = new TestEslintHook();

    JsTsChecks checks = new JsTsChecks(
      checkFactory("repo", "customcheck"),
      new EslintHookRegistrar[] { hook }
    );
    assertThat(hook.isRegisterCalled).isTrue();
    assertThat(hook.isIsEnabledCalled).isFalse();
    checks.enabledEslintRules();
    assertThat(hook.isIsEnabledCalled).isTrue();
  }

  private static class TestEslintHook implements EslintHook, EslintHookRegistrar {

    public boolean isIsEnabledCalled = false;
    public boolean isRegisterCalled = false;

    @Override
    public String eslintKey() {
      return "test-hook";
    }

    @Override
    public boolean isEnabled() {
      isIsEnabledCalled = true;
      return true;
    }

    @Override
    public void register(RegistrarContext registrarContext) {
      isRegisterCalled = true;
      registrarContext.registerEslintHook(JAVASCRIPT, this);
    }
  }

  @Test
  void should_add_custom_active_checks() {
    JsTsChecks checks = new JsTsChecks(
      checkFactory(
        List.of(RuleKey.of("repo", "customcheck"), RuleKey.of("js-repo", "customcheck"))
      ),
      new CustomRuleRepository[] { new TsRepository(), new JsRepository() }
    );
    assertThat(checks.all()).hasSize(2);
    assertThat(checks.ruleKeyByEslintKey("customcheck", JAVASCRIPT)).isEqualTo(
      RuleKey.parse("js-repo:customcheck")
    );
    assertThat(checks.ruleKeyByEslintKey("customcheck", TYPESCRIPT)).isEqualTo(
      RuleKey.parse("repo:customcheck")
    );
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
    public Set<Language> compatibleLanguages() {
      return EnumSet.of(TYPESCRIPT);
    }

    @Override
    public String repositoryKey() {
      return "repo";
    }

    @Override
    public List<Class<? extends EslintHook>> checkClasses() {
      return Collections.singletonList(CustomTsCheck.class);
    }
  }

  public static class JsRepository implements CustomRuleRepository {

    @Override
    public String repositoryKey() {
      return "js-repo";
    }

    @Override
    public List<Class<? extends EslintHook>> checkClasses() {
      return Collections.singletonList(CustomTsCheck.class);
    }
  }

  @TypeScriptRule
  @JavaScriptRule
  @Rule(key = "customcheck")
  public static class CustomTsCheck extends MainFileCheck {}
}
