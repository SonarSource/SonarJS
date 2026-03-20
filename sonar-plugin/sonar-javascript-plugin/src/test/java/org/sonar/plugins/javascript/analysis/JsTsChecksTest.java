/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.rule.RuleKey;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
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
  void should_initialize_all_builtin_checks_with_default_rule_properties() {
    JsTsChecks checks = new JsTsChecks(buildCheckFactoryWithParameters(Map.of()));
    assertThat(checks.all()).hasSize(expectedBuiltinRuleCount());
  }

  @Test
  void should_initialize_all_builtin_checks_with_legacy_rule_properties() {
    JsTsChecks checks = new JsTsChecks(buildCheckFactoryWithParameters(legacyParameters()));
    assertThat(checks.all()).hasSize(expectedBuiltinRuleCount());
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

  private static CheckFactory buildCheckFactoryWithParameters(
    Map<RuleKey, Map<String, String>> parameterOverrides
  ) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    addActiveRules(
      builder,
      CheckList.JS_REPOSITORY_KEY,
      CheckList.getJavaScriptChecks(),
      parameterOverrides
    );
    addActiveRules(
      builder,
      CheckList.TS_REPOSITORY_KEY,
      CheckList.getTypeScriptChecks(),
      parameterOverrides
    );
    return new CheckFactory(builder.build());
  }

  private static void addActiveRules(
    ActiveRulesBuilder builder,
    String repositoryKey,
    List<Class<? extends EslintHook>> checkClasses,
    Map<RuleKey, Map<String, String>> parameterOverrides
  ) {
    for (var checkClass : checkClasses) {
      Rule rule = checkClass.getAnnotation(Rule.class);
      if (rule == null) {
        continue;
      }
      RuleKey ruleKey = RuleKey.of(repositoryKey, rule.key());
      NewActiveRule.Builder activeRule = new NewActiveRule.Builder().setRuleKey(ruleKey);
      Map<String, String> ruleOverrides = parameterOverrides.getOrDefault(ruleKey, Map.of());
      for (var field : checkClass.getDeclaredFields()) {
        RuleProperty ruleProperty = field.getAnnotation(RuleProperty.class);
        if (ruleProperty != null) {
          if (ruleOverrides.containsKey(ruleProperty.key())) {
            continue;
          }
          activeRule.setParam(ruleProperty.key(), ruleProperty.defaultValue());
        }
      }
      ruleOverrides.forEach(activeRule::setParam);
      builder.addRule(activeRule.build());
    }
  }

  private static Map<RuleKey, Map<String, String>> legacyParameters() {
    return Map.of(
      RuleKey.of(CheckList.JS_REPOSITORY_KEY, "S6418"),
      Map.of("randomnessSensibility", "5.0"),
      RuleKey.of(CheckList.TS_REPOSITORY_KEY, "S6418"),
      Map.of("randomnessSensibility", "5.0")
    );
  }

  private static int expectedBuiltinRuleCount() {
    return CheckList.getJavaScriptChecks().size() + CheckList.getTypeScriptChecks().size();
  }
}
