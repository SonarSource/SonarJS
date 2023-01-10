/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import com.sonar.plugins.security.api.JsRules;
import java.lang.annotation.Annotation;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.sonar.api.SonarRuntime;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.rule.RuleStatus;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition.BuiltInQualityProfile;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.api.utils.Version;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.rules.JavaScriptRulesDefinition;
import org.sonar.plugins.javascript.rules.TypeScriptRulesDefinition;
import org.sonarsource.analyzer.commons.BuiltInQualityProfileJsonLoader;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.JavaScriptProfilesDefinition.SECURITY_RULES_CLASS_NAME;
import static org.sonar.plugins.javascript.JavaScriptProfilesDefinition.SECURITY_RULE_KEYS_METHOD_NAME;
import static org.sonar.plugins.javascript.JavaScriptProfilesDefinition.SONAR_WAY_JSON;
import static org.sonar.plugins.javascript.JavaScriptProfilesDefinition.getSecurityRuleKeys;

class JavaScriptProfilesDefinitionTest {

  private static final SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarLint(Version.create(9, 3));
  private final BuiltInQualityProfilesDefinition.Context context = new BuiltInQualityProfilesDefinition.Context();
  private final Set<String> deprecatedJsRules =
    TestUtils.buildRepository("javascript", new JavaScriptRulesDefinition(sonarRuntime)).rules().stream()
      .filter(r -> r.status() == RuleStatus.DEPRECATED)
      .map(RulesDefinition.Rule::key)
      .collect(Collectors.toSet());

  private final Set<String> deprecatedTsRules =
    TestUtils.buildRepository("typescript", new TypeScriptRulesDefinition(sonarRuntime)).rules().stream()
      .filter(r -> r.status() == RuleStatus.DEPRECATED)
      .map(RulesDefinition.Rule::key)
      .collect(Collectors.toSet());

  @BeforeEach
  public void setUp() {
    new JavaScriptProfilesDefinition().define(context);
  }

  @Test
  void sonar_way_js() {
    BuiltInQualityProfile profile = context.profile(JavaScriptLanguage.KEY, JavaScriptProfilesDefinition.SONAR_WAY);

    assertThat(profile.language()).isEqualTo(JavaScriptLanguage.KEY);
    assertThat(profile.name()).isEqualTo(JavaScriptProfilesDefinition.SONAR_WAY);
    assertThat(profile.rules()).extracting("repoKey").containsOnly(CheckList.JS_REPOSITORY_KEY);
    assertThat(profile.rules().size()).isGreaterThan(100);

    assertThat(deprecatedRulesInProfile(profile, deprecatedJsRules)).isEmpty();
  }

  private List<String> deprecatedRulesInProfile(BuiltInQualityProfile profile, Set<String> deprecatedRuleKeys) {
    return profile.rules().stream()
      .map(BuiltInQualityProfilesDefinition.BuiltInActiveRule::ruleKey)
      .filter(deprecatedRuleKeys::contains)
      .collect(Collectors.toList());
  }

  @Test
  void sonar_way_ts() {
    BuiltInQualityProfile profile = context.profile(TypeScriptLanguage.KEY, JavaScriptProfilesDefinition.SONAR_WAY);

    assertThat(profile.language()).isEqualTo(TypeScriptLanguage.KEY);
    assertThat(profile.name()).isEqualTo(JavaScriptProfilesDefinition.SONAR_WAY);
    assertThat(profile.rules()).extracting("repoKey").containsOnly(CheckList.TS_REPOSITORY_KEY);
    assertThat(profile.rules().size()).isGreaterThan(100);
    assertThat(profile.rules()).extracting(BuiltInQualityProfilesDefinition.BuiltInActiveRule::ruleKey).contains("S5122");
    assertThat(profile.rules()).extracting(BuiltInQualityProfilesDefinition.BuiltInActiveRule::ruleKey).doesNotContain("S2814");

    assertThat(deprecatedRulesInProfile(profile, deprecatedTsRules)).isEmpty();
  }

  @Test
  void no_legacy_Key_in_profile_json() {
    Set<String> allKeys = CheckList.getAllChecks().stream().map(c -> {
      Annotation ruleAnnotation = c.getAnnotation(Rule.class);
      return ((Rule) ruleAnnotation).key();
    }).collect(Collectors.toSet());

    Set<String> sonarWayKeys = BuiltInQualityProfileJsonLoader.loadActiveKeysFromJsonProfile(SONAR_WAY_JSON);

    assertThat(sonarWayKeys).isSubsetOf(allKeys);
  }

  @Test
  void should_contains_security_rules_if_available() {
    // no security rule available
    assertThat(getSecurityRuleKeys(SECURITY_RULES_CLASS_NAME, SECURITY_RULE_KEYS_METHOD_NAME, "js"))
      .isEmpty();

    assertThat(getSecurityRuleKeys(SECURITY_RULES_CLASS_NAME, SECURITY_RULE_KEYS_METHOD_NAME, "ts"))
      .isEmpty();

    JsRules.JS_RULES.add(RuleKey.parse("jssecurity:S3649"));
    // one security rule available
    assertThat(getSecurityRuleKeys(SECURITY_RULES_CLASS_NAME, SECURITY_RULE_KEYS_METHOD_NAME, "js"))
      .containsOnly(RuleKey.of("jssecurity", "S3649"));

    JsRules.TS_RULES.add(RuleKey.parse("tssecurity:S3649"));
    assertThat(getSecurityRuleKeys(SECURITY_RULES_CLASS_NAME, SECURITY_RULE_KEYS_METHOD_NAME, "ts"))
      .containsOnly(RuleKey.of("tssecurity", "S3649"));

    // invalid class name
    assertThat(getSecurityRuleKeys("xxx", SECURITY_RULE_KEYS_METHOD_NAME, "js")).isEmpty();

    // invalid method name
    assertThat(getSecurityRuleKeys(SECURITY_RULES_CLASS_NAME, "xxx", "js")).isEmpty();

    JsRules.clear();
  }
}
