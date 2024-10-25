/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonarsource.analyzer.commons.BuiltInQualityProfileJsonLoader;

public class JavaScriptProfilesDefinition implements BuiltInQualityProfilesDefinition {

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptProfilesDefinition.class);

  static final String SONAR_WAY = "Sonar way";

  public static final String RESOURCE_PATH = "org/sonar/l10n/javascript/rules/javascript";
  public static final String SONAR_WAY_JSON = RESOURCE_PATH + "/Sonar_way_profile.json";

  private static final Map<String, String> PROFILES = new HashMap<>();
  static final String SONAR_SECURITY_RULES_CLASS_NAME = "com.sonar.plugins.security.api.JsRules";
  static final String SONAR_JASMIN_RULES_CLASS_NAME = "com.sonar.plugins.jasmin.api.JsRules";
  public static final String SECURITY_RULE_KEYS_METHOD_NAME = "getSecurityRuleKeys";

  static {
    PROFILES.put(SONAR_WAY, SONAR_WAY_JSON);
  }

  private static final Map<String, String> REPO_BY_LANGUAGE = new HashMap<>();

  static {
    REPO_BY_LANGUAGE.put(JavaScriptLanguage.KEY, CheckList.JS_REPOSITORY_KEY);
    REPO_BY_LANGUAGE.put(TypeScriptLanguage.KEY, CheckList.TS_REPOSITORY_KEY);
  }

  @Override
  public void define(Context context) {
    Set<String> javaScriptRuleKeys = ruleKeys(CheckList.getJavaScriptChecks());
    createProfile(SONAR_WAY, JavaScriptLanguage.KEY, javaScriptRuleKeys, context);

    Set<String> typeScriptRuleKeys = ruleKeys(CheckList.getTypeScriptChecks());
    createProfile(SONAR_WAY, TypeScriptLanguage.KEY, typeScriptRuleKeys, context);
  }

  private static void createProfile(
    String profileName,
    String language,
    Set<String> keys,
    Context context
  ) {
    NewBuiltInQualityProfile newProfile = context.createBuiltInQualityProfile(
      profileName,
      language
    );
    String jsonProfilePath = PROFILES.get(profileName);
    String repositoryKey = REPO_BY_LANGUAGE.get(language);
    Set<String> activeKeysForBothLanguages =
      BuiltInQualityProfileJsonLoader.loadActiveKeysFromJsonProfile(jsonProfilePath);

    keys
      .stream()
      .filter(activeKeysForBothLanguages::contains)
      .forEach(key -> newProfile.activateRule(repositoryKey, key));

    addSecurityRules(newProfile, language);

    newProfile.done();
  }

  /**
   * Security rules are added by reflectively invoking specific classes from the SonarSecurity and Jasmin plugins, which provides
   * rule keys to add to the built-in profiles.
   * It is expected for the reflective calls to fail in case any plugin is not available, e.g., in SQ community edition.
   */
  private static void addSecurityRules(NewBuiltInQualityProfile newProfile, String language) {
    Set<RuleKey> sonarSecurityRuleKeys = getSecurityRuleKeys(
      SONAR_SECURITY_RULES_CLASS_NAME,
      SECURITY_RULE_KEYS_METHOD_NAME,
      language
    );
    LOG.debug("Adding security ruleKeys {}", sonarSecurityRuleKeys);
    sonarSecurityRuleKeys.forEach(r -> newProfile.activateRule(r.repository(), r.rule()));

    Set<RuleKey> sonarJasminRuleKeys = getSecurityRuleKeys(
      SONAR_JASMIN_RULES_CLASS_NAME,
      SECURITY_RULE_KEYS_METHOD_NAME,
      language
    );
    LOG.debug("Adding security ruleKeys {}", sonarJasminRuleKeys);
    sonarJasminRuleKeys.forEach(r -> newProfile.activateRule(r.repository(), r.rule()));
  }

  // Visible for testing
  static Set<RuleKey> getSecurityRuleKeys(
    String className,
    String ruleKeysMethodName,
    String language
  ) {
    try {
      Class<?> rulesClass = Class.forName(className);
      Method getRuleKeysMethod = rulesClass.getMethod(ruleKeysMethodName, String.class);
      return (Set<RuleKey>) getRuleKeysMethod.invoke(null, language);
    } catch (ClassNotFoundException e) {
      LOG.debug("{} is not found, {}", className,  securityRuleMessage(e));
    } catch (NoSuchMethodException e) {
      LOG.debug("Method not found on {}, {}", className, securityRuleMessage(e));
    } catch (IllegalAccessException | InvocationTargetException e) {
      LOG.debug("{}: {}", e.getClass().getSimpleName(), securityRuleMessage(e));
    }

    return Collections.emptySet();
  }

  private static Set<String> ruleKeys(List<Class<? extends JavaScriptCheck>> checks) {
    return checks.stream().map(c -> c.getAnnotation(Rule.class).key()).collect(Collectors.toSet());
  }

  private static String securityRuleMessage(Exception e) {
    return "no security rules added to builtin profile: " + e.getMessage();
  }
}
